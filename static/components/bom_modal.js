// =============================================================================
// bom_modal.js — BOM editor modal (task 4.6)
// -----------------------------------------------------------------------------
// Source: design.md §9.5 BomModal, §10.1, §10.3 BomModal 상세, Correctness
//         Property 4 (BOM-Part FK + 자유 텍스트 금지)
// Validates: Requirements 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7, 12.8, 12.9,
//            18.7
//
// Public API
//   openBomModal({
//     product: { id, name, bom_id },
//     onClosed: () => { ... },   // fade-out finished
//   })
//   → { close: () => void }
//
// Behaviour
//   * 880px panel, 220ms fade-in / fade-out via --duration-fade tokens.
//   * On open: GET /api/products/{id}/bom → render the BomItemTable.
//   * BomItemTable columns (design §9.5 ASCII):
//        # | 자체PN | MfrPN | CAD | pt (editable) | Reference (editable) | ✕
//     pt and reference cells flip into inline inputs on click;
//     Enter / blur PATCH /api/boms/{bom_id}/items/{item_id}.
//     A 422 response keeps the cell value at its pre-edit text + toasts
//     the message (Req 12.5, 12.8 — "행 미변경").
//   * Each ✕ → openConfirmDialog → DELETE /api/boms/{bom_id}/items/{item_id}.
//   * AddItemRow (design §10.3):
//        - PartPicker with debounced 250ms search against GET /api/parts?q=&limit=50.
//        - The result list floats below the input (absolute positioned).
//        - Free-text input alone never enables the [+ 추가] button — the
//          button is disabled until selectedPart is non-null (Req 12.4,
//          Correctness Property 4).
//        - pt + reference accompany the selected part on POST.
//        - 4xx responses keep the user input + surface the message in a
//          toast (Req 12.8 — "행 미변경" semantics extend to the add row).
//   * Every successful mutation emits a window CustomEvent("bom:changed")
//     (Req 12.9 / design §9.6).  The emit goes through a helper that
//     bumps a counter so any listeners registered on this same module
//     can ignore self-emits — mirrors the production_plan.js
//     suppressOwnEvents pattern.
//   * Close paths: [닫기] / ESC / backdrop / × — all fade out 220ms before
//     invoking onClosed.  The modal does NOT emit bom:changed on close;
//     emits happen per-mutation so other pages refresh promptly.
// =============================================================================

import { openConfirmDialog } from "/static/components/confirm_dialog.js";

// ── Constants ───────────────────────────────────────────────────────────
const PART_SEARCH_DEBOUNCE_MS = 250;
const PART_SEARCH_LIMIT = 50;
const PT_MIN = 1;
const PT_MAX = 999_999;
const REFERENCE_MAX = 1000;

// ── Helpers ─────────────────────────────────────────────────────────────
function resolveFadeDurationMs() {
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue("--duration-fade")
    .trim();
  if (raw.endsWith("ms")) {
    const n = parseFloat(raw);
    return Number.isFinite(n) ? n : 220;
  }
  if (raw.endsWith("s")) {
    const n = parseFloat(raw);
    return Number.isFinite(n) ? n * 1000 : 220;
  }
  return 220;
}

function debounce(fn, wait) {
  let timer = null;
  const wrapped = function (...args) {
    if (timer !== null) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      fn.apply(this, args);
    }, wait);
  };
  wrapped.cancel = () => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  };
  return wrapped;
}

/**
 * Fetch wrapper shared in shape with the other modal modules.  Throws a
 * structured Error on non-2xx so callers can branch on .status / .code /
 * .details (matches receiving_modal / edit_part_modal).
 */
