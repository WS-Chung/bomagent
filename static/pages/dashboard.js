// =============================================================================
// pages/dashboard.js — DashboardPage (대시보드, task 5.4)
// -----------------------------------------------------------------------------
// Source: design.md §9.2, §9.4, §9.5 DashboardPage
// Validates: Requirements 13.5, 14.6, 15.5, 15.6, 16.1, 16.2, 16.3, 16.4,
//            16.5, 18.5, 18.7, 18.10
//
// Mounted at route ``#/dashboard`` by app.js. Talks to the read-only
// Forecast_Engine via ``GET /api/dashboard/forecast`` (task 5.3) and the
// supplier list via ``GET /api/suppliers`` (task 2.2). All sorting is
// done server-side: the Forecast_Engine already returns rows in the
// design §6.5 / Req 16.2–16.3 order (RED → YELLOW → GREEN, then fcst_6m
// asc, then part_id asc as a stable tertiary key). The client renders
// rows in the order returned — never re-sorts — so the deterministic
// contract surfaced by Correctness Property 8 reaches the UI verbatim.
//
// Responsibilities
//   1. Toolbar — risk chip group [전체|위험|주의|정상] + supplier <select>.
//   2. fetchSuppliers() — populates the supplier dropdown once on mount.
//   3. fetchForecast() — re-runs every time a filter toggles, plus on the
//      ``parts:changed`` / ``bom:changed`` / ``production_plan:changed``
//      events emitted by other pages / modals (Req 13.6, 14.6 monitoring
//      hooks; design §9.6 event bus).
//   4. Table render — exactly 11 columns per Req 16.1 + design §9.5
//      ASCII (자체PN / MfrPN / CAD / 재고 / L/T / MOQ / 2M / 6M / 위험도 /
//      추천량 / 공급사). Per-row styling:
//        • Risk cell  — colored chip via tokens.css --color-risk-* (Req 14.6)
//        • 2M / 6M    — .num-negative when value < 0 (visual shortage cue,
//                       Req 13.5 — 잔여재고가 음수임을 즉시 강조)
//        • 추천량 == 0 — .qty-zero (회색 톤, Req 15.6 시각적 구분)
//        • 공급사 null — "미지정" 라벨 (Req 16.4)
//
// Architecture notes
//   * Local state is held in a closure inside render(). Each route
//     mount creates a fresh state so navigation doesn't leak listeners.
//   * Window event listeners are attached on render and never removed
//     (the page lives for the lifetime of the SPA, and re-renders just
//     attach additional listeners → still cheap: each listener does an
//     idempotent ``state.requestKey`` check before fetching, so multiple
//     listeners produce one fetch). This matches the pattern in
//     pages/inventory.js / pages/production_plan.js.
//   * Filters are applied *server-side* via query string so the response
//     order matches Req 16.1 even when filtered (the server keeps the
//     deterministic sort after filtering, see app/api/dashboard.py).
// =============================================================================

import { openPurchaseOrderModal } from "/static/components/purchase_order_modal.js";
import { openSubstituteEmailModal } from "/static/components/substitute_email_modal.js";

const FORECAST_URL = "/api/dashboard/forecast";
const SUPPLIERS_URL = "/api/suppliers";

// Risk → ({label, cssClass}) — four values per Req 14.3–14.5 + 대체(2026-07).
// Keys mirror the Forecast_Engine RISK_ORDER constants (app/forecast.py).
// SUBSTITUTE(대체) is rendered as a button rather than a chip (see
// buildRow), but keeps a label here so the client-side sort / any future
// chip fallback has a consistent Korean caption.
const RISK_META = Object.freeze({
  SUBSTITUTE: { label: "대체", chipClass: "risk-substitute" },
  RED: { label: "위험", chipClass: "risk-red" },
  YELLOW: { label: "주의", chipClass: "risk-amber" },
  GREEN: { label: "정상", chipClass: "risk-green" },
});

