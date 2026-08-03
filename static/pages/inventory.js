// =============================================================================
// pages/inventory.js — InventoryPage (재고관리)
// -----------------------------------------------------------------------------
// Source: design.md §9.2, §9.4, §9.5 InventoryPage
// Validates: Requirements 3.6, 4.1, 4.2, 4.3, 4.4, 4.6, 4.7, 5.1, 5.2, 5.6,
//            5.7, 7.15, 18.5, 18.6, 18.7, 18.9
//
// Responsibilities (task 2.5):
//   1. Toolbar with debounced search input (250ms), "+ 입고" pill primary, and
//      "입고 이력" text link → #/inventory/history.
//   2. PartsTable with sticky header + pagination (50/page).
//   3. Inventory cells are ALWAYS readonly (Req 4.3 / 7.15).
//   4. Unit-price cells support inline edit; blur → PATCH /api/parts/{id} →
//      cell refresh + rollback on failure (Req 4.4).
//   5. Row click (when not editing an input) → open EditPartModal.
//   6. Modal fade 220ms (Req 18.7).
//
// The receiving modal (task 3.4) is opened from the "+ 입고" button and from
// the receiving history page; on save it emits a window CustomEvent
// "parts:changed" that the inventory page subscribes to (below) to refresh
// rows within the 2s acceptance window.
// =============================================================================

import { openEditPartModal } from "/static/components/edit_part_modal.js";
import { openReceivingModal } from "/static/components/receiving_modal.js";
import { openWarehouseManageModal } from "/static/components/warehouse_manage_modal.js";
import { openWarehouseModal } from "/static/components/warehouse_modal.js";

// 2025-02 UX fix: pagination collapsed to a single "fetch all" page.
// The client-side column sort only reorders the currently-loaded rows,
// so with the previous 50-per-page split the user saw ambiguous sort
// results for columns like 분류 / 보관위치 (page 1's max class name
// sometimes exceeded page 2's min).  Fetching all rows in one shot
// makes the sort deterministic across the whole dataset without any
// server-side sort complication.  10000 rows is the new API cap
// (app/api/parts.py) which is well above realistic BOM sizes.
const PAGE_SIZE = 10000;
const SEARCH_DEBOUNCE_MS = 250;

// ── Page-local state ──────────────────────────────────────────────────────
// Each render() call creates a fresh state object so navigating away and
// back to the page starts cleanly. Closures inside this module reference
// the local `state` instance via captures so multiple inventory views
// cannot collide.
function makeInitialState() {
  return {
    q: "",
    parts: [],
    total: 0,
    limit: PAGE_SIZE,
    offset: 0,
    loading: false,
    error: null,
    // ── Client-side sort overlay (2025-02 UX) ────────────────────────
    // Column-header click cycles sortKey through null → asc → desc →
    // null (back to the server's default ordering).  Applied on top of
    // the fetched page, so the sort operates on the current 50-row
    // page only.  With the current 78-part dataset the page fits fully
    // so this is effectively a full sort; if pagination ever kicks in
    // the invariant is documented in the sort helper block below.
    sortKey: null,
    sortDir: null, // "asc" | "desc" | null
  };
}

// ── Client-side sort helpers (2025-02 UX) ─────────────────────────────
// Sort key extractor for a single Part row.  Missing / null values
// fall to the bottom of ascending order via -Infinity for numeric
// columns and "" for text columns (localeCompare treats "" as the
// lowest string, so nullish text also sinks to the top of asc order
// — an intentional split: numbers empty→bottom, text empty→top).
function getPartSortValue(part, key) {
  switch (key) {
    case "self_part_number":
      return part.self_part_number ?? "";
    case "class_name":
      return (part.class && part.class.name) || "";
    case "mfr_part_number":
      return part.mfr_part_number ?? "";
    case "value":
      return part.value ?? "";
    case "package":
      return part.package ?? "";
    case "lt_weeks":
      return part.lt_weeks ?? -Infinity;
    case "moq":
      return part.moq ?? -Infinity;
    case "supplier_name":
      return (part.supplier && part.supplier.name) || "";
    case "unit_price":
      return part.unit_price ?? -Infinity;
    case "inventory":
      return part.inventory ?? -Infinity;
    case "storage_location":
      return part.storage_location ?? "";
    default:
      return "";
  }
}

