// =============================================================================
// pages/audit_log.js — AuditLogPage (task 6.2)
// -----------------------------------------------------------------------------
// Source: design.md §9.2, §9.5 AuditLogPage, §5.3 GET /api/audit-log
// Validates: Requirements 3.6, 17.5, 17.6
//
// Mounted at route `#/audit-log` by app.js (the route is intentionally
// NOT linked from the sidebar — Req 3.6 — it is a secondary admin view
// reached via direct hash).
//
// Responsibilities
//   1. Toolbar — filter inputs:
//        • target_table : multi-select (checkbox group over the 10
//          mutable tables that emit audit rows; Req 17.5).
//        • target_row_id: text input, exact match (Req 17.5).
//        • from / to    : <input type="datetime-local"> pair, converted
//                         to ISO 8601 UTC ("...Z") for the API. The
//                         server treats both bounds as inclusive
//                         (design §5.3 / app/api/audit_log.py).
//        • [필터 적용] : applies the toolbar values + resets offset.
//        • [초기화]    : clears all filters and re-fetches.
//   2. fetchAuditLog() — calls GET /api/audit-log with the active
//      filters and pagination (100/page; Req 17.5).
//   3. Result table — 8 columns: 변경시각 / 대상 테이블 / 대상 행 ID /
//      액션 / 컬럼명 / Before / After / 사용자.
//   4. Before / After JSON cells:
//        • Short values (≤80 chars)  — rendered inline as <code>.
//        • Long values (>80 chars)   — rendered as a truncated <code>
//          summary; click toggles between summary and a <pre> with the
//          full payload (manual line-wrap, no horizontal scroll).
//   5. Pagination — [이전] / [다음] in 100-row pages; the server
//      already returns `total` independent of `limit`/`offset` so the
//      pager renders an accurate "page X / Y" label.
//   6. Empty result — "조회된 변경 이력이 없습니다" (Req 17.6).
//   7. Sort — server returns `changed_at DESC, id DESC`; the client
//      renders rows in the response order verbatim (Req 17.5 sort).
//
// Architecture notes
//   * Local state is held in a closure inside render(). Each route
//     mount creates a fresh state so navigation does not leak listeners.
//   * The page does NOT mutate audit_log — only reads via GET.
//     ``/api/audit-log`` is the only endpoint touched (Req 17.7).
// =============================================================================

const AUDIT_LOG_URL = "/api/audit-log";
const PAGE_SIZE = 100;
const JSON_SUMMARY_LIMIT = 80;

// Mutable tables that emit audit_log rows (design §4.2). The set is
// deliberately fixed in the UI — the server accepts arbitrary strings
// but only these ten are produced by the application. Listing them as
// checkboxes is friendlier than a free-text input.
const TARGET_TABLES = Object.freeze([
  { value: "parts", label: "parts" },
  { value: "bom_items", label: "bom_items" },
  { value: "production_plan", label: "production_plan" },
  { value: "plan_months", label: "plan_months" },
  { value: "products", label: "products" },
  { value: "receiving_log", label: "receiving_log" },
  { value: "part_classes", label: "part_classes" },
  { value: "manufacturers", label: "manufacturers" },
  { value: "suppliers", label: "suppliers" },
  { value: "boms", label: "boms" },
]);