// Filter chip definitions — design §9.5 [전체|위험|주의|정상].
// ``value: null`` means "no risk filter" (전체).
const RISK_FILTER_CHIPS = Object.freeze([
  { value: null, label: "전체" },
  { value: "RED", label: "위험" },
  { value: "YELLOW", label: "주의" },
  { value: "GREEN", label: "정상" },
]);

// ── Page-local state ──────────────────────────────────────────────────────
function makeInitialState() {
  return {
    rows: [],
    nowDate: "",
    month2mLabels: [],
    months6mLabels: [],
    suppliers: [], // [{ id, name }]
    riskFilter: null, // null | "RED" | "YELLOW" | "GREEN"
    supplierFilter: null, // null | <id:number>
    loading: false,
    error: null,
    // ── Client-side sort overlay (2025-02 UX) ────────────────────────
    // ``sortKey`` null means "fall back to the server's deterministic
    // order (RISK_ORDER, fcst_6m ASC, part_id ASC)".  The 3-state cycle
    // is null → asc → desc → null so users always have a keystroke back
    // to the canonical order.  Correctness Property 8 (Forecast
    // Determinism) is unaffected — the server still emits rows in the
    // canonical order; sort here is a pure UI overlay.
    sortKey: null,
    sortDir: null, // "asc" | "desc" | null
  };
}

// ── Client-side sort helpers (2025-02 UX) ─────────────────────────────
// Ordering weights so ascending risk sort reads as SUBSTITUTE → RED →
// YELLOW → GREEN (severity-descending semantically).  Mirrors the
// Forecast_Engine RISK_ORDER constants (app/forecast.py) — kept in sync
// manually because the SPA has no live import path.  SUBSTITUTE(대체) is
// -1 so it sorts above RED, matching the server's canonical order.
const RISK_ORDER = Object.freeze({
  SUBSTITUTE: -1,
  RED: 0,
  YELLOW: 1,
  GREEN: 2,
});

function getRowSortValue(row, key) {
  switch (key) {
    case "self_part_number":
      return row.self_part_number ?? "";
    case "mfr_part_number":
      return row.mfr_part_number ?? "";
    case "cad_partname":
      return row.cad_partname ?? "";
    case "inventory":
      return row.inventory ?? -Infinity;
    case "lt_weeks":
      return row.lt_weeks ?? -Infinity;
    case "moq":
      return row.moq ?? -Infinity;
    case "fcst_2m":
      return row.fcst_2m ?? -Infinity;
    case "fcst_6m":
      return row.fcst_6m ?? -Infinity;
    case "risk":
      // Unknown risk → 999 (sinks to the bottom of asc order).
      return Object.prototype.hasOwnProperty.call(RISK_ORDER, row.risk)
        ? RISK_ORDER[row.risk]
        : 999;
    case "recommended_order_qty":
      return row.recommended_order_qty ?? -Infinity;
    case "supplier_name":
      return (row.supplier && row.supplier.name) || "";
    default:
      return "";
  }
}

function compareRows(a, b, key, dir) {
  const va = getRowSortValue(a, key);
  const vb = getRowSortValue(b, key);
  const isNum = typeof va === "number" && typeof vb === "number";
  const cmp = isNum
    ? va - vb
    : String(va).localeCompare(String(vb), "ko-KR");
  return dir === "asc" ? cmp : -cmp;
}

// Header definitions — pairs each label with (a) its sort key and (b)
// the optional cell-alignment class the existing thead used.  Building
// the row from an array keeps the sort click wiring in one place.
const DASHBOARD_COLUMNS = [
  { key: "self_part_number", label: "자체PN" },
  { key: "mfr_part_number", label: "MfrPN" },
  { key: "cad_partname", label: "CAD" },
  { key: "inventory", label: "재고", extraClass: "cell--num" },
  { key: "lt_weeks", label: "L/T", extraClass: "cell--num" },
  { key: "moq", label: "MOQ", extraClass: "cell--num" },
  { key: "fcst_2m", label: "2M", extraClass: "cell--num" },
  { key: "fcst_6m", label: "6M", extraClass: "cell--num" },
  { key: "risk", label: "위험도" },
  {
    key: "recommended_order_qty",
    label: "추천량",
    extraClass: "cell--num",
  },
  { key: "supplier_name", label: "공급사" },
];

