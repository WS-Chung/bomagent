// =============================================================================
// pages/production_plan.js — ProductionPlanPage (task 4.5)
// -----------------------------------------------------------------------------
// Source: design.md §9.2, §9.5 ProductionPlanPage
// Validates: Requirements 3.6, 9.1, 9.2, 9.3, 9.5, 10.1, 10.2, 10.4, 10.6,
//            11.1, 11.2, 11.5, 11.8, 18.7, 18.10
//
// BomModal integration (task 4.6)
//   The product-name button delegates to ``openBomModal`` from
//   components/bom_modal.js.  No special suppression is needed here:
//   the modal's own bom:changed emits arrive while the matrix is hidden
//   behind the modal backdrop, and a refresh after close is cheap.
//
// Mounted at route `#/production-plan` (see app.js ROUTES).
//
// Responsibilities (task 4.5)
//   1. Load { products, plan_months, cells } from GET /api/production-plan
//      and render a 2D matrix where rows are products and columns are
//      plan_months (design §9.5 ProductionPlanPage ASCII).
//   2. Cells are inline-editable:
//        click a cell → input[type=number] toggles in place
//        Enter / blur → PATCH /api/production-plan/cell
//        empty string → null (서버에 null 로 전송, Req 9.2)
//        negative input → server returns 422, UI rolls the cell back
//                         and surfaces a toast (Req 9.5)
//   3. Trailing "+ 월 추가" header cell:
//        click → inline input → POST /api/plan-months {label}
//        on success → push the new column to every row (Req 10.1, 10.4)
//        4xx → toast + keep the inline input open (Req 10.7)
//   4. Header double-click:
//        text → input → PATCH /api/plan-months/{id} {label}
//        4xx → rollback and toast (Req 10.4, 10.6)
//   5. Bottom-pinned "+ 제품 추가":
//        click → inline input → POST /api/products {name}
//        on success → append a row with NULL cells for every plan_month
//                     and scroll to it (Req 11.2, 11.5)
//        4xx → toast + keep input open
//        also emits both "production_plan:changed" and "bom:changed"
//        because the server auto-creates an empty BOM (Req 11.8 / 12.2).
//   6. The page subscribes to "production_plan:changed" and "bom:changed"
//      so external mutations refresh the matrix.
//   7. Each row exposes a [BOM] entry-point — clicking either the product
//      name or the inline [BOM] button opens the BomModal (task 4.6,
//      components/bom_modal.js).  The modal emits "bom:changed" per
//      mutation and the page reacts via its external listener.
//
// All shown literals (table grid sizes, breakpoints) flow through the
// page CSS; this module only uses semantic class names.
// =============================================================================

import { openBomModal } from "/static/components/bom_modal.js";
import { openConfirmDialog } from "/static/components/confirm_dialog.js";

const PRODUCT_NAME_MAX = 50;
const PLAN_MONTH_LABEL_MAX = 20;

// ── Page-local state ──────────────────────────────────────────────────────
//
// Issue 1 (pending-edit batch save):
//   The value-edit flows (cell quantity, product rename, month rename) no
//   longer PATCH on commit.  Instead they append to the three pending
//   Maps below, mark the affected DOM node with ``.is-pending``, and
//   emit a toast so the user knows the change is queued.  Only when the
//   [저장] toolbar button is pressed do we walk the pending Maps and
//   fire the corresponding PATCH requests in a single batch.
//
//   Structural mutations (add month, delete month, add product) still
//   hit the server immediately because they need server-assigned IDs
//   before any pending value edit can reference them.
function makeInitialState() {
  return {
    products: [], // [{ id, name, bom_id, created_at }]
    plan_months: [], // [{ id, label, sort_order }]
    // cells: Map<"productId:planMonthId", quantity|null>
    cells: new Map(),
    loading: false,
    error: null,
    // The row id we should scroll to after the next render — used by the
    // "+ 제품 추가" flow so the new row is visible without a manual scroll.
    scrollToProductId: null,
    // ── Pending (batched) edits — see Issue 1 comment above ──
    // Map<"productId:planMonthId", quantity|null>
    pendingCells: new Map(),
    // Map<productId, newName>
    pendingProductRenames: new Map(),
    // Map<planMonthId, newLabel>
    pendingMonthRenames: new Map(),
    // Set<productId> — products the user has queued for deletion.
    // The rows stay in state.products (so cells render + the ✕/undo
    // button remains clickable) but the row carries .is-pending-delete
    // for the strikethrough / muted-cell visual, and the [저장] batch
    // sequentially DELETEs each id when the user commits.
    pendingProductDeletes: new Set(),
  };
}

// ── Plan-month label helpers (2025-02 UX fix — Issue 4) ─────────────────
//
// User requirement: "양산계획 테이블 가장 왼쪽 열의 값은 항상 '시스템 날짜를
// 기준으로 그로부터 다음달의 양산 수량' 이어야 한다."  Any plan_month whose
// (year, month) is at or before the current month must be filtered out of
// the UI so the leftmost visible column is always the month AFTER today.
//
// The regex is a direct port of ``app/forecast.py :: parse_plan_month_label``
// (design §6.2) — two-digit years map to 2000+yy, four-digit years pass
// through verbatim, month must be 1..12.  Labels that don't parse are
// included defensively (better to show a mystery column than silently
// drop a user-created month), matching the server's error-recovery
// approach in ``calculate_dashboard``.
//
// Backend data + audit history are UNTOUCHED — this is a pure client-side
// display filter.  Deleting a plan_month still hits the API; hiding one
// just skips it during ``renderHead`` / ``renderRows``.
const PLAN_MONTH_LABEL_RE = /^(\d{2}|\d{4})Y'(\d{1,2})$/;

function parsePlanMonthLabel(label) {
  if (typeof label !== "string") return null;
  const match = PLAN_MONTH_LABEL_RE.exec(label);
  if (!match) return null;
  const yearRaw = match[1];
  const year = yearRaw.length === 2 ? 2000 + Number(yearRaw) : Number(yearRaw);
  const month = Number(match[2]);
  if (!Number.isFinite(year) || !Number.isFinite(month)) return null;
  if (month < 1 || month > 12) return null;
  return { year, month };
}

/**
 * Return true when ``label`` refers to a month STRICTLY AFTER the given
 * ``now`` date.  Unparseable labels return true so a mystery user-created
 * month remains visible (safer than silently dropping).
 *
 * The leftmost column of the visible matrix is therefore always the month
 * AFTER today — which is exactly what the dashboard's 2M/6M windows use,
 * so ``dashboard.fcst_Nm = inventory − Σ(pt·qty over leftmost N columns)``
 * holds by construction (see the verification note in
 * test_regression_excel_parity.py).
 */
