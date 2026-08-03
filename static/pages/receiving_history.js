// =============================================================================
// pages/receiving_history.js — ReceivingHistoryPage
// -----------------------------------------------------------------------------
// Source: design.md §9.2, §10.4 ConfirmDialog
// Validates: Requirements 3.6, 8.1, 8.2, 8.3, 8.4, 8.5, 8.10, 8.11, 18.7
//
// Mounted at route `#/inventory/history` (see app.js ROUTES).
//
// Responsibilities (task 3.5):
//   1. Render a toolbar (title + pagination slot) and an 8-column history
//      table: 입고일자 / 자체PN / MfrPN / 수량 / 매입단가 / 공급사 /
//             취소여부 / [취소] action.
//   2. fetchHistory({limit:50, offset:0}) → GET /api/receiving with the
//      response envelope { total, items }. 50/page pagination is enforced
//      by the server (Req 8.11) and surfaced in the pager below.
//   3. Cancelled rows show:
//        - `.receiving-row.is-cancelled` (muted/parchment styling)
//        - "취소됨" text in the 취소여부 column
//        - the [취소] button disabled
//      Active rows show an enabled [취소] button that opens a confirm
//      dialog warning the user the inventory will be decreased by the
//      receiving quantity (Req 8.5).
//   4. On a successful cancel (200): show a toast, emit "parts:changed"
//      so the Inventory page refreshes, and refetch this page so the row
//      visibly flips to 취소됨 inside the 2s acceptance window.
//   5. On 422 (INVENTORY_UNDERFLOW): toast
//        "취소 시 재고가 음수가 되어 처리할 수 없습니다" (Req 8.8).
//   6. On 409 (STATE_CONFLICT): toast "이미 취소된 입고 건입니다" and
//      refetch (Req 8.9 + handle stale UI).
//   7. Empty history → status bar shows "조회된 입고 이력이 없습니다"
//      with the column header still visible (Req 8.10).
// =============================================================================

import { openConfirmDialog } from "/static/components/confirm_dialog.js";

const PAGE_SIZE = 50;