// ── Helpers ───────────────────────────────────────────────────────────────

/**
 * Minimal fetch wrapper. Throws an Error carrying the API envelope
 * fields on non-2xx responses so the caller can distinguish 4xx UX
 * errors from network failures.
 *
 * Cache policy
 * ------------
 * The dashboard's source of truth is recomputed on every server hit
 * (Forecast_Engine is purely functional over the live DB), so any
 * cached body could surface stale shortage numbers after the user
 * edits the production plan and navigates back to the dashboard.
 * We pass ``cache: "no-store"`` so the browser HTTP cache never
 * returns a stored body — this complements the server's
 * ``Cache-Control: no-store`` header (app/api/dashboard.py) and
 * shields us from intermediaries that strip response headers.
 */
async function apiFetch(url, init) {
  const merged = { cache: "no-store", ...(init || {}) };
  const resp = await fetch(url, merged);
  let body = null;
  try {
    body = await resp.json();
  } catch {
    body = null;
  }
  if (!resp.ok) {
    const err = new Error(
      (body && body.message) || `요청 실패 (HTTP ${resp.status})`,
    );
    err.status = resp.status;
    err.code = body && body.code;
    err.details = body && body.details;
    throw err;
  }
  return body;
}

/** Format an integer/null cell for table display (ko-KR thousands). */
function fmtNum(v) {
  if (v === null || v === undefined || v === "") return "";
  if (typeof v === "number") return v.toLocaleString("ko-KR");
  return String(v);
}

function fmtText(v) {
  if (v === null || v === undefined) return "";
  return String(v);
}