async function apiFetch(url, init) {
  const resp = await fetch(url, init);
  // 204 No Content (DELETE) carries no JSON body — short-circuit.
  if (resp.status === 204) return null;
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

// ── Lightweight toast host (mirrors production_plan.js) ────────────────
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
// openBomModal — public entry
// =============================================================================
export function openBomModal(opts = {}) {
  const product = opts.product || null;
  if (!product || typeof product.id !== "number" || typeof product.bom_id !== "number") {
    // Defensive — without { id, bom_id } there is nothing to render.
    // eslint-disable-next-line no-console
    console.error("openBomModal: product { id, bom_id } is required", opts);
    return { close: () => {} };
  }
  const onClosed = typeof opts.onClosed === "function" ? opts.onClosed : null;

  const fadeMs = resolveFadeDurationMs();
  const portal = document.getElementById("modal-portal") || document.body;

  // ── State ──────────────────────────────────────────────────────────────
  /** @type {Array<{id:number, part_id:number, self_part_number:string,
   *               mfr_part_number:string, cad_partname:string|null,
   *               pt:number, reference:string, sort_order:number}>} */
  let items = [];
  let selectedPart = null;        // PartOut from /api/parts search
  let closing = false;
  // ``suppressOwnEvents`` mirrors the production_plan.js pattern. Future
  // listeners registered on the same window for "bom:changed" can check
  // it during synchronous dispatch and skip self-triggered handlers.
  let suppressOwnEvents = 0;

  // ── DOM scaffold ───────────────────────────────────────────────────────
  const backdrop = document.createElement("div");
  backdrop.className = "modal__backdrop bom-modal__backdrop is-entering";

  const panel = document.createElement("div");
  panel.className = "modal__panel modal__panel--bom bom-modal__panel";
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-modal", "true");
  panel.setAttribute("aria-label", `BOM 편집 (${product.name || ""})`);

  // Header
  const header = document.createElement("header");
  header.className = "modal__header";
  const titleEl = document.createElement("h2");
  titleEl.className = "modal__title bom-modal__title";
  titleEl.textContent = `BOM 편집 — ${product.name || ""}`;
  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.className = "modal__close";
  closeBtn.setAttribute("aria-label", "닫기");
  closeBtn.innerHTML = "&times;";
  header.append(titleEl, closeBtn);

  // Body
  const body = document.createElement("div");
  body.className = "modal__body bom-modal__body";

  // AddItemRow — appears above the table (design §9.5 wireframe).
  const addRow = buildAddItemRow();
  body.appendChild(addRow.root);

  // Status banner for load errors / empty BOM state.
  const statusBar = document.createElement("div");
  statusBar.className = "bom-modal__status";
  body.appendChild(statusBar);

  // BomItemTable — wraps so we can horizontally scroll if needed.
  const tableWrap = document.createElement("div");
  tableWrap.className = "bom-modal__table-wrap";
  body.appendChild(tableWrap);

  const table = document.createElement("table");
  table.className = "bom-modal__table";
  tableWrap.appendChild(table);

  const thead = document.createElement("thead");
  thead.innerHTML = `
    <tr>
      <th class="bom-modal__th bom-modal__th--num">#</th>
      <th class="bom-modal__th bom-modal__th--spn">자체PN</th>
      <th class="bom-modal__th bom-modal__th--mfrpn">MfrPN</th>
      <th class="bom-modal__th bom-modal__th--cad">CAD</th>
      <th class="bom-modal__th bom-modal__th--pt">pt</th>
      <th class="bom-modal__th bom-modal__th--ref">Reference</th>
      <th class="bom-modal__th bom-modal__th--action" aria-label="삭제"></th>
    </tr>
  `;
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  table.appendChild(tbody);

  // Footer — 좌측에 BOM 총액(실시간), 우측에 [닫기].
  const footer = document.createElement("footer");
  footer.className = "modal__footer bom-modal__footer";
  const totalEl = document.createElement("div");
  totalEl.className = "bom-modal__total";
  const dismissBtn = document.createElement("button");
  dismissBtn.type = "button";
  dismissBtn.className = "btn btn--secondary bom-modal__close-btn";
  dismissBtn.textContent = "닫기";
  footer.append(totalEl, dismissBtn);

  panel.append(header, body, footer);
  backdrop.appendChild(panel);
  portal.appendChild(backdrop);

  // ── Event emit helper ──────────────────────────────────────────────────
  // The counter pattern mirrors production_plan.js so any (future)
  // listener installed by this module would not re-react to its own
  // dispatch.  External listeners (Dashboard, ProductionPlanPage) are
  // unaffected because the counter is back to 0 by the time they run.
  function emitBomChanged(detail) {
    suppressOwnEvents += 1;
    try {
      window.dispatchEvent(new CustomEvent("bom:changed", { detail }));
    } finally {
      suppressOwnEvents -= 1;
    }
  }

  // ── Rendering ──────────────────────────────────────────────────────────
  function renderStatus() {
    if (items.length === 0) {
      statusBar.textContent = "BOM 라인이 없습니다";
      statusBar.dataset.kind = "empty";
      tableWrap.hidden = true;
    } else {
      statusBar.textContent = `라인 ${items.length}건`;
      statusBar.dataset.kind = "info";
      tableWrap.hidden = false;
    }
  }

  function renderRows() {
    tbody.innerHTML = "";
    items.forEach((item, idx) => tbody.appendChild(buildRow(item, idx + 1)));
    renderTotal();
  }

  // BOM 총액 = Σ (pt × 부품 등록 단가). 부품 추가/삭제/pt 수정 시마다 갱신.
  // 단가는 parts.unit_price(가장 최근 입고가 반영)를 사용한다.
  function renderTotal() {
    let total = 0;
    for (const it of items) {
      const pt = Number(it.pt) || 0;
      const price = Number(it.unit_price) || 0;
      total += pt * price;
    }
    totalEl.innerHTML = "";
    const label = document.createElement("span");
    label.className = "bom-modal__total-label";
    label.textContent = "BOM 총액 (등록 단가 기준)";
    const value = document.createElement("span");
    value.className = "bom-modal__total-value";
    value.textContent = `₩ ${Math.round(total).toLocaleString("ko-KR")}`;
    totalEl.append(label, value);
  }

  function buildRow(item, ordinal) {
    const tr = document.createElement("tr");
    tr.className = "bom-modal__row";
    tr.dataset.itemId = String(item.id);

    // # (순번)
    const tdNum = document.createElement("td");
    tdNum.className = "bom-modal__td bom-modal__td--num";
    tdNum.textContent = String(ordinal);
    tr.appendChild(tdNum);

    // 자체PN
    const tdSpn = document.createElement("td");
    tdSpn.className = "bom-modal__td bom-modal__td--spn cell--code";
    tdSpn.textContent = item.self_part_number;
    tr.appendChild(tdSpn);

    // MfrPN
    const tdMfr = document.createElement("td");
    tdMfr.className = "bom-modal__td bom-modal__td--mfrpn";
    tdMfr.textContent = item.mfr_part_number;
    tr.appendChild(tdMfr);

    // CAD
    const tdCad = document.createElement("td");
    tdCad.className = "bom-modal__td bom-modal__td--cad";
    tdCad.textContent = item.cad_partname || "";
    tr.appendChild(tdCad);

    // pt — inline editable.
    const tdPt = document.createElement("td");
    tdPt.className = "bom-modal__td bom-modal__td--pt cell--editable";
    tdPt.textContent = String(item.pt);
    tdPt.tabIndex = 0;
    tdPt.addEventListener("click", () => startPtEdit(tdPt, item));
    tdPt.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter" || ev.key === " ") {
        ev.preventDefault();
        startPtEdit(tdPt, item);
      }
    });
    tr.appendChild(tdPt);

    // Reference — inline editable.
    const tdRef = document.createElement("td");
    tdRef.className = "bom-modal__td bom-modal__td--ref cell--editable";
    tdRef.textContent = item.reference || "";
    tdRef.tabIndex = 0;
    tdRef.addEventListener("click", () => startRefEdit(tdRef, item));
    tdRef.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter" || ev.key === " ") {
        ev.preventDefault();
        startRefEdit(tdRef, item);
      }
    });
    tr.appendChild(tdRef);

    // ✕ — delete with ConfirmDialog.
    const tdDel = document.createElement("td");
    tdDel.className = "bom-modal__td bom-modal__td--action";
    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.className = "bom-modal__delete-btn";
    delBtn.setAttribute("aria-label", "BOM 라인 삭제");
    delBtn.innerHTML = "&times;";
    delBtn.addEventListener("click", () => handleDelete(item));
    tdDel.appendChild(delBtn);
    tr.appendChild(tdDel);

    return tr;
  }

  // ── Inline pt edit ─────────────────────────────────────────────────────
  function startPtEdit(cell, item) {
    if (cell.classList.contains("is-editing")) return;
    const originalText = cell.textContent;
    const originalValue = item.pt;
    cell.classList.add("is-editing");
    cell.textContent = "";

    const input = document.createElement("input");
    input.type = "number";
    input.min = String(PT_MIN);
    input.max = String(PT_MAX);
    input.step = "1";
    input.className = "cell-input bom-modal__cell-input";
    input.value = String(originalValue);
    cell.appendChild(input);
    input.focus();
    input.select();

    let resolved = false;

    function rollback() {
      cell.classList.remove("is-editing");
      cell.textContent = originalText;
    }

    async function commit() {
      if (resolved) return;
      resolved = true;
      const raw = input.value.trim();
      // Req 12.8 — pt 0 / 음수 / 비정수 는 422 + 행 미변경.
      // We pre-validate on the client so the user gets immediate feedback,
      // but a server-side 422 also rolls back so we never end up out of
      // sync with the database.
      if (raw === "") {
        rollback();
        showToast("pt 는 1 이상의 정수여야 합니다", "error");
        return;
      }
      const next = Number(raw);
      if (
        !Number.isFinite(next) ||
        !Number.isInteger(next) ||
        next < PT_MIN ||
        next > PT_MAX
      ) {
        rollback();
        showToast("pt 는 1 이상의 정수여야 합니다", "error");
        return;
      }
      if (next === originalValue) {
        // No-op edit: user completed the edit but the value didn't
        // change.  Previously this rolled back silently, which the user
        // read as "the click did nothing".  A muted info toast confirms
        // that the edit was recognised but there was nothing to save.
        rollback();
        showToast("변경된 내용이 없습니다", "info");
        return;
      }

      try {
        const updated = await apiFetch(
          `/api/boms/${product.bom_id}/items/${item.id}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ pt: next }),
          },
        );
        Object.assign(item, updated || {});
        cell.classList.remove("is-editing");
        cell.textContent = String(item.pt);
        // pt 가 바뀌면 BOM 총액도 즉시 갱신.
        renderTotal();
        // Explicit save-confirmation toast — BOM edits are auto-saved,
        // so the user needs a visual signal that the change reached
        // the server.  Without this toast users assumed the [저장]
        // button on the ProductionPlan page covered BOM edits too.
        showToast(`pt를 ${item.pt} 로 변경했습니다`, "success");
        emitBomChanged({
          reason: "item_updated",
          bom_id: product.bom_id,
          item_id: item.id,
          field: "pt",
          value: item.pt,
        });
      } catch (err) {
        rollback();
        showToast(
          err && err.message ? err.message : "pt 저장에 실패했습니다",
          "error",
        );
      }
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

  // ── Inline reference edit ──────────────────────────────────────────────
  function startRefEdit(cell, item) {
    if (cell.classList.contains("is-editing")) return;
    const originalText = cell.textContent;
    const originalValue = item.reference || "";
    cell.classList.add("is-editing");
    cell.textContent = "";

    const input = document.createElement("input");
    input.type = "text";
    input.maxLength = REFERENCE_MAX;
    input.className = "cell-input bom-modal__cell-input";
    input.value = originalValue;
    cell.appendChild(input);
    input.focus();
    input.select();

    let resolved = false;

    function rollback() {
      cell.classList.remove("is-editing");
      cell.textContent = originalText;
    }

    async function commit() {
      if (resolved) return;
      resolved = true;
      const next = input.value;
      if (next === originalValue) {
        // Same rationale as pt edit: an explicit-completed no-op is
        // toast-confirmed so the user sees a positive acknowledgement
        // rather than an ambiguous silent rollback.
        rollback();
        showToast("변경된 내용이 없습니다", "info");
        return;
      }
      try {
        const updated = await apiFetch(
          `/api/boms/${product.bom_id}/items/${item.id}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ reference: next }),
          },
        );
        Object.assign(item, updated || {});
        cell.classList.remove("is-editing");
        cell.textContent = item.reference || "";
        // Save-confirmation toast — see the pt-edit commit for the
        // BOM auto-save rationale.
        showToast("Reference 를 변경했습니다", "success");
        emitBomChanged({
          reason: "item_updated",
          bom_id: product.bom_id,
          item_id: item.id,
          field: "reference",
          value: item.reference,
        });
      } catch (err) {
        rollback();
        showToast(
          err && err.message ? err.message : "Reference 저장에 실패했습니다",
          "error",
        );
      }
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

  // ── Delete (with ConfirmDialog) ───────────────────────────────────────
  async function handleDelete(item) {
    const ok = await openConfirmDialog({
      title: "BOM 라인 삭제",
      message: `${item.self_part_number} — ${item.mfr_part_number}\nBOM 라인을 삭제하시겠습니까?`,
      confirmLabel: "삭제",
      cancelLabel: "취소",
      danger: true,
    });
    if (!ok) return;

    try {
      await apiFetch(`/api/boms/${product.bom_id}/items/${item.id}`, {
        method: "DELETE",
      });
      // Remove locally + re-render.
      items = items.filter((it) => it.id !== item.id);
      renderStatus();
      renderRows();
      emitBomChanged({
        reason: "item_deleted",
        bom_id: product.bom_id,
        item_id: item.id,
      });
    } catch (err) {
      showToast(
        err && err.message ? err.message : "BOM 라인 삭제에 실패했습니다",
        "error",
      );
    }
  }

  // ── AddItemRow (PartPicker + pt + reference + [+ 추가]) ────────────────
  function buildAddItemRow() {
    const root = document.createElement("div");
    root.className = "bom-modal__add-row";

    // PartPicker
    const pickerWrap = document.createElement("div");
    pickerWrap.className = "bom-modal__picker part-picker";

    const searchInput = document.createElement("input");
    searchInput.type = "search";
    searchInput.className = "form-control bom-modal__search part-picker__input";
    searchInput.placeholder = "🔍 자체PN 또는 MfrPN 검색 (최대 50건)";
    searchInput.setAttribute("aria-label", "부품 검색");
    searchInput.autocomplete = "off";

    // Hint shown under the search input when no results are visible
    // (Issue 4 in the UX fix batch — users kept typing in the search
    // box and hitting [+ 추가] without realising they must first
    // select a row from the dropdown).  It disappears once a search
    // is active or a part is selected.
    const searchHint = document.createElement("div");
    searchHint.className = "bom-modal__search-hint part-picker__hint";
    searchHint.textContent = "부품 검색 후 목록에서 선택하세요";

    const resultList = document.createElement("ul");
    resultList.className = "bom-modal__results part-picker__results";
    resultList.hidden = true;

    const selectedLabel = document.createElement("div");
    selectedLabel.className = "bom-modal__selected part-picker__selected";
    selectedLabel.hidden = true;

    pickerWrap.append(searchInput, searchHint, resultList, selectedLabel);

    // pt input
    const ptWrap = document.createElement("div");
    ptWrap.className = "bom-modal__field bom-modal__field--pt";
    const ptLabel = document.createElement("label");
    ptLabel.className = "bom-modal__field-label";
    ptLabel.textContent = "pt";
    const ptInput = document.createElement("input");
    ptInput.type = "number";
    ptInput.min = String(PT_MIN);
    ptInput.max = String(PT_MAX);
    ptInput.step = "1";
    ptInput.className = "form-control bom-modal__pt-input";
    ptInput.value = "1";
    ptInput.setAttribute("aria-label", "pt");
    ptWrap.append(ptLabel, ptInput);

    // Reference input
    const refWrap = document.createElement("div");
    refWrap.className = "bom-modal__field bom-modal__field--ref";
    const refLabel = document.createElement("label");
    refLabel.className = "bom-modal__field-label";
    refLabel.textContent = "Reference";
    const refInput = document.createElement("input");
    refInput.type = "text";
    refInput.maxLength = REFERENCE_MAX;
    refInput.className = "form-control bom-modal__ref-input";
    refInput.setAttribute("aria-label", "Reference");
    refWrap.append(refLabel, refInput);

    // [+ 추가] button.  We use a CSS ``is-disabled`` class instead of
    // ``disabled=true`` so the click still fires when no part is
    // selected — the handler then shows a helpful toast instead of
    // silently ignoring the click (Issue 4 in the UX fix batch).
    // Req 12.4 is still honoured because the actual POST is gated by
    // ``selectedPart !== null``; free-text input never triggers a
    // network write.
    const addBtn = document.createElement("button");
    addBtn.type = "button";
    addBtn.className = "btn btn--primary bom-modal__add-btn is-disabled";
    addBtn.textContent = "+ 추가";
    addBtn.setAttribute("aria-disabled", "true");

    root.append(pickerWrap, ptWrap, refWrap, addBtn);

    // ── Behaviour ───────────────────────────────────────────────────────
    const debouncedSearch = debounce(runSearch, PART_SEARCH_DEBOUNCE_MS);
    // Currently-focused result index (0-based).  -1 means "no result
    // focused, the search input still owns focus".  Used by the
    // ArrowUp / ArrowDown / Enter shortcuts (Issue 4).
    let focusedResultIndex = -1;

    async function runSearch() {
      const q = searchInput.value.trim();
      if (q.length === 0) {
        resultList.hidden = true;
        resultList.innerHTML = "";
        // Empty query → surface the hint again.
        searchHint.hidden = false;
        focusedResultIndex = -1;
        return;
      }
      try {
        const params = new URLSearchParams();
        params.set("q", q);
        params.set("limit", String(PART_SEARCH_LIMIT));
        const data = await apiFetch(`/api/parts?${params.toString()}`);
        renderResults(Array.isArray(data && data.items) ? data.items : []);
      } catch (err) {
        renderError(err && err.message ? err.message : "검색 실패");
      }
    }

    function renderResults(rows) {
      resultList.innerHTML = "";
      focusedResultIndex = -1;
      if (rows.length === 0) {
        const li = document.createElement("li");
        li.className = "part-picker__result part-picker__result--empty";
        li.textContent = "검색 결과 없음";
        resultList.appendChild(li);
        resultList.hidden = false;
        // The hint is not useful when we already told the user "no
        // matches" — keep it hidden.
        searchHint.hidden = true;
        return;
      }
      for (const row of rows) {
        const li = document.createElement("li");
        li.className = "part-picker__result";
        li.tabIndex = 0;
        li.dataset.partId = String(row.id);
        const cad = row.cad_partname ? ` (${row.cad_partname})` : "";
        li.textContent = `${row.self_part_number} — ${row.mfr_part_number}${cad}`;
        li.addEventListener("click", () => choosePart(row));
        li.addEventListener("keydown", (ev) => {
          if (ev.key === "Enter" || ev.key === " ") {
            ev.preventDefault();
            choosePart(row);
          }
        });
        resultList.appendChild(li);
      }
      // Visually mark the first result as the "top" — pairs with the
      // "Enter 로 선택" footer hint to communicate that hitting Enter
      // in the search input picks it.  Keyboard focus stays on the
      // input until the user presses ArrowDown / ArrowUp explicitly.
      const items = resultList.querySelectorAll(".part-picker__result");
      if (items.length > 0) {
        items[0].classList.add("part-picker__result--top");
      }
      // Footer hint: "↵ Enter 로 선택" — a small guide row appended after
      // the last result so both mouse and keyboard users know Enter
      // will pick the highlighted row.
      const footer = document.createElement("li");
      footer.className =
        "part-picker__result part-picker__result--footer";
      footer.textContent = "↵ Enter 로 선택 · ↑ ↓ 로 이동";
      resultList.appendChild(footer);

      resultList.hidden = false;
      searchHint.hidden = true;
    }

    function renderError(msg) {
      resultList.innerHTML = "";
      focusedResultIndex = -1;
      const li = document.createElement("li");
      li.className = "part-picker__result part-picker__result--error";
      li.textContent = msg;
      resultList.appendChild(li);
      resultList.hidden = false;
      searchHint.hidden = true;
    }

    // Return the list of *selectable* result <li> elements (excludes
    // the empty / error / footer decorations so keyboard nav skips
    // straight to real rows).
    function selectableResults() {
      return Array.from(
        resultList.querySelectorAll(
          ".part-picker__result:not(.part-picker__result--empty):not(.part-picker__result--error):not(.part-picker__result--footer)",
        ),
      );
    }

    function updateFocusedResult(nextIndex) {
      const items = selectableResults();
      if (items.length === 0) return;
      // Clamp and wrap.
      let idx = nextIndex;
      if (idx < 0) idx = items.length - 1;
      if (idx >= items.length) idx = 0;
      for (const it of items) it.classList.remove("is-focused");
      const target = items[idx];
      target.classList.add("is-focused");
      try {
        target.focus({ preventScroll: false });
      } catch {
        target.focus();
      }
      focusedResultIndex = idx;
    }

    function choosePart(part) {
      selectedPart = part;
      searchInput.value = "";
      resultList.hidden = true;
      resultList.innerHTML = "";
      focusedResultIndex = -1;
      searchHint.hidden = true;
      const cad = part.cad_partname ? ` (${part.cad_partname})` : "";
      selectedLabel.textContent =
        `선택됨: ${part.self_part_number} — ${part.mfr_part_number}${cad}`;
      selectedLabel.hidden = false;
      addBtn.classList.remove("is-disabled");
      addBtn.removeAttribute("aria-disabled");
      // Move focus to the pt field so the user can immediately type
      // a quantity — reduces mouse ping-pong.
      try {
        ptInput.focus({ preventScroll: true });
        ptInput.select();
      } catch {
        ptInput.focus();
      }
    }

    function clearSelection() {
      selectedPart = null;
      selectedLabel.hidden = true;
      selectedLabel.textContent = "";
      addBtn.classList.add("is-disabled");
      addBtn.setAttribute("aria-disabled", "true");
    }

    searchInput.addEventListener("input", () => {
      // Any keystroke after a selection invalidates the choice — the
      // user is starting a new search, so [+ 추가] must disable again
      // (Req 12.4: free-text alone never enables the button).
      if (selectedPart !== null) clearSelection();
      debouncedSearch();
    });

    // Keyboard navigation on the search input:
    //   ArrowDown → focus first (or next) result li
    //   ArrowUp   → focus last (or previous) result li
    //   Enter     → pick the currently-focused result (or the first
    //               visible selectable row when none is focused yet)
    // Escape is intentionally NOT bound here so the modal-level Esc
    // handler can close the dialog.
    searchInput.addEventListener("keydown", (ev) => {
      if (ev.key === "ArrowDown") {
        const items = selectableResults();
        if (items.length === 0) return;
        ev.preventDefault();
        updateFocusedResult(
          focusedResultIndex < 0 ? 0 : focusedResultIndex + 1,
        );
      } else if (ev.key === "ArrowUp") {
        const items = selectableResults();
        if (items.length === 0) return;
        ev.preventDefault();
        updateFocusedResult(
          focusedResultIndex < 0
            ? items.length - 1
            : focusedResultIndex - 1,
        );
      } else if (ev.key === "Enter") {
        const items = selectableResults();
        if (items.length === 0) return;
        ev.preventDefault();
        const targetIdx = focusedResultIndex < 0 ? 0 : focusedResultIndex;
        const li = items[targetIdx];
        if (li) {
          // The li carries data-part-id — but the row object lives in
          // the closure of ``renderResults``.  Re-derive by re-running
          // the click path: dispatch a click, which fires the handler
          // ``renderResults`` attached above.
          li.click();
        }
      }
    });

    // ArrowUp/Down while a result li has focus should keep the
    // keyboard walk going without the user having to return to the
    // input.  Delegated at the list level so we do not re-bind on
    // every result render.
    resultList.addEventListener("keydown", (ev) => {
      if (ev.key !== "ArrowDown" && ev.key !== "ArrowUp") return;
      const items = selectableResults();
      if (items.length === 0) return;
      // If the current focus is not one of the results, fall through
      // and let the input-level handler pick it up.
      const ae = document.activeElement;
      const currentIdx = items.indexOf(ae);
      if (currentIdx < 0) return;
      ev.preventDefault();
      const next = ev.key === "ArrowDown" ? currentIdx + 1 : currentIdx - 1;
      updateFocusedResult(next);
    });

    addBtn.addEventListener("click", () => {
      // "Click on disabled" branch (Issue 4): the button carries
      // ``is-disabled`` when no part is selected, but clicks still
      // fire so we can toast a helpful hint instead of silently
      // ignoring the user's action.
      if (selectedPart === null) {
        showToast("먼저 검색 결과에서 부품을 선택하세요", "error");
        try {
          searchInput.focus({ preventScroll: true });
          searchInput.select();
        } catch {
          searchInput.focus();
        }
        return;
      }
      submitNewItem();
    });

    async function submitNewItem() {
      if (selectedPart === null) {
        // Defensive — the addBtn click handler already gates this
        // path, but keep the guard in case a future refactor calls
        // submitNewItem directly.
        showToast("먼저 검색 결과에서 부품을 선택하세요", "error");
        return;
      }
      const ptRaw = ptInput.value.trim();
      // Req 12.8 — same validation we apply to inline pt edits.
      if (ptRaw === "") {
        showToast("pt 는 1 이상의 정수여야 합니다", "error");
        ptInput.focus();
        return;
      }
      const ptVal = Number(ptRaw);
      if (
        !Number.isFinite(ptVal) ||
        !Number.isInteger(ptVal) ||
        ptVal < PT_MIN ||
        ptVal > PT_MAX
      ) {
        showToast("pt 는 1 이상의 정수여야 합니다", "error");
        ptInput.focus();
        return;
      }
      const refVal = refInput.value || "";
      const partId = selectedPart.id;

      // Guard against double-submit while the network round-trip is
      // in flight.  We flip ``is-disabled`` here rather than the DOM
      // ``disabled`` property because that would swallow the click
      // event we still want to bounce with a toast when no part is
      // selected.
      addBtn.classList.add("is-disabled");
      addBtn.setAttribute("aria-disabled", "true");
      try {
        const created = await apiFetch(
          `/api/boms/${product.bom_id}/items`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              part_id: partId,
              pt: ptVal,
              reference: refVal,
            }),
          },
        );
        // Append + reset the form so the user can add another part
        // without extra clicks (part of Issue 4 UX polish).
        if (created && typeof created.id === "number") {
          items.push(created);
        }
        renderStatus();
        renderRows();
        clearSelection();
        searchInput.value = "";
        ptInput.value = "1";
        refInput.value = "";
        // Show the "start here" hint again once the row is clear.
        searchHint.hidden = false;
        // Return focus to the search input so the user's cursor is
        // ready for the next part.
        try {
          searchInput.focus({ preventScroll: true });
        } catch {
          searchInput.focus();
        }
        emitBomChanged({
          reason: "item_added",
          bom_id: product.bom_id,
          item_id: created && created.id,
        });
      } catch (err) {
        // Req 12.8 — keep user input on 4xx and surface the message.
        if (err && err.status === 409) {
          showToast(
            "이미 동일 부품이 BOM 에 등록되어 있습니다",
            "error",
          );
        } else {
          showToast(
            err && err.message ? err.message : "BOM 라인 추가에 실패했습니다",
            "error",
          );
        }
        // Re-enable [+ 추가] only if a selection still exists.
        if (selectedPart !== null) {
          addBtn.classList.remove("is-disabled");
          addBtn.removeAttribute("aria-disabled");
        }
      }
    }

    // Enter in the pt / reference fields submits the row directly —
    // reduces the "type value, mouse over to [+ 추가]" round-trip
    // (Issue 4).  When no part is selected we still call ``addBtn.click``
    // so the user gets the same "먼저 검색 결과에서 부품을 선택하세요"
    // toast as clicking the button.
    ptInput.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter") {
        ev.preventDefault();
        addBtn.click();
      }
    });
    refInput.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter") {
        ev.preventDefault();
        addBtn.click();
      }
    });

    return { root, searchInput, addBtn };
  }

  // ── Initial fetch ──────────────────────────────────────────────────────
  async function loadItems() {
    try {
      const data = await apiFetch(`/api/products/${product.id}/bom`);
      items = Array.isArray(data && data.items) ? data.items.slice() : [];
      renderStatus();
      renderRows();
    } catch (err) {
      items = [];
      statusBar.textContent =
        err && err.message ? err.message : "BOM 을 불러오지 못했습니다";
      statusBar.dataset.kind = "error";
      tableWrap.hidden = true;
    }
  }

  // ── Fade-in ────────────────────────────────────────────────────────────
  requestAnimationFrame(() => {
    backdrop.classList.remove("is-entering");
    backdrop.classList.add("is-open");
    try {
      addRow.searchInput.focus({ preventScroll: true });
    } catch {
      addRow.searchInput.focus();
    }
  });

  // ── Fade-out / close paths ─────────────────────────────────────────────
  function fadeOutAndDestroy(done) {
    if (closing) return;
    closing = true;
    backdrop.classList.remove("is-open");
    backdrop.classList.add("is-leaving");
    window.setTimeout(() => {
      document.removeEventListener("keydown", onKeydown, true);
      backdrop.remove();
      if (typeof done === "function") done();
    }, fadeMs);
  }

  async function requestClose() {
    // Auto-commit any in-flight inline edit before we tear down the
    // modal so a click on X / [닫기] / backdrop / Escape never
    // discards a value the user has already typed.  Both pt and ref
    // commit paths are wired to ``input.blur`` — dispatching blur
    // here reuses the same PATCH pipeline (with all its 4xx handling)
    // rather than duplicating the logic.  The 50ms tick gives the
    // async commit closure a chance to flush before fadeOut starts.
    const activeInput = panel.querySelector(
      ".bom-modal__cell-input:not([disabled])",
    );
    if (activeInput) {
      activeInput.blur();
      await new Promise((r) => setTimeout(r, 50));
    }
    fadeOutAndDestroy(() => {
      if (onClosed) onClosed();
    });
  }

  function onKeydown(ev) {
    if (ev.key === "Escape") {
      // Let inline cell-input escape handlers run first; if the active
      // element is an input INSIDE the modal panel, defer to it.
      const ae = document.activeElement;
      if (
        ae &&
        panel.contains(ae) &&
        (ae.tagName === "INPUT" || ae.tagName === "TEXTAREA")
      ) {
        return;
      }
      ev.preventDefault();
      ev.stopPropagation();
      requestClose();
    }
  }

  closeBtn.addEventListener("click", requestClose);
  dismissBtn.addEventListener("click", requestClose);
  backdrop.addEventListener("click", (ev) => {
    if (ev.target === backdrop) requestClose();
  });
  document.addEventListener("keydown", onKeydown, true);

  // Initial total (₩ 0) so the footer is populated before the fetch
  // resolves; loadItems() re-renders it with the real lines.
  renderTotal();

  // Kick off the data fetch.
  loadItems();

  return { close: requestClose };
}