// ── Page-local state ──────────────────────────────────────────────────────
function makeInitialState() {
  return {
    items: [],
    total: 0,
    limit: PAGE_SIZE,
    offset: 0,
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

function fmtText(v) {
  if (v === null || v === undefined) return "";
  return String(v);
}

function fmtNum(v) {
  if (v === null || v === undefined || v === "") return "";
  if (typeof v === "number") return v.toLocaleString("ko-KR");
  return String(v);
}

function fmtPrice(v) {
  if (v === null || v === undefined || v === "") return "";
  if (typeof v === "number") {
    // 매입단가는 소수점이 0이면 정수 표시, 있으면 그대로(최대 2자리)
    if (Number.isInteger(v)) return v.toLocaleString("ko-KR");
    return v.toLocaleString("ko-KR", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 4,
    });
  }
  return String(v);
}

// ── Toast (lightweight; matches inventory page) ───────────────────────────
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
  root.className = "receiving-history-page";
  container.appendChild(root);

  // ── Toolbar (title + back link + pagination slot) ──────────────────────
  const toolbar = document.createElement("div");
  toolbar.className = "receiving-history-toolbar";

  const titleEl = document.createElement("h2");
  titleEl.className = "receiving-history-toolbar__title";
  titleEl.textContent = "입고 이력";

  const backLink = document.createElement("a");
  backLink.className = "receiving-history-toolbar__back-link";
  backLink.href = "#/inventory";
  backLink.textContent = "← 재고관리";

  // Pagination slot sits on the right side of the toolbar.
  const pagerSlot = document.createElement("div");
  pagerSlot.className = "receiving-history-toolbar__pager-slot";

  toolbar.append(backLink, titleEl, pagerSlot);
  root.appendChild(toolbar);

  // ── Status bar (loading / error / empty) ───────────────────────────────
  const statusBar = document.createElement("div");
  statusBar.className = "receiving-history-status";
  root.appendChild(statusBar);

  // ── Table ──────────────────────────────────────────────────────────────
  const tableWrap = document.createElement("div");
  tableWrap.className = "receiving-history-table-wrap";
  root.appendChild(tableWrap);

  const table = document.createElement("table");
  table.className = "receiving-history-table";
  tableWrap.appendChild(table);

  const thead = document.createElement("thead");
  thead.innerHTML = `
    <tr>
      <th class="col-date">입고일자</th>
      <th class="col-spn">자체PN</th>
      <th class="col-mfrpn">MfrPN</th>
      <th class="col-qty">수량</th>
      <th class="col-price">매입단가</th>
      <th class="col-supplier">공급사</th>
      <th class="col-status">취소여부</th>
      <th class="col-action"></th>
    </tr>
  `;
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  table.appendChild(tbody);

  // ── Pagination ─────────────────────────────────────────────────────────
  const pager = document.createElement("nav");
  pager.className = "receiving-history-pager";
  pager.setAttribute("aria-label", "페이지 이동");
  pagerSlot.appendChild(pager);

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
      // Req 8.10 — empty history wording.
      statusBar.textContent = "조회된 입고 이력이 없습니다";
      statusBar.dataset.kind = "empty";
      return;
    }
    statusBar.textContent = `총 ${state.total.toLocaleString("ko-KR")} 건`;
    statusBar.dataset.kind = "info";
  }

  function renderPager() {
    pager.innerHTML = "";
    if (state.total <= state.limit) {
      // Single page — render label only so the user still sees totals.
      if (state.total > 0) {
        const label = document.createElement("span");
        label.className = "receiving-history-pager__label";
        label.textContent = "1 / 1";
        pager.appendChild(label);
      }
      return;
    }
    const totalPages = Math.max(1, Math.ceil(state.total / state.limit));
    const currentPage = Math.floor(state.offset / state.limit) + 1;

    const prev = document.createElement("button");
    prev.type = "button";
    prev.className = "btn btn--secondary receiving-history-pager__btn";
    prev.textContent = "이전";
    prev.disabled = currentPage <= 1 || state.loading;
    prev.addEventListener("click", () => {
      state.offset = Math.max(0, state.offset - state.limit);
      fetchHistory();
    });

    const next = document.createElement("button");
    next.type = "button";
    next.className = "btn btn--secondary receiving-history-pager__btn";
    next.textContent = "다음";
    next.disabled = currentPage >= totalPages || state.loading;
    next.addEventListener("click", () => {
      state.offset = state.offset + state.limit;
      fetchHistory();
    });

    const label = document.createElement("span");
    label.className = "receiving-history-pager__label";
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
    tr.className = item.cancelled
      ? "receiving-row is-cancelled"
      : "receiving-row";
    tr.dataset.receivingId = String(item.id);

    function td(text, className) {
      const c = document.createElement("td");
      if (className) c.className = className;
      c.textContent = text;
      return c;
    }

    tr.append(
      td(fmtText(item.received_date), "col-date"),
      td(fmtText(item.self_part_number), "col-spn cell--code"),
      td(fmtText(item.mfr_part_number), "col-mfrpn cell--code"),
      td(fmtNum(item.quantity), "col-qty"),
      td(fmtPrice(item.unit_price), "col-price"),
      td(fmtText(item.supplier_name), "col-supplier"),
    );

    // 취소여부 cell — text "취소됨" for cancelled, blank for active.
    const statusCell = document.createElement("td");
    statusCell.className = "col-status";
    if (item.cancelled) {
      const label = document.createElement("span");
      label.className = "cancelled-label";
      label.textContent = "취소됨";
      statusCell.appendChild(label);
    } else {
      statusCell.textContent = "";
    }
    tr.appendChild(statusCell);

    // Action cell — [취소] button.
    const actionCell = document.createElement("td");
    actionCell.className = "col-action";
    const cancelBtn = document.createElement("button");
    cancelBtn.type = "button";
    cancelBtn.className = "btn btn--danger receiving-row__cancel-btn";
    cancelBtn.textContent = "취소";
    cancelBtn.disabled = Boolean(item.cancelled);
    if (item.cancelled) {
      cancelBtn.setAttribute("aria-disabled", "true");
      cancelBtn.title = "이미 취소된 입고 건입니다";
    } else {
      cancelBtn.addEventListener("click", () => promptCancel(item));
    }
    actionCell.appendChild(cancelBtn);
    tr.appendChild(actionCell);

    return tr;
  }

  // ── Cancel flow ────────────────────────────────────────────────────────
  async function promptCancel(item) {
    // Quantity is always a positive integer in receiving_log; format with
    // ko-KR digit groups so the message reads naturally.
    const qty = fmtNum(item.quantity);
    const ok = await openConfirmDialog({
      title: "입고 취소",
      message:
        `해당 입고 건을 취소하면 재고가 ${qty}만큼 차감됩니다.\n` +
        "계속하시겠습니까?",
      confirmLabel: "취소 처리",
      cancelLabel: "닫기",
      danger: true,
    });
    if (!ok) return;
    await runCancel(item);
  }

  async function runCancel(item) {
    try {
      await apiFetch(`/api/receiving/${item.id}/cancel`, { method: "POST" });
      showToast("입고 건을 취소했습니다", "info");
      // Notify the Inventory page so it refreshes inventory in ≤2s.
      window.dispatchEvent(
        new CustomEvent("parts:changed", {
          detail: { reason: "receiving_cancelled", receiving_id: item.id },
        }),
      );
      // Refresh this page so the row flips to 취소됨 within 2s.
      fetchHistory();
    } catch (err) {
      if (err && err.status === 422 && err.code === "INVENTORY_UNDERFLOW") {
        showToast("취소 시 재고가 음수가 되어 처리할 수 없습니다", "error");
        return;
      }
      if (err && err.status === 409 && err.code === "STATE_CONFLICT") {
        showToast("이미 취소된 입고 건입니다", "error");
        // The local row is stale — refresh so the user sees 취소됨.
        fetchHistory();
        return;
      }
      const msg = err && err.message ? err.message : "취소 처리에 실패했습니다";
      showToast(msg, "error");
    }
  }

  // ── Data fetch ──────────────────────────────────────────────────────────
  async function fetchHistory(params = {}) {
    if (typeof params.limit === "number") state.limit = params.limit;
    if (typeof params.offset === "number") state.offset = params.offset;

    state.loading = true;
    state.error = null;
    renderStatus();
    renderPager();
    try {
      const search = new URLSearchParams();
      search.set("limit", String(state.limit));
      search.set("offset", String(state.offset));
      const body = await apiFetch(`/api/receiving?${search.toString()}`);
      state.items = Array.isArray(body.items) ? body.items : [];
      state.total = typeof body.total === "number" ? body.total : 0;
      state.loading = false;
      renderStatus();
      renderRows();
      renderPager();
    } catch (err) {
      state.loading = false;
      state.error =
        err && err.message ? err.message : "입고 이력을 불러오지 못했습니다";
      state.items = [];
      state.total = 0;
      renderStatus();
      renderRows();
      renderPager();
    }
  }

  // First load — defaults of {limit:50, offset:0}.
  fetchHistory({ limit: PAGE_SIZE, offset: 0 });
}