// =============================================================================
// render(container) — entry point called by app.js router
// =============================================================================
export function render(container) {
  const state = makeInitialState();

  container.innerHTML = "";
  const root = document.createElement("section");
  root.className = "dashboard-page";
  container.appendChild(root);

  // ── Toolbar (risk chips + supplier select + now-date hint) ─────────────
  const toolbar = document.createElement("div");
  toolbar.className = "dashboard-toolbar";
  root.appendChild(toolbar);

  // Risk chip group ───────────────────────────────────────────────────────
  const riskGroup = document.createElement("div");
  riskGroup.className = "dashboard-risk-filter";
  riskGroup.setAttribute("role", "group");
  riskGroup.setAttribute("aria-label", "위험도 필터");

  const riskLabel = document.createElement("span");
  riskLabel.className = "dashboard-toolbar__label";
  riskLabel.textContent = "위험도";
  riskGroup.appendChild(riskLabel);

  const chipButtons = [];
  for (const chip of RISK_FILTER_CHIPS) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "dashboard-risk-chip-btn";
    btn.dataset.risk = chip.value === null ? "" : chip.value;
    btn.textContent = chip.label;
    btn.addEventListener("click", () => {
      if (state.riskFilter === chip.value) return; // no-op
      state.riskFilter = chip.value;
      updateRiskChipActive();
      fetchForecast();
    });
    riskGroup.appendChild(btn);
    chipButtons.push({ btn, value: chip.value });
  }
  toolbar.appendChild(riskGroup);

  function updateRiskChipActive() {
    for (const { btn, value } of chipButtons) {
      if (value === state.riskFilter) {
        btn.classList.add("is-active");
        btn.setAttribute("aria-pressed", "true");
      } else {
        btn.classList.remove("is-active");
        btn.setAttribute("aria-pressed", "false");
      }
    }
  }
  updateRiskChipActive(); // initial: "전체" active

  // Supplier select ───────────────────────────────────────────────────────
  const supplierWrap = document.createElement("div");
  supplierWrap.className = "dashboard-supplier-filter";

  const supplierLabel = document.createElement("label");
  supplierLabel.className = "dashboard-toolbar__label";
  supplierLabel.textContent = "공급사";
  supplierLabel.htmlFor = "dashboard-supplier-select";
  supplierWrap.appendChild(supplierLabel);

  const supplierSelect = document.createElement("select");
  supplierSelect.id = "dashboard-supplier-select";
  supplierSelect.className = "dashboard-supplier-select";
  supplierSelect.setAttribute("aria-label", "공급사 필터");
  // The "전체" option uses empty string as DOM value; we map "" → null state.
  const allOpt = document.createElement("option");
  allOpt.value = "";
  allOpt.textContent = "전체";
  supplierSelect.appendChild(allOpt);
  supplierSelect.addEventListener("change", () => {
    const raw = supplierSelect.value;
    state.supplierFilter = raw === "" ? null : Number(raw);
    renderPoButtonVisibility();
    fetchForecast();
  });
  supplierWrap.appendChild(supplierSelect);
  toolbar.appendChild(supplierWrap);

  // Now-date hint — small, right-aligned, purely informational.
  const nowDateHint = document.createElement("span");
  nowDateHint.className = "dashboard-now-date";
  toolbar.appendChild(nowDateHint);

  // ── Status row (loading / error / empty) ───────────────────────────────
  const statusBar = document.createElement("div");
  statusBar.className = "dashboard-status";
  root.appendChild(statusBar);

  // ── PO button bar (visible only when a supplier is selected) ──────────
  // Sits above the table, right-aligned per the 2025-02 UX spec.  We
  // toggle its ``hidden`` attribute (rather than rebuilding the DOM)
  // so the button state is cheap to flip on every filter change.
  const poBtnBar = document.createElement("div");
  poBtnBar.className = "dashboard-po-btn-bar";
  poBtnBar.hidden = true;

  const poBtn = document.createElement("button");
  poBtn.type = "button";
  poBtn.className = "btn btn--primary dashboard-po-btn";
  poBtn.textContent = "발주서 자동작성";
  poBtn.addEventListener("click", () => {
    // Look up the currently selected supplier from state.suppliers so
    // the modal receives the full detail record (formal_name, contact
    // info, business registration number) rather than just {id, name}.
    if (state.supplierFilter === null) return;
    const supplier =
      state.suppliers.find((s) => s.id === state.supplierFilter) || null;
    if (supplier === null) {
      // Race: user clicked before suppliers finished loading.  Skip
      // silently — the button would be hidden if the filter were reset.
      return;
    }
    // Server already narrowed ``state.rows`` to this supplier via the
    // supplier_id query string.  Additionally restrict to RED / YELLOW
    // rows only — user requirement 2025-02: 발주서 자동작성 covers only
    // 위험 / 주의 품목.  GREEN rows have adequate 6M inventory and do
    // not need an outstanding order.
    const poRows = state.rows.filter(
      (r) => r.risk === "RED" || r.risk === "YELLOW",
    );
    openPurchaseOrderModal({ supplier, rows: poRows });
  });
  poBtnBar.appendChild(poBtn);
  root.appendChild(poBtnBar);

  // ── Table ──────────────────────────────────────────────────────────────
  const tableWrap = document.createElement("div");
  tableWrap.className = "dashboard-table-wrap";
  root.appendChild(tableWrap);

  const table = document.createElement("table");
  table.className = "dashboard-table";
  tableWrap.appendChild(table);

  const thead = document.createElement("thead");
  // Column order matches design §9.5 + Req 16.1 exactly.  Right-aligned
  // numeric headers keep the .cell--num class (right-align +
  // tabular-nums shared across <th>/<td>).
  //
  // 2025-02 UX — every header is a click-to-sort control (3-state
  // cycle: null → asc → desc → null).  The 위험도 column uses
  // RISK_ORDER for numeric semantic ordering (RED < YELLOW < GREEN)
  // rather than lexicographic on the label so sorting reads as
  // severity-first.  Correctness Property 8 (Forecast Determinism)
  // remains intact — the server still emits rows in canonical order
  // and this sort is a pure UI overlay.
  const headerRow = document.createElement("tr");
  thead.appendChild(headerRow);
  const headerCells = new Map(); // key → <th>
  for (const col of DASHBOARD_COLUMNS) {
    const th = document.createElement("th");
    th.classList.add("is-sortable");
    if (col.extraClass) th.classList.add(col.extraClass);
    th.dataset.sortKey = col.key;
    const label = document.createElement("span");
    label.className = "sort-label";
    label.textContent = col.label;
    const icon = document.createElement("span");
    icon.className = "sort-icon";
    icon.setAttribute("aria-hidden", "true");
    th.append(label, icon);
    th.addEventListener("click", () => onHeaderClick(col.key));
    headerRow.appendChild(th);
    headerCells.set(col.key, th);
  }
  table.appendChild(thead);

  function updateSortHeaders() {
    for (const [key, th] of headerCells) {
      th.classList.remove("is-sorted-asc", "is-sorted-desc");
      if (state.sortKey === key && state.sortDir === "asc") {
        th.classList.add("is-sorted-asc");
      } else if (state.sortKey === key && state.sortDir === "desc") {
        th.classList.add("is-sorted-desc");
      }
    }
  }

  function onHeaderClick(key) {
    if (state.sortKey === key) {
      if (state.sortDir === "asc") {
        state.sortDir = "desc";
      } else if (state.sortDir === "desc") {
        state.sortKey = null;
        state.sortDir = null;
      } else {
        state.sortDir = "asc";
      }
    } else {
      state.sortKey = key;
      state.sortDir = "asc";
    }
    updateSortHeaders();
    renderRows();
  }

  const tbody = document.createElement("tbody");
  table.appendChild(tbody);

  // ── Render functions ───────────────────────────────────────────────────
  function renderPoButtonVisibility() {
    // Show the button only when a specific supplier is picked (not
    // "전체").  When rows are empty for the chosen supplier the button
    // still shows — the modal will just render empty prefill slots
    // which the operator can fill in manually.
    poBtnBar.hidden = state.supplierFilter === null;
  }

  function renderStatus() {
    if (state.loading) {
      statusBar.textContent = "불러오는 중…";
      statusBar.dataset.kind = "loading";
      return;
    }
    if (state.error) {
      statusBar.textContent = `오류: ${state.error}`;
      statusBar.dataset.kind = "error";
      return;
    }
    if (state.rows.length === 0) {
      statusBar.textContent =
        state.riskFilter || state.supplierFilter
          ? "필터 조건에 맞는 부품이 없습니다"
          : "표시할 부품이 없습니다";
      statusBar.dataset.kind = "empty";
      return;
    }
    statusBar.textContent = `총 ${state.rows.length.toLocaleString("ko-KR")} 건`;
    statusBar.dataset.kind = "info";
  }

  function renderNowDate() {
    nowDateHint.textContent = state.nowDate
      ? `기준일 ${state.nowDate}`
      : "";
  }

  function renderRows() {
    tbody.innerHTML = "";
    // Apply the client-side sort overlay.  With ``sortKey`` null we
    // fall through to the server's canonical order (RISK_ORDER,
    // fcst_6m ASC, part_id ASC) — Correctness Property 8 is unchanged.
    const rows =
      state.sortKey && state.sortDir
        ? state.rows
            .slice()
            .sort((a, b) => compareRows(a, b, state.sortKey, state.sortDir))
        : state.rows;
    for (const row of rows) {
      tbody.appendChild(buildRow(row));
    }
  }

  function buildRow(row) {
    const tr = document.createElement("tr");
    tr.className = "dashboard-row";
    tr.dataset.partId = String(row.part_id);

    function td(text, className) {
      const c = document.createElement("td");
      if (className) c.className = className;
      c.textContent = text;
      return c;
    }

    // 1) 자체PN
    tr.appendChild(td(fmtText(row.self_part_number), "cell--code"));
    // 2) MfrPN
    tr.appendChild(td(fmtText(row.mfr_part_number), "cell--code"));
    // 3) CAD
    tr.appendChild(td(fmtText(row.cad_partname)));
    // 4) 재고
    tr.appendChild(td(fmtNum(row.inventory), "cell--num"));
    // 5) L/T
    tr.appendChild(td(fmtNum(row.lt_weeks), "cell--num"));
    // 6) MOQ
    tr.appendChild(td(fmtNum(row.moq), "cell--num"));
    // 7) 2M — negative values get the .num-negative red-text style.
    //    Req 13.5: 2M / 6M visualises the shortage; a negative number means
    //    inventory already cannot cover the window. Highlighting it in
    //    --color-risk-red lets the user spot shortages without parsing the
    //    minus sign (which is small and easy to miss in dense rows).
    const cell2m = document.createElement("td");
    cell2m.className = "cell--num";
    if (typeof row.fcst_2m === "number" && row.fcst_2m < 0) {
      cell2m.classList.add("num-negative");
    }
    cell2m.textContent = fmtNum(row.fcst_2m);
    tr.appendChild(cell2m);
    // 8) 6M — same negative styling rule as 2M.
    const cell6m = document.createElement("td");
    cell6m.className = "cell--num";
    if (typeof row.fcst_6m === "number" && row.fcst_6m < 0) {
      cell6m.classList.add("num-negative");
    }
    cell6m.textContent = fmtNum(row.fcst_6m);
    tr.appendChild(cell6m);
    // 9) 위험도 — SUBSTITUTE(대체)는 버튼, 나머지는 color chip.
    //    Req 14.6 + design §9.4 Risk chip row + 대체(2026-07).
    const riskCell = document.createElement("td");
    riskCell.className = "cell--risk";
    if (row.risk === "SUBSTITUTE") {
      riskCell.appendChild(buildSubstituteButton(row));
    } else {
      riskCell.appendChild(buildRiskChip(row.risk));
    }
    tr.appendChild(riskCell);
    // 10) 추천량 — zero highlighted in muted gray (Req 15.6 시각적 구분).
    const qtyCell = document.createElement("td");
    qtyCell.className = "cell--num";
    if (
      typeof row.recommended_order_qty === "number" &&
      row.recommended_order_qty === 0
    ) {
      qtyCell.classList.add("qty-zero");
    }
    qtyCell.textContent = fmtNum(row.recommended_order_qty);
    tr.appendChild(qtyCell);
    // 11) 공급사 — null 인 경우 "미지정" 라벨 (Req 16.4).
    const supCell = document.createElement("td");
    if (row.supplier && row.supplier.name) {
      supCell.textContent = row.supplier.name;
    } else {
      supCell.textContent = "미지정";
      supCell.classList.add("supplier-unassigned");
    }
    tr.appendChild(supCell);

    return tr;
  }

  function buildRiskChip(risk) {
    const meta = RISK_META[risk] || RISK_META.GREEN;
    const span = document.createElement("span");
    // ``risk-chip`` is the base; the ``risk-red`` / ``risk-amber`` /
    // ``risk-green`` modifier supplies the background + text color, both
    // sourced from tokens.css --color-risk-* (Req 18.1).
    span.className = `risk-chip ${meta.chipClass}`;
    span.textContent = meta.label;
    return span;
  }

  // 대체(SUBSTITUTE, 2026-07) — 다른 위험도와 달리 클릭 가능한 버튼으로
  // 렌더링한다.  짙은 회색 바탕 + 흰색 글씨(.risk-substitute-btn, tokens.css
  // --color-risk-substitute*).  클릭 시 해당 부품의 "대체품 확인 요청" 메일
  // 초안 모달을 띄운다.  현재 로드된 공급사 목록(state.suppliers)을 함께
  // 넘겨 받는사람 드롭다운을 채운다.
  function buildSubstituteButton(row) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "risk-substitute-btn";
    btn.textContent = "대체";
    btn.setAttribute(
      "aria-label",
      `${row.mfr_part_number || row.self_part_number || "부품"} 대체품 확인 요청`,
    );
    btn.addEventListener("click", () => {
      openSubstituteEmailModal({ part: row, suppliers: state.suppliers });
    });
    return btn;
  }

  function renderSupplierOptions() {
    // Preserve the current selection (in case the user toggled filters
    // before the supplier list resolved). We rebuild the options because
    // a fresh fetch may add / remove entries.
    const selected =
      state.supplierFilter === null ? "" : String(state.supplierFilter);
    supplierSelect.innerHTML = "";
    const all = document.createElement("option");
    all.value = "";
    all.textContent = "전체";
    supplierSelect.appendChild(all);
    for (const sup of state.suppliers) {
      const opt = document.createElement("option");
      opt.value = String(sup.id);
      opt.textContent = sup.name;
      supplierSelect.appendChild(opt);
    }
    supplierSelect.value = selected;
  }

  // ── Data fetch ──────────────────────────────────────────────────────────
  async function fetchSuppliers() {
    try {
      const body = await apiFetch(SUPPLIERS_URL);
      state.suppliers = Array.isArray(body) ? body : [];
      renderSupplierOptions();
    } catch {
      // Suppliers fetch failure is non-fatal — the dropdown stays at
      // "전체" only. We surface the forecast error path instead.
      state.suppliers = [];
      renderSupplierOptions();
    }
  }

  async function fetchForecast() {
    state.loading = true;
    state.error = null;
    renderStatus();
    try {
      const params = new URLSearchParams();
      if (state.riskFilter !== null) {
        params.set("risk", state.riskFilter);
      }
      if (state.supplierFilter !== null) {
        params.set("supplier_id", String(state.supplierFilter));
      }
      const qs = params.toString();
      const url = qs.length > 0 ? `${FORECAST_URL}?${qs}` : FORECAST_URL;
      const body = await apiFetch(url);
      state.rows = Array.isArray(body.rows) ? body.rows : [];
      state.nowDate = typeof body.now_date === "string" ? body.now_date : "";
      state.month2mLabels = Array.isArray(body.month_2m) ? body.month_2m : [];
      state.months6mLabels = Array.isArray(body.months_6m)
        ? body.months_6m
        : [];
      state.loading = false;
      renderStatus();
      renderNowDate();
      renderRows();
    } catch (err) {
      state.loading = false;
      state.error =
        err && err.message ? err.message : "대시보드를 불러오지 못했습니다";
      state.rows = [];
      renderStatus();
      renderRows();
    }
  }

  // ── External event listeners (design §9.6, Req 13.6 / 14.6) ───────────
  // Any of ``parts:changed`` / ``bom:changed`` / ``production_plan:changed``
  // means an upstream table the Forecast_Engine reads from has been
  // mutated, so we invalidate the current snapshot and refetch. Server
  // emits ``Cache-Control: no-store`` on every response (see
  // app/api/dashboard.py) so the refetch is always fresh.
  function onUpstreamChanged() {
    fetchForecast();
  }
  window.addEventListener("parts:changed", onUpstreamChanged);
  window.addEventListener("bom:changed", onUpstreamChanged);
  window.addEventListener("production_plan:changed", onUpstreamChanged);

  // ── First load — suppliers + forecast in parallel ──────────────────────
  // The forecast is what the user is here for, so we kick both off
  // simultaneously to stay inside the route-entry 1-second response
  // budget (Req 19.1: "Dashboard_Page 가 재계산을 요청하면 1초 이내에
  // 응답"). The suppliers fetch only repaints the dropdown when it
  // resolves; it doesn't block the table render.
  renderPoButtonVisibility();
  fetchSuppliers();
  fetchForecast();
}