function compareParts(a, b, key, dir) {
  const va = getPartSortValue(a, key);
  const vb = getPartSortValue(b, key);
  const isNum = typeof va === "number" && typeof vb === "number";
  const cmp = isNum
    ? va - vb
    : String(va).localeCompare(String(vb), "ko-KR");
  return dir === "asc" ? cmp : -cmp;
}

// Column definitions — keeps the header labels + their sort keys in
// one place so the thead builder and the click handler stay in sync.
// ``key: null`` marks a header that is NOT sortable (there are none at
// the moment, but the shape is future-proof).
const INVENTORY_COLUMNS = [
  { key: "self_part_number", label: "자체PN" },
  { key: "class_name", label: "분류" },
  { key: "mfr_part_number", label: "MfrPN" },
  { key: "value", label: "Value" },
  { key: "package", label: "Package" },
  { key: "lt_weeks", label: "L/T" },
  { key: "moq", label: "MOQ" },
  { key: "supplier_name", label: "공급사" },
  { key: "unit_price", label: "단가", extraClass: "cell--editable" },
  { key: "inventory", label: "재고", extraClass: "cell--readonly" },
  { key: "storage_location", label: "보관위치" },
];

// ── Helpers ───────────────────────────────────────────────────────────────

/**
 * Generic debounce. Returns a function that delays calling `fn` until
 * `wait` ms have elapsed since the most recent invocation.
 */
function debounce(fn, wait) {
  let timer = null;
  const debounced = function (...args) {
    if (timer !== null) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      fn.apply(this, args);
    }, wait);
  };
  debounced.cancel = () => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  };
  return debounced;
}

/**
 * Minimal fetch wrapper that throws an Error carrying the API envelope
 * fields on non-2xx responses.
 */
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
 * Format a number/null cell value for table display.
 */
function fmtNum(v) {
  if (v === null || v === undefined || v === "") return "";
  if (typeof v === "number") return v.toLocaleString("ko-KR");
  return String(v);
}

function fmtText(v) {
  if (v === null || v === undefined) return "";
  return String(v);
}