function isFutureMonthLabel(label, now) {
  const parsed = parsePlanMonthLabel(label);
  if (!parsed) return true; // defensive — keep unparseable labels visible
  const nowYear = now.getFullYear();
  const nowMonth = now.getMonth() + 1; // JS getMonth is 0-indexed
  if (parsed.year > nowYear) return true;
  if (parsed.year < nowYear) return false;
  return parsed.month > nowMonth;
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

function cellKey(productId, planMonthId) {
  return `${productId}:${planMonthId}`;
}

function fmtCell(quantity) {
  // Req 9.2 — blank cells (null/undefined) display empty.
  if (quantity === null || quantity === undefined) return "";
  if (typeof quantity === "number") return quantity.toLocaleString("ko-KR");
  return String(quantity);
}

// ── Toast (shared host with other pages) ─────────────────────────────────
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
  root.className = "production-plan-page";
  container.appendChild(root);

  // ── Toolbar (Issue 1 — batch-save architecture) ────────────────────────
  // The [저장] button is the ONLY trigger for persisting value edits
  // (cell quantity, product name, month label).  Individual edits are
  // queued into the ``state.pending*`` Maps; clicking [저장] walks the
  // Maps and fires the corresponding PATCH requests in one batch.  The
  // button label + emphasis reflect the pending count so the user can
  // see at a glance how much work is queued.
  const toolbar = document.createElement("div");
  toolbar.className = "production-plan-toolbar";
  root.appendChild(toolbar);

  const saveBtn = document.createElement("button");
  saveBtn.type = "button";
  saveBtn.className = "btn btn--primary production-plan-toolbar__save";
  saveBtn.textContent = "저장";
  // Tooltip clarifies the [저장] button's scope — the button ONLY
  // persists Production Plan mutations (cell quantities, product-name
  // renames, plan_month label renames).  BOM edits (pt / reference)
  // are auto-saved per commit inside BomModal and never queue here, so
  // users who expected [저장] to cover BOM edits get an explicit
  // reminder of the split.
  saveBtn.title =
    "양산계획의 셀 / 제품명 / 양산월 라벨 변경을 저장합니다 (BOM 편집은 자동 저장됩니다)";
  toolbar.appendChild(saveBtn);

  // ── Status bar (loading / error / empty) ───────────────────────────────
  const statusBar = document.createElement("div");
  statusBar.className = "production-plan-status";
  root.appendChild(statusBar);

  // ── Table wrap (horizontal + vertical scroll) ──────────────────────────
  const tableWrap = document.createElement("div");
  tableWrap.className = "production-plan-table-wrap";
  root.appendChild(tableWrap);

  const table = document.createElement("table");
  table.className = "production-plan-table";
  tableWrap.appendChild(table);

  const thead = document.createElement("thead");
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  table.appendChild(tbody);

  // ── Bottom-pinned "+ 제품 추가" control ────────────────────────────────
  const addProductBar = document.createElement("div");
  addProductBar.className = "production-plan-add-product";
  root.appendChild(addProductBar);

  const addProductBtn = document.createElement("button");
  addProductBtn.type = "button";
  addProductBtn.className = "btn btn--secondary production-plan-add-product__btn";
  addProductBtn.textContent = "+ 제품 추가";
  addProductBar.appendChild(addProductBtn);

  addProductBtn.addEventListener("click", () => startAddProduct());

  // ── Status / events ────────────────────────────────────────────────────
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
    if (state.products.length === 0 && state.plan_months.length === 0) {
      statusBar.textContent =
        "등록된 제품 또는 양산월이 없습니다. 아래에서 제품을, 표 우측에서 월을 추가하세요.";
      statusBar.dataset.kind = "empty";
      return;
    }
    statusBar.textContent =
      `제품 ${state.products.length}건 · 양산월 ${state.plan_months.length}건`;
    statusBar.dataset.kind = "info";
  }

  // ── Header rendering ───────────────────────────────────────────────────
  function renderHead() {
    thead.innerHTML = "";
    const tr = document.createElement("tr");

    // Top-left corner (product label column).
    const corner = document.createElement("th");
    corner.className = "production-plan-table__corner";
    corner.textContent = "제품 / 월";
    tr.appendChild(corner);

    for (const month of state.plan_months) {
      tr.appendChild(buildMonthHeader(month));
    }

    // Trailing "+ 월 추가" cell.
    const addCell = document.createElement("th");
    addCell.className = "production-plan-table__add-month";

    const addBtn = document.createElement("button");
    addBtn.type = "button";
    addBtn.className = "production-plan-add-month__btn";
    addBtn.textContent = "+ 월";
    addBtn.title = "양산월 추가";
    addBtn.addEventListener("click", () => startAddMonth(addCell));
    addCell.appendChild(addBtn);

    tr.appendChild(addCell);
    thead.appendChild(tr);
  }

  function buildMonthHeader(month) {
    const th = document.createElement("th");
    th.className = "production-plan-table__month";
    th.dataset.planMonthId = String(month.id);
    th.title = "더블클릭: 라벨 수정 · ✕: 월 삭제";

    // Issue 1 — a queued label rename lives in pendingMonthRenames and
    // renders in place of the server value, with ``.is-pending`` on the
    // label span so the user can see the pending state at a glance.
    const pendingLabel = state.pendingMonthRenames.get(month.id);
    const displayLabel =
      pendingLabel !== undefined ? pendingLabel : month.label;

    const labelSpan = document.createElement("span");
    labelSpan.className = "production-plan-table__month-label";
    if (pendingLabel !== undefined) labelSpan.classList.add("is-pending");
    labelSpan.textContent = displayLabel;
    th.appendChild(labelSpan);

    // Small delete affordance in the top-right corner of the header
    // (Issue 3 in the UX fix batch).  ``stopPropagation`` prevents the
    // double-click rename handler on the parent <th> from swallowing
    // clicks meant for the ✕.
    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.className = "production-plan-month__delete-btn";
    delBtn.setAttribute("aria-label", `${month.label} 삭제`);
    delBtn.title = `${month.label} 삭제`;
    delBtn.innerHTML = "&times;";
    delBtn.addEventListener("click", (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      handleDeleteMonth(month);
    });
    // Guard against a fast double-click on the ✕ from triggering the
    // parent's dblclick → rename flow.
    delBtn.addEventListener("dblclick", (ev) => {
      ev.stopPropagation();
    });
    th.appendChild(delBtn);

    th.addEventListener("dblclick", () => startEditMonthLabel(th, month));
    return th;
  }

  // ── Delete plan_month → DELETE /api/plan-months/{id} ──────────────────
  // Confirmation dialog first (destructive action).  On success we prune
  // the plan_month + any cached cells locally so the matrix reflects
  // the delete without a full round-trip.
  async function handleDeleteMonth(month) {
    const ok = await openConfirmDialog({
      title: "양산월 삭제",
      message:
        `${month.label} 을 삭제하시겠습니까?\n` +
        `이 달의 양산계획 데이터가 모두 사라집니다.`,
      confirmLabel: "삭제",
      cancelLabel: "취소",
      danger: true,
    });
    if (!ok) return;

    try {
      await apiFetch(`/api/plan-months/${month.id}`, { method: "DELETE" });
      // Prune local state so the next render reflects the delete.
      state.plan_months = state.plan_months.filter((m) => m.id !== month.id);
      // Purge any cached cells that referenced the deleted month.
      for (const key of Array.from(state.cells.keys())) {
        const [, planMonthId] = key.split(":");
        if (Number(planMonthId) === month.id) state.cells.delete(key);
      }
      // Issue 1 — cascade cleanup: pending edits (cell quantities and
      // the month-label rename itself) that reference the deleted
      // plan_month can no longer target anything, so we drop them so
      // the pending-count badge + [저장] batch stay accurate.
      let purgedCells = 0;
      for (const key of Array.from(state.pendingCells.keys())) {
        const [, planMonthId] = key.split(":");
        if (Number(planMonthId) === month.id) {
          state.pendingCells.delete(key);
          purgedCells += 1;
        }
      }
      const hadPendingRename = state.pendingMonthRenames.delete(month.id);
      const purgedTotal = purgedCells + (hadPendingRename ? 1 : 0);

      renderHead();
      renderRows();
      updateSaveButtonState();
      emitProductionPlanChanged({
        reason: "plan_month_deleted",
        plan_month_id: month.id,
      });
      showToast(`양산월 "${month.label}" 을 삭제했습니다`, "info");
      if (purgedTotal > 0) {
        showToast(
          `대기 중이던 편집 ${purgedTotal}건이 삭제되었습니다`,
          "info",
        );
      }
    } catch (err) {
      showToast(
        err && err.message ? err.message : "양산월 삭제에 실패했습니다",
        "error",
      );
    }
  }

  // ── Delete product → queue for the next [저장] batch ──────────────────
  //
  // Pending-delete + save workflow (not a live DELETE):
  //   * First click on ✕ → confirm dialog → add product.id to
  //     ``state.pendingProductDeletes`` and cascade-cleanup pending
  //     renames + cell edits for the same product (they are moot
  //     once the row is scheduled to disappear).  Row visually
  //     switches to ``.is-pending-delete``.
  //   * Second click on ✕ (row already queued) → confirm dialog with
  //     "취소 / 유지" → remove from the Set → row reverts.
  //   * The actual DELETE fires in ``handleExplicitSave`` (see
  //     phase 5d).  The pending count on the [저장] button includes
  //     these queued deletes so the user can see them.
  async function handleDeleteProduct(product) {
    // Already queued? Offer to undo the pending delete.
    if (state.pendingProductDeletes.has(product.id)) {
      const undo = await openConfirmDialog({
        title: "제품 삭제 취소",
        message: `제품 '${product.name}' 의 삭제 예약을 취소하시겠습니까?`,
        confirmLabel: "취소",
        cancelLabel: "유지",
      });
      if (undo) {
        state.pendingProductDeletes.delete(product.id);
        renderRows();
        updateSaveButtonState();
        showToast(
          `제품 '${product.name}' 삭제 예약을 취소했습니다`,
          "info",
        );
      }
      return;
    }

    // First-time delete request — destructive-action confirmation
    // spelling out the CASCADE + save-to-commit contract.
    const ok = await openConfirmDialog({
      title: "제품 삭제",
      message:
        `제품 '${product.name}' 을 삭제하시겠습니까?\n` +
        `이 제품의 BOM / 양산계획 셀이 함께 사라집니다.\n` +
        `[저장] 버튼을 눌러야 실제로 삭제됩니다.`,
      confirmLabel: "삭제 예약",
      cancelLabel: "취소",
      danger: true,
    });
    if (!ok) return;

    state.pendingProductDeletes.add(product.id);

    // Cascade cleanup — any pending rename / pending cell edit for
    // this product becomes moot, so we drop them.  Keeps the batch
    // commit clean (we won't PATCH a name for a row we're about to
    // DELETE) and keeps the pending count accurate.
    state.pendingProductRenames.delete(product.id);
    for (const key of Array.from(state.pendingCells.keys())) {
      const [pid] = key.split(":");
      if (Number(pid) === product.id) {
        state.pendingCells.delete(key);
      }
    }

    renderRows();
    updateSaveButtonState();
    showToast(
      `제품 '${product.name}' 삭제가 예약되었습니다. [저장] 시 삭제됩니다.`,
      "warning",
    );
  }

  // ── Body rendering ─────────────────────────────────────────────────────
  function renderRows() {
    tbody.innerHTML = "";
    for (const product of state.products) {
      tbody.appendChild(buildRow(product));
    }
  }

  function buildRow(product) {
    const tr = document.createElement("tr");
    tr.className = "production-plan-row";
    tr.dataset.productId = String(product.id);
    // Pending-delete rows carry the visual (strikethrough name +
    // muted-amber cells) via .is-pending-delete on the <tr>.  The
    // class name is CSS-hooked in pages/production_plan.css.
    if (state.pendingProductDeletes.has(product.id)) {
      tr.classList.add("is-pending-delete");
    }

    // Product label cell — single-click renames the product, [BOM] tag
    // opens the BOM editor.  Previously the product-name button opened
    // BOM on single-click and renamed on double-click, but users
    // reported that both entry points felt identical because the two
    // actions were visually adjacent (Issue 5 in the UX fix batch).
    // The new split gives each button one action, driven by the label
    // it already carries.  ``rebuildProductNameCell`` also honors the
    // pendingProductRenames Map (Issue 1) so a queued-but-unsaved name
    // renders in place of the server value.
    const nameCell = document.createElement("th");
    nameCell.className = "production-plan-table__product";
    nameCell.scope = "row";
    rebuildProductNameCell(nameCell, product);
    tr.appendChild(nameCell);

    for (const month of state.plan_months) {
      tr.appendChild(buildCell(product, month));
    }

    // Trailing blank cell beneath the "+ 월" header column.
    const tail = document.createElement("td");
    tail.className = "production-plan-table__tail";
    tr.appendChild(tail);

    return tr;
  }

  function buildCell(product, month) {
    const td = document.createElement("td");
    td.className = "production-plan-table__cell";
    td.dataset.productId = String(product.id);
    td.dataset.planMonthId = String(month.id);
    td.tabIndex = 0;
    // Issue 1 — the cell's display value is the pending edit if one
    // exists, otherwise the last known server value.  The ``.is-pending``
    // class marks cells whose value has been locally modified but not
    // yet persisted (see the [저장] batch flow).
    const key = cellKey(product.id, month.id);
    let quantity;
    if (state.pendingCells.has(key)) {
      quantity = state.pendingCells.get(key);
      td.classList.add("is-pending");
    } else {
      quantity = state.cells.get(key);
    }
    td.textContent = fmtCell(quantity);

    td.addEventListener("click", () => startCellEdit(td, product, month));
    td.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter" || ev.key === " ") {
        ev.preventDefault();
        startCellEdit(td, product, month);
      }
    });
    return td;
  }

  // ── Inline cell edit ───────────────────────────────────────────────────
  //
  // Issue 1 — the commit path NO LONGER PATCHes the server.  Instead it
  // appends to ``state.pendingCells`` (keyed by "productId:planMonthId")
  // and paints the cell with ``.is-pending``.  If the typed value is
  // identical to the last-known server value, we delete the pending
  // entry to keep the map an accurate dirty-set (idempotent no-op).
  function startCellEdit(cell, product, month) {
    if (cell.classList.contains("is-editing")) return;
    // Pending-delete rows are on their way out — block cell edits so
    // the user cannot queue a value change against a product that
    // will be gone after the next [저장].  Prevents ghost audit rows.
    if (state.pendingProductDeletes.has(product.id)) {
      showToast("삭제 예약된 제품의 셀은 수정할 수 없습니다", "info");
      return;
    }

    const key = cellKey(product.id, month.id);
    // The "server value" for comparison is state.cells; pending edits
    // are the delta on top of it, so the compare below determines
    // whether the typed value is dirty vs a no-op restoration.
    const serverValue = state.cells.has(key) ? state.cells.get(key) : null;
    const currentValue = state.pendingCells.has(key)
      ? state.pendingCells.get(key)
      : serverValue;
    const originalText = cell.textContent;
    const wasPending = cell.classList.contains("is-pending");

    cell.classList.add("is-editing");
    cell.textContent = "";

    // Issue 2 — text input (no up/down spinner).  All quantities are typed
    // directly; ``inputMode="numeric"`` + ``pattern="[0-9]*"`` provide the
    // numeric-keyboard hint on mobile / assistive contexts without pulling
    // in the browser's native spinner chrome.  Validation on commit
    // (isFinite + Number.isInteger) is unchanged — see ``commit`` below.
    const input = document.createElement("input");
    input.type = "text";
    input.inputMode = "numeric";
    input.pattern = "[0-9]*";
    input.className = "cell-input production-plan-cell__input";
    input.value =
      currentValue === null || currentValue === undefined
        ? ""
        : String(currentValue);
    cell.appendChild(input);
    input.focus();
    input.select();

    let resolved = false;

    function commit() {
      if (resolved) return;
      resolved = true;

      // Issue 2 — strip anything that isn't a digit before we validate.
      // The input is type=text, so we cannot rely on the browser
      // silently rejecting non-numeric keystrokes.
      const raw = input.value.replace(/[^0-9]/g, "").trim();
      let next = null;
      if (raw !== "") {
        const parsed = Number(raw);
        if (!Number.isFinite(parsed) || !Number.isInteger(parsed)) {
          rollback();
          showToast("수량은 정수여야 합니다", "error");
          return;
        }
        next = parsed;
      }

      // Idempotent no-op: typed value equals the last-known server value,
      // so no pending delta is needed.  If the cell already had a pending
      // entry we drop it so the dirty-set stays accurate.
      const noop =
        (next === null && (serverValue === null || serverValue === undefined)) ||
        next === serverValue;
      if (noop) {
        state.pendingCells.delete(key);
        cell.classList.remove("is-editing");
        cell.classList.remove("is-pending");
        cell.textContent = fmtCell(serverValue);
        updateSaveButtonState();
        return;
      }

      // Queue the edit and paint the cell.
      state.pendingCells.set(key, next);
      cell.classList.remove("is-editing");
      cell.classList.add("is-pending");
      cell.textContent = fmtCell(next);
      updateSaveButtonState();
      showToast("변경 사항이 저장 대기 중입니다", "info");
    }

    function rollback() {
      cell.classList.remove("is-editing");
      if (wasPending) {
        cell.classList.add("is-pending");
      } else {
        cell.classList.remove("is-pending");
      }
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

  // ── Product-name click → queue pending rename ─────────────────────────
  //
  // Issue 1 — the commit path NO LONGER PATCHes the server.  It queues
  // the new name into ``state.pendingProductRenames`` (keyed by product
  // id) and marks the name button with ``.is-pending``.  Validation
  // errors (empty value) keep the input open with a toast so the user
  // can correct.  Duplicate-name (409) and length (422) checks are
  // deferred to the [저장] batch — the client only enforces "non-empty"
  // client-side because that is a pure keystroke condition, not a
  // cross-row invariant.
  function startEditProductName(nameCell, product) {
    if (nameCell.classList.contains("is-editing")) return;
    // Same guard as ``startCellEdit`` — a queued-for-delete product
    // must not accept rename edits (both actions would be moot on the
    // next [저장] which runs the DELETE).
    if (state.pendingProductDeletes.has(product.id)) {
      showToast("삭제 예약된 제품은 수정할 수 없습니다", "info");
      return;
    }
    nameCell.classList.add("is-editing");

    // The "server name" for comparison is the un-pending product.name;
    // a queued rename lives in pendingProductRenames.  We show whichever
    // one is dirty when the user opens the editor so they can see their
    // last unsaved value.
    const serverName = product.name;
    const currentName = state.pendingProductRenames.has(product.id)
      ? state.pendingProductRenames.get(product.id)
      : serverName;
    nameCell.innerHTML = "";

    const input = document.createElement("input");
    input.type = "text";
    input.maxLength = PRODUCT_NAME_MAX;
    input.className = "cell-input production-plan-product__input";
    input.value = currentName;
    input.setAttribute("aria-label", "제품명");
    nameCell.appendChild(input);
    input.focus();
    input.select();

    let resolved = false;

    function commit() {
      if (resolved) return;
      const next = input.value.trim();
      if (next === "") {
        // Empty value is invalid — keep the input open + toast.
        input.value = currentName;
        input.focus();
        input.select();
        showToast("제품명은 비울 수 없습니다", "error");
        return;
      }
      resolved = true;
      // Idempotent no-op: matches the server value → drop any queued
      // rename so the dirty-set stays accurate.
      if (next === serverName) {
        state.pendingProductRenames.delete(product.id);
        nameCell.classList.remove("is-editing");
        rebuildProductNameCell(nameCell, product);
        updateSaveButtonState();
        return;
      }
      state.pendingProductRenames.set(product.id, next);
      nameCell.classList.remove("is-editing");
      rebuildProductNameCell(nameCell, product);
      updateSaveButtonState();
      showToast("변경 사항이 저장 대기 중입니다", "info");
    }

    function cancelInline() {
      if (resolved) return;
      resolved = true;
      nameCell.classList.remove("is-editing");
      // Restoring innerHTML drops the listeners the original button
      // carried, so we rebuild the cell from scratch via the same
      // factory the row renderer uses.
      rebuildProductNameCell(nameCell, product);
    }

    input.addEventListener("blur", commit);
    input.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter") {
        ev.preventDefault();
        input.blur();
      } else if (ev.key === "Escape") {
        ev.preventDefault();
        cancelInline();
      }
    });
  }

  // Rebuild the static (name button + [BOM] tag) markup inside the
  // product-name cell.  Extracted from ``buildRow`` so the rename-cancel
  // and rename-commit paths can reuse the exact same DOM shape without
  // a full row re-render (which would scroll-jump the table).  The
  // click handlers must match ``buildRow`` exactly: name button ->
  // rename, [BOM] -> open BOM modal.
  function rebuildProductNameCell(nameCell, product) {
    nameCell.innerHTML = "";

    // Issue 1 — if a rename is queued, the button shows the pending
    // value and carries ``.is-pending`` so the user can see at a
    // glance which rows have unsaved work.  A pending-delete overrides
    // the pending-rename visual (delete wins because the row is about
    // to disappear on the next save).
    const pendingName = state.pendingProductRenames.get(product.id);
    const isPendingDelete = state.pendingProductDeletes.has(product.id);
    const displayName =
      pendingName !== undefined ? pendingName : product.name;

    const nameBtn = document.createElement("button");
    nameBtn.type = "button";
    nameBtn.className = "production-plan-product__btn";
    if (pendingName !== undefined) nameBtn.classList.add("is-pending");
    if (isPendingDelete) nameBtn.classList.add("is-pending-delete");
    nameBtn.textContent = displayName;
    nameBtn.title = "제품명 수정";
    nameBtn.addEventListener("click", () => startEditProductName(nameCell, product));
    nameCell.appendChild(nameBtn);

    const bomTag = document.createElement("button");
    bomTag.type = "button";
    bomTag.className = "production-plan-product__bom-link";
    bomTag.textContent = "[BOM]";
    bomTag.title = "BOM 편집";
    bomTag.addEventListener("click", () => openBom(product));
    nameCell.appendChild(bomTag);

    // ── Delete affordance — small ✕ button after [BOM] ─────────────
    // Placed after [BOM] so the row layout reads: name button, [BOM]
    // link, ✕.  Visually discreet by default (opacity 0.5 idle, 1.0
    // hover) so it doesn't compete with the primary entry points.
    // When a delete is already queued the ✕ becomes an undo trigger
    // — same button, different tooltip + aria-label.
    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "production-plan-product__delete-btn";
    deleteBtn.innerHTML = "&times;";
    if (isPendingDelete) {
      deleteBtn.setAttribute("aria-label", `${product.name} 삭제 취소`);
      deleteBtn.title = "삭제 취소";
    } else {
      deleteBtn.setAttribute("aria-label", `${product.name} 삭제`);
      deleteBtn.title = "제품 삭제 (저장 시 실제 삭제)";
    }
    deleteBtn.addEventListener("click", (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      handleDeleteProduct(product);
    });
    nameCell.appendChild(deleteBtn);

    // "삭제 예약" badge — makes the queued action visible without
    // relying on subtle strikethrough alone.  Only shown while the
    // pending-delete flag is on.
    if (isPendingDelete) {
      const badge = document.createElement("span");
      badge.className = "production-plan-product__delete-badge";
      badge.textContent = "삭제 예약";
      nameCell.appendChild(badge);
    }
  }

  // ── Header double-click → queue pending month-label rename ────────────
  //
  // Issue 1 — the commit path queues the new label into
  // ``state.pendingMonthRenames`` and re-renders the header via
  // ``renderHead`` so the pending marker + ✕-button + click handlers
  // are all rebound in one place.
  function startEditMonthLabel(th, month) {
    if (th.classList.contains("is-editing")) return;
    th.classList.add("is-editing");

    const serverLabel = month.label;
    const currentLabel = state.pendingMonthRenames.has(month.id)
      ? state.pendingMonthRenames.get(month.id)
      : serverLabel;
    th.innerHTML = "";

    const input = document.createElement("input");
    input.type = "text";
    input.maxLength = PLAN_MONTH_LABEL_MAX;
    input.className = "cell-input production-plan-month__input";
    input.value = currentLabel;
    th.appendChild(input);
    input.focus();
    input.select();

    let resolved = false;

    function commit() {
      if (resolved) return;
      resolved = true;
      const next = input.value.trim();
      if (next === "") {
        rollback();
        showToast("양산월 라벨은 비울 수 없습니다", "error");
        return;
      }
      // Idempotent no-op: matches the server value → drop any queued
      // rename so the dirty-set stays accurate.
      if (next === serverLabel) {
        state.pendingMonthRenames.delete(month.id);
        // Full-head re-render rebinds all handlers (including this
        // header's dblclick / ✕) on the fresh DOM.
        renderHead();
        updateSaveButtonState();
        return;
      }
      state.pendingMonthRenames.set(month.id, next);
      renderHead();
      updateSaveButtonState();
      showToast("변경 사항이 저장 대기 중입니다", "info");
    }

    function rollback() {
      // Restore the header without touching pendingMonthRenames — this
      // is called from validation-failure or Esc, both of which leave
      // any *previously* queued rename intact.
      renderHead();
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

  // ── "+ 월 추가" inline flow ────────────────────────────────────────────
  function startAddMonth(addCell) {
    if (addCell.classList.contains("is-editing")) return;
    addCell.classList.add("is-editing");
    const originalHtml = addCell.innerHTML;
    addCell.innerHTML = "";

    const input = document.createElement("input");
    input.type = "text";
    input.maxLength = PLAN_MONTH_LABEL_MAX;
    input.placeholder = "예: 27Y'07";
    input.className = "cell-input production-plan-month__input";
    addCell.appendChild(input);
    input.focus();

    let resolved = false;

    async function commit() {
      const label = input.value.trim();
      if (label === "") {
        // Empty input → silently cancel (treat as Esc).
        cancelInline();
        return;
      }
      if (resolved) return;
      resolved = true;
      try {
        const resp = await apiFetch("/api/plan-months", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ label }),
        });
        // Append the new plan_month locally and re-render the table —
        // BUT only when the label is strictly after today's month
        // (Issue 4).  A past-month label is still committed to the
        // server (audit trail preserved) but hidden from the UI so the
        // leftmost visible column stays at "next month".
        const now = new Date();
        const isFuture = isFutureMonthLabel(resp.label, now);
        if (isFuture) {
          state.plan_months.push({
            id: resp.id,
            label: resp.label,
            sort_order: resp.sort_order,
          });
        }
        // The list is normally sorted by sort_order ASC; the server's
        // auto-assigned sort_order is max+1 so a simple push is correct.
        renderHead();
        renderRows();
        emitProductionPlanChanged({
          reason: "plan_month_added",
          plan_month_id: resp.id,
        });
        if (isFuture) {
          showToast(`양산월 "${resp.label}" 을 추가했습니다`, "info");
        } else {
          showToast(
            `양산월 "${resp.label}" 은 지난 월이므로 표에 표시되지 않습니다`,
            "warning",
          );
        }
      } catch (err) {
        // Restore the "+ 월" button so the user can retry; leave the
        // input visible only when the error indicates a recoverable
        // input issue (422 / 409). Network failures restore the button
        // so the page never gets stuck.
        if (err && (err.status === 409 || err.status === 422)) {
          resolved = false;
          const msg =
            err.status === 409
              ? "이미 존재하는 양산월 라벨입니다"
              : err.message || "양산월 라벨은 1~20자여야 합니다";
          showToast(msg, "error");
          input.focus();
          input.select();
        } else {
          cancelInline();
          showToast(
            err && err.message ? err.message : "양산월 추가 실패",
            "error",
          );
        }
      }
    }

    function cancelInline() {
      if (resolved) return;
      resolved = true;
      addCell.classList.remove("is-editing");
      addCell.innerHTML = originalHtml;
      // Re-bind the click handler on the restored "+ 월" button.
      const btn = addCell.querySelector(".production-plan-add-month__btn");
      if (btn) btn.addEventListener("click", () => startAddMonth(addCell));
    }

    input.addEventListener("blur", commit);
    input.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter") {
        ev.preventDefault();
        input.blur();
      } else if (ev.key === "Escape") {
        ev.preventDefault();
        cancelInline();
      }
    });
  }

  // ── "+ 제품 추가" inline flow ──────────────────────────────────────────
  function startAddProduct() {
    if (addProductBar.classList.contains("is-editing")) return;
    addProductBar.classList.add("is-editing");
    addProductBar.innerHTML = "";

    const input = document.createElement("input");
    input.type = "text";
    input.maxLength = PRODUCT_NAME_MAX;
    input.placeholder = "제품명 (예: P5)";
    input.className = "cell-input production-plan-add-product__input";
    addProductBar.appendChild(input);

    const saveBtn = document.createElement("button");
    saveBtn.type = "button";
    saveBtn.className = "btn btn--primary production-plan-add-product__save";
    saveBtn.textContent = "추가";
    addProductBar.appendChild(saveBtn);

    const cancelBtn = document.createElement("button");
    cancelBtn.type = "button";
    cancelBtn.className = "btn btn--secondary production-plan-add-product__cancel";
    cancelBtn.textContent = "취소";
    addProductBar.appendChild(cancelBtn);

    input.focus();

    let resolved = false;
    let pending = false;

    async function commit() {
      if (resolved || pending) return;
      const name = input.value.trim();
      if (name === "") {
        showToast("제품명을 입력하세요", "error");
        input.focus();
        return;
      }
      pending = true;
      saveBtn.disabled = true;
      cancelBtn.disabled = true;
      input.disabled = true;
      try {
        const resp = await apiFetch("/api/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name }),
        });
        // Add the new product locally. Cells map stays empty for the new
        // product so every plan_month cell renders as blank (Req 11.5).
        state.products.push({
          id: resp.id,
          name: resp.name,
          bom_id: resp.bom_id,
          created_at: resp.created_at,
        });
        state.scrollToProductId = resp.id;
        // Empty BOM is created server-side (Req 11.3 / 12.2) → emit
        // both signals so any active page (DashboardPage, future
        // ProductionPlanPage instances) refreshes.
        emitProductionPlanChanged({
          reason: "product_added",
          product_id: resp.id,
        });
        emitBomChanged({
          reason: "product_created",
          product_id: resp.id,
          bom_id: resp.bom_id,
        });
        resolved = true;
        renderAll();
        resetAddProductBar();
        showToast(`제품 "${resp.name}" 을 추가했습니다`, "info");
      } catch (err) {
        pending = false;
        saveBtn.disabled = false;
        cancelBtn.disabled = false;
        input.disabled = false;
        input.focus();
        input.select();
        if (err && err.status === 409) {
          showToast("이미 존재하는 제품명입니다", "error");
        } else if (err && err.status === 422) {
          showToast(
            err.message || "제품명은 1~50자여야 합니다",
            "error",
          );
        } else {
          showToast(
            err && err.message ? err.message : "제품 추가 실패",
            "error",
          );
        }
      }
    }

    function cancel() {
      if (resolved || pending) return;
      resolved = true;
      resetAddProductBar();
    }

    saveBtn.addEventListener("click", commit);
    cancelBtn.addEventListener("click", cancel);
    input.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter") {
        ev.preventDefault();
        commit();
      } else if (ev.key === "Escape") {
        ev.preventDefault();
        cancel();
      }
    });
  }

  function resetAddProductBar() {
    addProductBar.classList.remove("is-editing");
    addProductBar.innerHTML = "";
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn btn--secondary production-plan-add-product__btn";
    btn.textContent = "+ 제품 추가";
    btn.addEventListener("click", () => startAddProduct());
    addProductBar.appendChild(btn);
  }

  // ── BOM modal entry-point (task 4.6) ───────────────────────────────────
  function openBom(product) {
    // Delegate the heavy lifting to bom_modal.js.  We pass through the
    // product identifiers; the modal itself fetches the line list and
    // emits "bom:changed" per mutation, which this page already
    // subscribes to for an external refresh of the matrix.
    openBomModal({
      product: {
        id: product.id,
        name: product.name,
        bom_id: product.bom_id,
      },
      onClosed: () => {
        // No-op: bom:changed events surface every mutation via the
        // external listener registered below, so the page is already
        // in sync by the time the modal fades out.
      },
    });
  }

  // ── Event bus emitters ─────────────────────────────────────────────────
  // ``suppressOwnEvents`` is bumped while we dispatch our own events so the
  // page does not react to its own emit by re-fetching (and overwriting the
  // optimistic local update we just committed). Because dispatchEvent is
  // synchronous, the counter is back to 0 by the time any *external*
  // emitter fires, so genuine cross-page updates still trigger refetch.
  let suppressOwnEvents = 0;
  function emitProductionPlanChanged(detail) {
    suppressOwnEvents += 1;
    try {
      window.dispatchEvent(
        new CustomEvent("production_plan:changed", { detail }),
      );
    } finally {
      suppressOwnEvents -= 1;
    }
  }
  function emitBomChanged(detail) {
    suppressOwnEvents += 1;
    try {
      window.dispatchEvent(new CustomEvent("bom:changed", { detail }));
    } finally {
      suppressOwnEvents -= 1;
    }
  }

  // ── Combined render (status + head + rows) ─────────────────────────────
  function renderAll() {
    renderStatus();
    renderHead();
    renderRows();
    updateSaveButtonState();

    // Scroll a freshly-added product row into view (Req 11.5).
    if (state.scrollToProductId !== null) {
      const target = tbody.querySelector(
        `tr[data-product-id="${state.scrollToProductId}"]`,
      );
      if (target) {
        // scrollIntoView with block:nearest keeps the bottom-pinned
        // controls visible while ensuring the new row is on screen.
        target.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      state.scrollToProductId = null;
    }
  }

  // ── Data fetch ─────────────────────────────────────────────────────────
  async function fetchPlan() {
    state.loading = true;
    state.error = null;
    renderStatus();
    try {
      const body = await apiFetch("/api/production-plan");
      state.products = Array.isArray(body.products) ? body.products : [];
      const allMonths = Array.isArray(body.plan_months)
        ? body.plan_months
        : [];
      // Issue 4 (2025-02 UX fix) — filter out any plan_month whose
      // (year, month) is at or before today's month.  The leftmost
      // visible column is therefore always the month AFTER today.
      // Backend data + audit history are untouched — this is a pure
      // display filter.
      const now = new Date();
      state.plan_months = allMonths.filter((pm) =>
        isFutureMonthLabel(pm && pm.label, now),
      );
      // Any cells / pending edits referencing a filtered-out month
      // must be pruned so they don't leak into the batch-save flow or
      // the pending-count badge.
      const validMonthIds = new Set(state.plan_months.map((pm) => pm.id));
      state.cells = new Map();
      const cells = Array.isArray(body.cells) ? body.cells : [];
      for (const c of cells) {
        if (
          c &&
          typeof c.product_id === "number" &&
          typeof c.plan_month_id === "number" &&
          validMonthIds.has(c.plan_month_id)
        ) {
          state.cells.set(cellKey(c.product_id, c.plan_month_id), c.quantity);
        }
      }
      // Cascade cleanup on pending Maps — a user could have queued an
      // edit for a month that has since rolled past (rare, but keeps
      // the dirty-set accurate).
      for (const key of Array.from(state.pendingCells.keys())) {
        const [, mid] = key.split(":");
        if (!validMonthIds.has(Number(mid))) state.pendingCells.delete(key);
      }
      for (const mid of Array.from(state.pendingMonthRenames.keys())) {
        if (!validMonthIds.has(mid)) state.pendingMonthRenames.delete(mid);
      }
      // Purge pending-delete ids that no longer correspond to any
      // product row.  After a successful DELETE the row is gone from
      // ``state.products`` so the entry is orphaned; dropping it keeps
      // the pending count accurate and the visual state honest.
      const validProductIds = new Set(state.products.map((p) => p.id));
      for (const pid of Array.from(state.pendingProductDeletes)) {
        if (!validProductIds.has(pid)) state.pendingProductDeletes.delete(pid);
      }
      state.loading = false;
      renderAll();
    } catch (err) {
      state.loading = false;
      state.error =
        err && err.message ? err.message : "양산계획을 불러오지 못했습니다";
      state.products = [];
      state.plan_months = [];
      state.cells = new Map();
      renderAll();
    }
  }

  // ── Save button visual state (Issue 1) ────────────────────────────────
  //
  // The [저장] button reflects the total pending count:
  //   - 0 pending → label "저장", no emphasis class
  //   - N pending → label "저장 (N)", ``.has-pending`` for the amber ring
  //
  // Called whenever pending Maps mutate (edit commit, batch-save,
  // cascade cleanup on month delete).
  function pendingCount() {
    return (
      state.pendingCells.size +
      state.pendingProductRenames.size +
      state.pendingMonthRenames.size +
      state.pendingProductDeletes.size
    );
  }

  function updateSaveButtonState() {
    const n = pendingCount();
    if (n > 0) {
      saveBtn.textContent = `저장 (${n})`;
      saveBtn.classList.add("has-pending");
    } else {
      saveBtn.textContent = "저장";
      saveBtn.classList.remove("has-pending");
    }
  }

  // ── Explicit "저장" toolbar action (Issue 1 — batch commit) ───────────
  //
  // Walks the three pending Maps and fires the corresponding PATCH
  // requests SEQUENTIALLY (Issue 3, 2025-01 UX fix).  Sequential is
  // necessary because every write path acquires the SQLite writer
  // lock via ``BEGIN IMMEDIATE`` (design §8.3), and two concurrent
  // PATCHes from a browser cause the second one to lose the race with
  // ``SQLITE_BUSY`` after busy_timeout — producing the "3건 중 1건
  // 저장" partial-failure the user reported.  Serialising on the
  // client eliminates that class of failure entirely.
  //
  // Successful entries are dropped from the pending Map; failures
  // stay so the user can retry via another [저장] press.  On any
  // success we re-fetch the plan so the canonical server state
  // replaces the client-side optimistic view, and we emit a single
  // ``production_plan:changed`` event so cross-page listeners refresh
  // once — not N times.
  async function handleExplicitSave() {
    // 1) Force any active input to commit via blur so its pending
    //    entry lands in the Maps before we snapshot them.  Some
    //    browsers cancel blur on button-click focus transfer, so we
    //    give the async commit path a tiny beat to settle.
    const ae = document.activeElement;
    if (
      ae &&
      root.contains(ae) &&
      (ae.tagName === "INPUT" || ae.tagName === "TEXTAREA")
    ) {
      ae.blur();
      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    // 2) Nothing to save?  Toast and bail — do NOT hit the server.
    if (pendingCount() === 0) {
      // Clarifying subtext — BOM edits are auto-saved via BomModal so
      // users don't expect the [저장] button to cover them.  Keeps the
      // "왜 반응이 없지?" mental-model gap from reappearing.
      showToast(
        "저장할 변경 사항이 없습니다 (BOM 편집은 자동 저장되었습니다)",
        "info",
      );
      return;
    }

    // 3) Disable the button + swap label to signal in-flight state.
    //    ``updateSaveButtonState`` at the end of the batch re-derives
    //    the label from the (updated) pending count, so we don't need
    //    to remember the previous string.
    saveBtn.disabled = true;
    saveBtn.textContent = "저장 중…";

    // 4) Snapshot the pending Maps so we can mutate the originals as
    //    each request resolves.  Snapshotting also protects us from a
    //    user edit that lands mid-batch (rare, but the batch should
    //    only commit what was queued when [저장] was pressed).
    const pendingCellsSnap = Array.from(state.pendingCells.entries());
    const pendingProductRenamesSnap = Array.from(
      state.pendingProductRenames.entries(),
    );
    const pendingMonthRenamesSnap = Array.from(
      state.pendingMonthRenames.entries(),
    );

    let successCount = 0;
    let firstError = null;
    let totalCount = 0;

    // 5) Sequential PATCH loop — see the "Sequential to avoid SQLite
    //    BEGIN IMMEDIATE lock contention" note above.  Each iteration
    //    ``await``s the previous request so only one write transaction
    //    is in flight at any time.

    // 5a) Cell quantity edits — PATCH /api/production-plan/cell.
    for (const [key, quantity] of pendingCellsSnap) {
      totalCount += 1;
      const [productIdStr, planMonthIdStr] = key.split(":");
      const productId = Number(productIdStr);
      const planMonthId = Number(planMonthIdStr);
      try {
        await apiFetch("/api/production-plan/cell", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            product_id: productId,
            plan_month_id: planMonthId,
            quantity,
          }),
        });
        state.pendingCells.delete(key);
        successCount += 1;
      } catch (err) {
        if (firstError === null) firstError = err;
      }
    }

    // 5b) Product renames — PATCH /api/products/{id}.
    for (const [productId, newName] of pendingProductRenamesSnap) {
      totalCount += 1;
      try {
        await apiFetch(`/api/products/${productId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: newName }),
        });
        state.pendingProductRenames.delete(productId);
        successCount += 1;
      } catch (err) {
        if (firstError === null) firstError = err;
      }
    }

    // 5c) Month renames — PATCH /api/plan-months/{id}.
    for (const [planMonthId, newLabel] of pendingMonthRenamesSnap) {
      totalCount += 1;
      try {
        await apiFetch(`/api/plan-months/${planMonthId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ label: newLabel }),
        });
        state.pendingMonthRenames.delete(planMonthId);
        successCount += 1;
      } catch (err) {
        if (firstError === null) firstError = err;
      }
    }

    // 5d) Product deletes — DELETE /api/products/{id}.  Runs LAST in
    //     the batch so cell / rename PATCHes on any surviving row are
    //     applied first (a delete short-circuits the row from the UI
    //     entirely, and the CASCADE on the server wipes BOM +
    //     production_plan children atomically).  Cross-page listeners
    //     (dashboard etc.) receive both production_plan:changed AND
    //     bom:changed because a delete disturbs both surfaces.
    const pendingDeletesSnap = Array.from(state.pendingProductDeletes);
    let deletedProductCount = 0;
    for (const productId of pendingDeletesSnap) {
      totalCount += 1;
      try {
        await apiFetch(`/api/products/${productId}`, { method: "DELETE" });
        state.pendingProductDeletes.delete(productId);
        successCount += 1;
        deletedProductCount += 1;
      } catch (err) {
        if (firstError === null) firstError = err;
      }
    }

    const failCount = totalCount - successCount;

    // 6) Re-fetch the canonical server state whenever anything landed
    //    so the DOM reflects reality (not the client-side optimistic
    //    view we've been showing).  fetchPlan re-runs renderAll which
    //    honors the still-pending entries (failures) as .is-pending.
    if (successCount > 0) {
      try {
        await fetchPlan();
      } catch {
        /* fetchPlan surfaces its own toast on failure */
      }
      emitProductionPlanChanged({
        reason: "batch_saved",
        saved: successCount,
      });
      // Product deletes CASCADE to boms + bom_items on the server, so
      // any cross-page listener that renders BOM data (dashboard,
      // audit-log, etc.) needs a bom:changed signal to refresh.  We
      // only emit it when at least one delete landed so we don't
      // trigger spurious BOM refetches after a pure cell / rename
      // batch.
      if (deletedProductCount > 0) {
        emitBomChanged({
          reason: "product_deleted",
          deleted: deletedProductCount,
        });
      }
    }

    // 7) Toast summary + restore button chrome.  Issue 3 UX fix:
    //    the user asked for compact partial-failure messaging in the
    //    form "3건 중 1건 저장" — the underlying error message is
    //    interesting for debugging so we log it via console.warn but
    //    keep it out of the surface toast to avoid alarming the user.
    if (failCount === 0) {
      showToast(`${totalCount}건 저장되었습니다`, "success");
    } else if (successCount === 0) {
      // All-fail — still terse; the error console has the specifics.
      showToast(`${totalCount}건 중 ${successCount}건 저장됨`, "error");
    } else {
      showToast(
        `${totalCount}건 중 ${successCount}건 저장됨`,
        "warning",
      );
    }
    if (firstError) {
      // eslint-disable-next-line no-console
      console.warn("[production_plan] batch save partial failure:", firstError);
    }

    saveBtn.disabled = false;
    // Reset the label from "저장 중…" to whatever the current pending
    // count dictates.  ``updateSaveButtonState`` overwrites textContent
    // + toggles ``.has-pending`` in one place so both paths (success
    // and partial failure) converge on the same visual state.
    updateSaveButtonState();
  }

  saveBtn.addEventListener("click", handleExplicitSave);

  // ── beforeunload guard (Issue 1) ───────────────────────────────────────
  //
  // Prompts the browser's native "leave site?" dialog if the user
  // tries to close / reload / navigate away with pending edits.  The
  // handler is intentionally minimal: we don't override the message
  // (browsers ignore custom strings for privacy), we just signal
  // ``preventDefault`` + assign returnValue so the dialog fires.
  const beforeUnloadHandler = (ev) => {
    if (pendingCount() > 0) {
      ev.preventDefault();
      ev.returnValue = "";
    }
  };
  window.addEventListener("beforeunload", beforeUnloadHandler);

  // ── External event listeners (Req 9.6 / 11.8 / 12.2) ──────────────────
  // Re-fetch when *other* pages / modals mutate the data we depend on.
  // The ``suppressOwnEvents`` guard prevents the page from chasing its own
  // emits, which would otherwise rebuild the entire matrix after every
  // inline cell edit (and cause scroll-position jitter).
  function onProductionPlanChanged() {
    if (suppressOwnEvents > 0) return;
    fetchPlan();
  }
  function onBomChanged() {
    if (suppressOwnEvents > 0) return;
    fetchPlan();
  }
  window.addEventListener("production_plan:changed", onProductionPlanChanged);
  window.addEventListener("bom:changed", onBomChanged);

  // First load.
  fetchPlan();
}