// ── Page-local state ──────────────────────────────────────────────────────
function makeInitialState() {
  return {
    items: [],
    total: 0,
    limit: PAGE_SIZE,
    offset: 0,
    filters: {
      target_tables: [], // string[]
      target_row_id: "", // string (exact match; empty == no filter)
      from: "", // ISO 8601 UTC ("...Z") or ""
      to: "", // ISO 8601 UTC ("...Z") or ""
    },
    loading: false,
    error: null,
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────
async function apiFetch(url, init) {
  const resp = await fetch(url, init);
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

/**
 * Convert a <input type="datetime-local"> value (e.g. "2026-06-01T09:00")
 * to an ISO 8601 UTC string ("2026-06-01T00:00:00.000Z") suitable for the
 * `from` / `to` query parameters.
 *
 * The input control returns wall-clock time in the browser's local TZ —
 * the conversion via `new Date(localStr)` treats it as local time and
 * `toISOString()` then converts to UTC. Empty inputs return "".
 *
 * @param {string} localStr
 * @returns {string}
 */
function localDateTimeToIso(localStr) {
  if (!localStr) return "";
  const t = new Date(localStr);
  if (Number.isNaN(t.getTime())) return "";
  return t.toISOString();
}

// ── Toast (lightweight; matches inventory + receiving_history) ────────────
function showToast(message, kind = "info") {
  const host =
    document.getElementById("toast-host") || createToastHost();
  const toast = document.createElement("div");
  toast.className = `toast toast--${kind}`;
  toast.textContent = message;
  host.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add("is-open"));
  setTimeout(() => {
    toast.classList.remove("is-open");
    setTimeout(() => toast.remove(), 250);
  }, 3000);
}

function createToastHost() {
  const host = document.createElement("div");
  host.id = "toast-host";
  host.className = "toast-host";
  document.body.appendChild(host);
  return host;
}

// =============================================================================
// render(container) — entry point called by app.js router
// =============================================================================
export function render(container) {
  const state = makeInitialState();

  container.innerHTML = "";
  const root = document.createElement("section");
  root.className = "audit-log-page";
  container.appendChild(root);

  // ── Toolbar (filters) ────────────────────────────────────────────────
  const toolbar = document.createElement("form");
  toolbar.className = "audit-log-toolbar";
  toolbar.setAttribute("aria-label", "감사 로그 필터");
  // Prevent default form submission so the page does not reload.
  toolbar.addEventListener("submit", (event) => event.preventDefault());
  root.appendChild(toolbar);

  // target_table — checkbox group laid out as a chip row.
  const tablesGroup = document.createElement("fieldset");
  tablesGroup.className = "audit-log-toolbar__group audit-log-toolbar__tables";
  const tablesLegend = document.createElement("legend");
  tablesLegend.className = "audit-log-toolbar__legend";
  tablesLegend.textContent = "대상 테이블";
  tablesGroup.appendChild(tablesLegend);

  const tablesList = document.createElement("div");
  tablesList.className = "audit-log-toolbar__chips";
  const tableInputs = new Map(); // value → checkbox input
  for (const t of TARGET_TABLES) {
    const id = `audit-table-${t.value}`;
    const label = document.createElement("label");
    label.className = "audit-log-toolbar__chip";
    label.htmlFor = id;

    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.id = id;
    cb.value = t.value;
    cb.name = "target_table";
    cb.className = "audit-log-toolbar__chip-input";

    const span = document.createElement("span");
    span.className = "audit-log-toolbar__chip-label";
    span.textContent = t.label;

    label.append(cb, span);
    tablesList.appendChild(label);
    tableInputs.set(t.value, cb);
  }
  tablesGroup.appendChild(tablesList);
  toolbar.appendChild(tablesGroup);

  // target_row_id — text input.
  const rowIdGroup = document.createElement("div");
  rowIdGroup.className = "audit-log-toolbar__group";
  const rowIdLabel = document.createElement("label");
  rowIdLabel.className = "audit-log-toolbar__legend";
  rowIdLabel.htmlFor = "audit-row-id";
  rowIdLabel.textContent = "대상 행 ID";
  const rowIdInput = document.createElement("input");
  rowIdInput.type = "text";
  rowIdInput.id = "audit-row-id";
  rowIdInput.className = "audit-log-toolbar__input";
  rowIdInput.placeholder = "예: 12";
  rowIdInput.autocomplete = "off";
  rowIdGroup.append(rowIdLabel, rowIdInput);
  toolbar.appendChild(rowIdGroup);

  // from / to — datetime-local pair.
  const fromGroup = document.createElement("div");
  fromGroup.className = "audit-log-toolbar__group";
  const fromLabel = document.createElement("label");
  fromLabel.className = "audit-log-toolbar__legend";
  fromLabel.htmlFor = "audit-from";
  fromLabel.textContent = "시작 시각";
  const fromInput = document.createElement("input");
  fromInput.type = "datetime-local";
  fromInput.id = "audit-from";
  fromInput.className = "audit-log-toolbar__input";
  fromGroup.append(fromLabel, fromInput);
  toolbar.appendChild(fromGroup);

  const toGroup = document.createElement("div");
  toGroup.className = "audit-log-toolbar__group";
  const toLabel = document.createElement("label");
  toLabel.className = "audit-log-toolbar__legend";
  toLabel.htmlFor = "audit-to";
  toLabel.textContent = "종료 시각";
  const toInput = document.createElement("input");
  toInput.type = "datetime-local";
  toInput.id = "audit-to";
  toInput.className = "audit-log-toolbar__input";
  toGroup.append(toLabel, toInput);
  toolbar.appendChild(toGroup);

  // Actions — apply / reset.
  const actionsGroup = document.createElement("div");
  actionsGroup.className = "audit-log-toolbar__actions";

  const applyBtn = document.createElement("button");
  applyBtn.type = "submit";
  applyBtn.className = "btn btn--primary audit-log-toolbar__apply";
  applyBtn.textContent = "필터 적용";
  applyBtn.addEventListener("click", (event) => {
    event.preventDefault();
    applyFiltersFromInputs();
    state.offset = 0;
    fetchAuditLog();
  });

  const resetBtn = document.createElement("button");
  resetBtn.type = "button";
  resetBtn.className = "btn btn--secondary audit-log-toolbar__reset";
  resetBtn.textContent = "초기화";
  resetBtn.addEventListener("click", () => {
    // Clear UI controls + state.
    for (const cb of tableInputs.values()) cb.checked = false;
    rowIdInput.value = "";
    fromInput.value = "";
    toInput.value = "";
    state.filters = {
      target_tables: [],
      target_row_id: "",
      from: "",
      to: "",
    };
    state.offset = 0;
    fetchAuditLog();
  });

  actionsGroup.append(applyBtn, resetBtn);
  toolbar.appendChild(actionsGroup);

  // ── Status bar (loading / error / empty / total) ─────────────────────
  const statusBar = document.createElement("div");
  statusBar.className = "audit-log-status";
  root.appendChild(statusBar);

  // ── Table ────────────────────────────────────────────────────────────
  const tableWrap = document.createElement("div");
  tableWrap.className = "audit-log-table-wrap";
  root.appendChild(tableWrap);

  const table = document.createElement("table");
  table.className = "audit-log-table";
  tableWrap.appendChild(table);

  const thead = document.createElement("thead");
  thead.innerHTML = `
    <tr>
      <th class="col-time">변경 시각</th>
      <th class="col-table">대상 테이블</th>
      <th class="col-row">대상 행 ID</th>
      <th class="col-action">액션</th>
      <th class="col-column">컬럼명</th>
      <th class="col-before">Before</th>
      <th class="col-after">After</th>
      <th class="col-user">사용자</th>
    </tr>
  `;
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  table.appendChild(tbody);

  // ── Pagination ───────────────────────────────────────────────────────
  const pager = document.createElement("nav");
  pager.className = "audit-log-pager";
  pager.setAttribute("aria-label", "페이지 이동");
  root.appendChild(pager);

  // ── Pull form values into state.filters ──────────────────────────────
  function applyFiltersFromInputs() {
    const tables = [];
    for (const [value, cb] of tableInputs.entries()) {
      if (cb.checked) tables.push(value);
    }
    state.filters = {
      target_tables: tables,
      target_row_id: rowIdInput.value.trim(),
      from: localDateTimeToIso(fromInput.value),
      to: localDateTimeToIso(toInput.value),
    };
  }

  // ── Render functions ─────────────────────────────────────────────────
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
    if (state.total === 0) {
      // Req 17.6 — empty result wording.
      statusBar.textContent = "조회된 변경 이력이 없습니다";
      statusBar.dataset.kind = "empty";
      return;
    }
    statusBar.textContent = `총 ${state.total.toLocaleString("ko-KR")} 건`;
    statusBar.dataset.kind = "info";
  }

  function renderPager() {
    pager.innerHTML = "";
    if (state.total <= state.limit) {
      if (state.total > 0) {
        const label = document.createElement("span");
        label.className = "audit-log-pager__label";
        label.textContent = "1 / 1";
        pager.appendChild(label);
      }
      return;
    }
    const totalPages = Math.max(1, Math.ceil(state.total / state.limit));
    const currentPage = Math.floor(state.offset / state.limit) + 1;

    const prev = document.createElement("button");
    prev.type = "button";
    prev.className = "btn btn--secondary audit-log-pager__btn";
    prev.textContent = "이전";
    prev.disabled = currentPage <= 1 || state.loading;
    prev.addEventListener("click", () => {
      state.offset = Math.max(0, state.offset - state.limit);
      fetchAuditLog();
    });

    const next = document.createElement("button");
    next.type = "button";
    next.className = "btn btn--secondary audit-log-pager__btn";
    next.textContent = "다음";
    next.disabled = currentPage >= totalPages || state.loading;
    next.addEventListener("click", () => {
      state.offset = state.offset + state.limit;
      fetchAuditLog();
    });

    const label = document.createElement("span");
    label.className = "audit-log-pager__label";
    label.textContent = `${currentPage} / ${totalPages}`;

    pager.append(prev, label, next);
  }

  function renderRows() {
    tbody.innerHTML = "";
    for (const item of state.items) {
      tbody.appendChild(buildRow(item));
    }
  }

  function buildRow(item) {
    const tr = document.createElement("tr");
    tr.className = "audit-log-row";
    tr.dataset.auditId = String(item.id);

    function td(text, className) {
      const c = document.createElement("td");
      if (className) c.className = className;
      c.textContent = text == null ? "" : String(text);
      return c;
    }

    tr.append(
      td(item.changed_at, "col-time cell--code"),
      td(item.target_table, "col-table"),
      td(item.target_row_id, "col-row cell--code"),
      td(item.action, "col-action"),
      td(item.column_name, "col-column"),
    );
    tr.appendChild(buildJsonCell(item.before_value_json, "col-before"));
    tr.appendChild(buildJsonCell(item.after_value_json, "col-after"));
    tr.appendChild(td(item.user, "col-user"));

    return tr;
  }

  /**
   * Build a <td> for a Before / After JSON cell.
   *
   * Short payloads render inline as a single <code>; long payloads
   * (> JSON_SUMMARY_LIMIT chars) render a truncated <code> summary that
   * the user can click to toggle into a <pre> with the full content.
   *
   * @param {string|null|undefined} value  Raw JSON string from the API.
   * @param {string} className              Column class (col-before / col-after).
   * @returns {HTMLTableCellElement}
   */
  function buildJsonCell(value, className) {
    const cell = document.createElement("td");
    cell.className = `audit-json-cell ${className}`;
    if (value == null || value === "") {
      cell.textContent = "";
      return cell;
    }
    const raw = String(value);
    const isShort = raw.length <= JSON_SUMMARY_LIMIT;

    const summary = document.createElement("code");
    summary.className = "audit-json-summary";
    summary.textContent = isShort
      ? raw
      : `${raw.slice(0, JSON_SUMMARY_LIMIT)}…`;
    cell.appendChild(summary);

    if (isShort) return cell;

    // Expandable cell — click toggles between summary and full <pre>.
    cell.dataset.expanded = "false";
    cell.classList.add("audit-json-cell--expandable");
    cell.title = "클릭하여 펼치기";
    cell.setAttribute("role", "button");
    cell.setAttribute("tabindex", "0");
    cell.setAttribute("aria-expanded", "false");

    const full = document.createElement("pre");
    full.className = "audit-json-full";
    full.textContent = raw;
    full.hidden = true;
    cell.appendChild(full);

    const toggle = () => {
      const expanded = cell.dataset.expanded === "true";
      if (expanded) {
        full.hidden = true;
        summary.hidden = false;
        cell.dataset.expanded = "false";
        cell.setAttribute("aria-expanded", "false");
        cell.title = "클릭하여 펼치기";
      } else {
        full.hidden = false;
        summary.hidden = true;
        cell.dataset.expanded = "true";
        cell.setAttribute("aria-expanded", "true");
        cell.title = "클릭하여 접기";
      }
    };
    cell.addEventListener("click", toggle);
    cell.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        toggle();
      }
    });
    return cell;
  }

  // ── Data fetch ───────────────────────────────────────────────────────
  async function fetchAuditLog() {
    state.loading = true;
    state.error = null;
    renderStatus();
    renderPager();
    try {
      const search = new URLSearchParams();
      // target_table — comma-separated (server splits on `,`).
      if (state.filters.target_tables.length > 0) {
        search.set("target_table", state.filters.target_tables.join(","));
      }
      if (state.filters.target_row_id) {
        search.set("target_row_id", state.filters.target_row_id);
      }
      if (state.filters.from) {
        search.set("from", state.filters.from);
      }
      if (state.filters.to) {
        search.set("to", state.filters.to);
      }
      search.set("limit", String(state.limit));
      search.set("offset", String(state.offset));

      const body = await apiFetch(`${AUDIT_LOG_URL}?${search.toString()}`);
      state.items = Array.isArray(body.items) ? body.items : [];
      state.total = typeof body.total === "number" ? body.total : 0;
      state.loading = false;
      renderStatus();
      renderRows();
      renderPager();
    } catch (err) {
      state.loading = false;
      state.error =
        err && err.message
          ? err.message
          : "감사 로그를 불러오지 못했습니다";
      state.items = [];
      state.total = 0;
      renderStatus();
      renderRows();
      renderPager();
      showToast(state.error, "error");
    }
  }

  // Initial load with default filters (all empty → unfiltered first page).
  fetchAuditLog();
}