// ── Toast notifications (lightweight; lives in modal portal) ──────────────
function showToast(message, kind = "info") {
  const host =
    document.getElementById("toast-host") || createToastHost();
  const toast = document.createElement("div");
  toast.className = `toast toast--${kind}`;
  toast.textContent = message;
  host.appendChild(toast);
  // Fade in
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

  // Build the static page skeleton.
  container.innerHTML = "";
  const root = document.createElement("section");
  root.className = "inventory-page";
  container.appendChild(root);

  // ── Toolbar ────────────────────────────────────────────────────────────
  const toolbar = document.createElement("div");
  toolbar.className = "inventory-toolbar";

  const searchInput = document.createElement("input");
  searchInput.type = "search";
  searchInput.className = "inventory-toolbar__search";
  // Placeholder no longer mentions CAD — the CAD column was removed from
  // the table per the 2025-01 재고관리 페이지 UX request.  The parts
  // search endpoint still matches on cad_partname server-side (see
  // ``search_parts``) so users typing a CAD substring still get hits.
  searchInput.placeholder = "🔍 자체PN / MfrPN / 공급사 / 제조사 검색";
  searchInput.setAttribute("aria-label", "부품 검색");

  // 2025-01 창고관리 UX — a new "창고관리" secondary button between
  // the search input and the "입고 이력" text link opens the full
  // marker-editor modal (see components/warehouse_manage_modal.js).
  const manageWarehouseBtn = document.createElement("button");
  manageWarehouseBtn.type = "button";
  manageWarehouseBtn.className =
    "btn btn--secondary inventory-toolbar__manage-warehouse";
  manageWarehouseBtn.textContent = "창고관리";
  manageWarehouseBtn.addEventListener("click", () => {
    openWarehouseManageModal();
  });

  const historyLink = document.createElement("a");
  historyLink.className = "inventory-toolbar__history-link";
  historyLink.href = "#/inventory/history";
  historyLink.textContent = "입고 이력";

  const receiveBtn = document.createElement("button");
  receiveBtn.type = "button";
  receiveBtn.className = "btn btn--primary inventory-toolbar__receive";
  receiveBtn.textContent = "+ 입고";

  toolbar.append(searchInput, manageWarehouseBtn, historyLink, receiveBtn);
  root.appendChild(toolbar);

  // ── Status row (loading / error / empty) ───────────────────────────────
  const statusBar = document.createElement("div");
  statusBar.className = "inventory-status";
  root.appendChild(statusBar);

  // ── Table ──────────────────────────────────────────────────────────────
  const tableWrap = document.createElement("div");
  tableWrap.className = "inventory-table-wrap";
  root.appendChild(tableWrap);

  const table = document.createElement("table");
  table.className = "inventory-table";
  tableWrap.appendChild(table);

  const thead = document.createElement("thead");
  // 2025-01 재고관리 페이지 UX: the CAD column was removed at user
  // request ("CAD 기준 파트넘버 행을 다 없애고"), and a new rightmost
  // "보관위치" column was added.  Clicking a populated 보관위치 cell
  // opens the Warehouse map modal (see ``openWarehouseModal``).
  //
  // 2025-02 UX — every header is a sortable button (three-state cycle
  // null → asc → desc → null).  Sort icon (▲/▼/↕) is rendered as a
  // child span so the header text stays crisp and the icon can be
  // repainted independently on state change.
  const headerRow = document.createElement("tr");
  thead.appendChild(headerRow);
  const headerCells = new Map(); // key → <th>
  for (const col of INVENTORY_COLUMNS) {
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
    // 3-state cycle per column: null → asc → desc → null.  Clicking a
    // different column resets to asc for that column.
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

  // ── Pagination ─────────────────────────────────────────────────────────
  const pager = document.createElement("nav");
  pager.className = "inventory-pager";
  pager.setAttribute("aria-label", "페이지 이동");
  root.appendChild(pager);

  // ── Render functions ───────────────────────────────────────────────────
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
      statusBar.textContent = state.q
        ? "검색 결과가 없습니다"
        : "등록된 부품이 없습니다";
      statusBar.dataset.kind = "empty";
      return;
    }
    statusBar.textContent = `총 ${state.total.toLocaleString("ko-KR")} 건`;
    statusBar.dataset.kind = "info";
  }

  function renderPager() {
    pager.innerHTML = "";
    if (state.total <= state.limit) {
      // Single page — hide pager entirely (per task spec).
      return;
    }
    const totalPages = Math.max(1, Math.ceil(state.total / state.limit));
    const currentPage = Math.floor(state.offset / state.limit) + 1;

    const prev = document.createElement("button");
    prev.type = "button";
    prev.className = "btn btn--secondary inventory-pager__btn";
    prev.textContent = "이전";
    prev.disabled = currentPage <= 1 || state.loading;
    prev.addEventListener("click", () => {
      state.offset = Math.max(0, state.offset - state.limit);
      fetchParts();
    });

    const next = document.createElement("button");
    next.type = "button";
    next.className = "btn btn--secondary inventory-pager__btn";
    next.textContent = "다음";
    next.disabled = currentPage >= totalPages || state.loading;
    next.addEventListener("click", () => {
      state.offset = state.offset + state.limit;
      fetchParts();
    });

    const label = document.createElement("span");
    label.className = "inventory-pager__label";
    label.textContent = `${currentPage} / ${totalPages}`;

    pager.append(prev, label, next);
  }

  function renderRows() {
    tbody.innerHTML = "";
    // Apply the client-side sort overlay.  When ``sortKey`` is null we
    // fall back to the server's ordering (part.id ASC per
    // ``search_parts``).  The sort only reorders the current page — with
    // the current dataset (78 parts, single page) that is effectively a
    // full sort.
    const rows =
      state.sortKey && state.sortDir
        ? state.parts
            .slice()
            .sort((a, b) => compareParts(a, b, state.sortKey, state.sortDir))
        : state.parts;
    for (const part of rows) {
      tbody.appendChild(buildRow(part));
    }
  }

  function buildRow(part) {
    const tr = document.createElement("tr");
    tr.className = "inventory-row";
    tr.dataset.partId = String(part.id);

    function td(text, className) {
      const c = document.createElement("td");
      if (className) c.className = className;
      c.textContent = text;
      return c;
    }

    // CAD column was removed 2025-01 (see thead comment) — the
    // ordering here must match the <th> order above exactly.
    tr.append(
      td(fmtText(part.self_part_number), "cell--code"),
      td(part.class ? part.class.name : ""),
      td(fmtText(part.mfr_part_number), "cell--code"),
      td(fmtText(part.value)),
      td(fmtText(part.package)),
      td(fmtNum(part.lt_weeks)),
      td(fmtNum(part.moq)),
      td(part.supplier ? part.supplier.name : ""),
    );

    // Editable: unit_price.
    const priceCell = document.createElement("td");
    priceCell.className = "cell--editable";
    priceCell.dataset.field = "unit_price";
    priceCell.tabIndex = 0;
    priceCell.textContent = fmtNum(part.unit_price);
    priceCell.title = "클릭하여 단가 수정";
    tr.appendChild(priceCell);

    // Readonly: inventory.
    const invCell = document.createElement("td");
    invCell.className = "cell--readonly";
    invCell.textContent = fmtNum(part.inventory);
    invCell.title = "재고는 입고/취소로만 변경됩니다";
    tr.appendChild(invCell);

    // 2025-01 재고관리 페이지 UX — 보관위치 (storage_location).
    // The value flows from part_classes.storage_location via the parts
    // API JOIN.  Clicking a populated cell opens the Warehouse map
    // modal (openWarehouseModal below).  Empty cells stay static.
    const storageCell = document.createElement("td");
    storageCell.className = "cell--storage";
    storageCell.textContent = fmtText(part.storage_location);
    if (part.storage_location) {
      storageCell.classList.add("is-clickable");
      storageCell.tabIndex = 0;
      storageCell.title = "보관위치 확인";
      storageCell.addEventListener("click", (ev) => {
        ev.stopPropagation();
        openWarehouseModal({ storageLocation: part.storage_location });
      });
      storageCell.addEventListener("keydown", (ev) => {
        if (ev.key === "Enter" || ev.key === " ") {
          ev.preventDefault();
          openWarehouseModal({ storageLocation: part.storage_location });
        }
      });
    }
    tr.appendChild(storageCell);

    // Wire interactions.
    wireRow(tr, part);
    return tr;
  }

  // Row-scoped event handlers — kept as a separate function so the
  // long arrow chain is readable and we can unit-test it later.
  function wireRow(tr, part) {
    // Row click → open EditPartModal, unless target is an editable cell
    // that is currently being edited.
    tr.addEventListener("click", (ev) => {
      const cell = ev.target.closest("td");
      if (cell) {
        // Don't open the modal when the user clicks the editable price
        // cell (we want them to edit inline) or the readonly inventory.
        if (cell.classList.contains("cell--editable")) return;
        if (cell.classList.contains("cell--readonly")) return;
        // 2025-01 UX — the 보관위치 cell owns its own click handler
        // (opens the Warehouse map modal); don't overlay the edit
        // modal on top of it.
        if (cell.classList.contains("cell--storage")) return;
      }
      openEditModalForRow(part, tr);
    });

    // Inline edit on the unit_price cell.
    const priceCell = tr.querySelector('td.cell--editable[data-field="unit_price"]');
    if (priceCell) {
      priceCell.addEventListener("click", (ev) => {
        ev.stopPropagation();
        startInlinePriceEdit(priceCell, part);
      });
      priceCell.addEventListener("keydown", (ev) => {
        if (ev.key === "Enter" || ev.key === " ") {
          ev.preventDefault();
          startInlinePriceEdit(priceCell, part);
        }
      });
    }
  }

  // ── Inline price edit ───────────────────────────────────────────────────
  function startInlinePriceEdit(cell, part) {
    if (cell.classList.contains("is-editing")) return;
    const originalText = cell.textContent;
    const originalValue = part.unit_price;
    cell.classList.add("is-editing");
    cell.textContent = "";

    const input = document.createElement("input");
    input.type = "number";
    input.step = "0.01";
    input.min = "0";
    input.className = "cell-input";
    input.value = originalValue !== null && originalValue !== undefined
      ? String(originalValue)
      : "";
    cell.appendChild(input);
    input.focus();
    input.select();

    let resolved = false;

    async function commit() {
      if (resolved) return;
      resolved = true;
      const raw = input.value.trim();
      if (raw === "") {
        // Empty input → rollback (treat as cancel).
        rollback();
        return;
      }
      const next = parseFloat(raw);
      if (Number.isNaN(next) || next < 0) {
        rollback();
        showToast("단가는 0 이상의 숫자여야 합니다", "error");
        return;
      }
      if (next === originalValue) {
        rollback();
        return;
      }
      try {
        const updated = await apiFetch(`/api/parts/${part.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ unit_price: next }),
        });
        // Update local state in-place.
        Object.assign(part, updated);
        cell.classList.remove("is-editing");
        cell.textContent = fmtNum(updated.unit_price);
      } catch (err) {
        rollback();
        const msg = err && err.message ? err.message : "단가 수정 실패";
        showToast(msg, "error");
      }
    }

    function rollback() {
      cell.classList.remove("is-editing");
      cell.textContent = originalText;
    }

    function cancel() {
      if (resolved) return;
      resolved = true;
      rollback();
    }

    input.addEventListener("blur", commit);
    input.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter") {
        ev.preventDefault();
        input.blur();
      } else if (ev.key === "Escape") {
        ev.preventDefault();
        cancel();
      }
    });
  }

  // ── Edit modal ──────────────────────────────────────────────────────────
  function openEditModalForRow(part, tr) {
    openEditPartModal(
      part,
      (updated) => {
        // Replace the row data in-place. Find the part in `state.parts`
        // by id (the user could have paginated in the meantime, so we
        // also handle the not-found case gracefully by full-refetching).
        const idx = state.parts.findIndex((p) => p.id === updated.id);
        if (idx >= 0) {
          state.parts[idx] = updated;
          const newRow = buildRow(updated);
          tr.replaceWith(newRow);
        } else {
          fetchParts();
        }
        showToast("부품 정보를 저장했습니다", "info");
      },
      () => {
        /* onClosed: nothing to do — modal already faded out. */
      },
    );
  }

  // ── Data fetch ──────────────────────────────────────────────────────────
  async function fetchParts() {
    state.loading = true;
    state.error = null;
    renderStatus();
    renderPager();
    try {
      const params = new URLSearchParams();
      params.set("limit", String(state.limit));
      params.set("offset", String(state.offset));
      if (state.q) params.set("q", state.q);
      const body = await apiFetch(`/api/parts?${params.toString()}`);
      state.parts = Array.isArray(body.items) ? body.items : [];
      state.total = typeof body.total === "number" ? body.total : 0;
      state.loading = false;
      renderStatus();
      renderRows();
      renderPager();
    } catch (err) {
      state.loading = false;
      state.error = err && err.message ? err.message : "부품 목록을 불러오지 못했습니다";
      state.parts = [];
      state.total = 0;
      renderStatus();
      renderRows();
      renderPager();
    }
  }

  // ── Wire toolbar events ─────────────────────────────────────────────────
  const debouncedSearch = debounce(() => {
    state.offset = 0;
    fetchParts();
  }, SEARCH_DEBOUNCE_MS);

  searchInput.addEventListener("input", (ev) => {
    state.q = ev.target.value;
    debouncedSearch();
  });

  receiveBtn.addEventListener("click", () => {
    // Open the Receiving modal. On success the modal emits a global
    // "parts:changed" event which we also listen to below — we additionally
    // pass an explicit onSaved callback so the refresh fires within the
    // same 2s acceptance window even if a stray listener removal occurs.
    openReceivingModal({
      onSaved: () => {
        fetchParts();
        showToast("입고 처리를 저장했습니다", "info");
      },
    });
  });

  // Listen for the global "parts:changed" event (task 3.4 will emit it).
  function onPartsChanged() {
    fetchParts();
  }
  window.addEventListener("parts:changed", onPartsChanged);

  // First load.
  fetchParts();
}
