// =============================================================================
// pages/supplier_management.js — SupplierManagementPage (공급관리)
// -----------------------------------------------------------------------------
// Source: 2025-02 UX request — a dedicated "공급관리" page listing every
// supplier with the 5 free-text detail fields (정식 업체명, 담당자,
// 담당자 연락처, 담당자 E-mail, 사업자 주소), plus a per-row
// [업체정보 수정] button that opens ``openSupplierEditModal`` for inline
// editing.  Fields are persisted via ``PATCH /api/suppliers/{id}``.
//
// Responsibilities:
//   1. Fetch ``/api/suppliers`` on mount (sorted by name COLLATE NOCASE
//      server-side).  No pagination — the 9-supplier initial set fits on
//      screen and the page is unlikely to grow past a couple of pages
//      in normal operation.
//   2. Render one table row per supplier.  Clicking a row (or the
//      explicit [업체정보 수정] button) opens the edit modal.
//   3. Subscribe to the global ``suppliers:changed`` event so a save in
//      the modal (or a POST via another page) refreshes the table
//      without needing a route change.
//
// Style rules (Req 18.1–18.4): every CSS class references tokens via the
// companion stylesheet ``styles/pages/supplier_management.css`` — no
// literal colors / spacings in this module.
// =============================================================================

import {
  openSupplierCreateModal,
  openSupplierEditModal,
} from "/static/components/supplier_edit_modal.js";
import { consumeSupplierHighlight } from "/static/components/supplier_highlight.js";

// ── Minimal fetch wrapper that throws structured errors ────────────────
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

// Lightweight toast used to acknowledge saves — mirrors the inventory
// page's implementation so the visual language stays consistent.
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

// Empty-cell placeholder — em dash keeps the row visually aligned when a
// detail column is null (never persisted, only shown).
function fmtCell(value) {
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
}

// =============================================================================
// render(container) — entry point called by app.js router
// =============================================================================
export function render(container) {
  const state = {
    suppliers: [],
    loading: false,
    error: null,
  };

  container.innerHTML = "";
  const root = document.createElement("section");
  root.className = "supplier-management-page";
  container.appendChild(root);

  // ── Toolbar (2025-02): "+ 공급사 추가" primary action on the top-right.
  // Clicking opens the same edit modal in ``create`` mode so operators
  // see the exact same form layout that they would see when editing an
  // existing supplier.  On successful POST we insert the new record
  // into the local state and re-render — cheaper than a full refetch
  // and keeps the scroll position stable.
  const toolbar = document.createElement("div");
  toolbar.className = "supplier-management-toolbar";
  const addBtn = document.createElement("button");
  addBtn.type = "button";
  addBtn.className = "btn btn--primary supplier-management-add-btn";
  addBtn.textContent = "+ 공급사 추가";
  addBtn.addEventListener("click", () => {
    openSupplierCreateModal({
      onSaved: (created) => {
        state.suppliers.push(created);
        // Preserve the server's case-insensitive alphabetical order so
        // the newcomer lands in the right visual slot without a fetch.
        state.suppliers.sort((a, b) =>
          String(a.name).localeCompare(String(b.name), "ko-KR", {
            sensitivity: "base",
          }),
        );
        renderStatus();
        renderRows();
        showToast("공급사를 추가했습니다", "info");
      },
    });
  });
  toolbar.appendChild(addBtn);
  root.appendChild(toolbar);

  // ── Status line (loading / error / empty / total count) ───────────────
  const statusBar = document.createElement("div");
  statusBar.className = "supplier-management-status";
  root.appendChild(statusBar);

  // ── Table wrap ────────────────────────────────────────────────────────
  const tableWrap = document.createElement("div");
  tableWrap.className = "supplier-management-table-wrap";
  root.appendChild(tableWrap);

  const table = document.createElement("table");
  table.className = "supplier-management-table";
  tableWrap.appendChild(table);

  // Column order matches the user's requested layout:
  //   공급사 / 정식 업체명 / 담당자 / 담당자 연락처 / 담당자 E-mail /
  //   사업자 주소 / (edit button column)
  const thead = document.createElement("thead");
  thead.innerHTML = `
    <tr>
      <th>공급사</th>
      <th>정식 업체명</th>
      <th>담당자</th>
      <th>담당자 연락처</th>
      <th>담당자 E-mail</th>
      <th>사업자 주소</th>
      <th class="col--edit" aria-label="수정"></th>
    </tr>
  `;
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  table.appendChild(tbody);

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
    if (state.suppliers.length === 0) {
      statusBar.textContent = "등록된 공급사가 없습니다";
      statusBar.dataset.kind = "empty";
      return;
    }
    statusBar.textContent = `총 ${state.suppliers.length.toLocaleString("ko-KR")} 개 공급사`;
    statusBar.dataset.kind = "info";
  }

  function buildRow(supplier) {
    const tr = document.createElement("tr");
    tr.className = "supplier-management-row";
    tr.dataset.supplierId = String(supplier.id);

    function td(text, className) {
      const c = document.createElement("td");
      if (className) c.className = className;
      c.textContent = text;
      return c;
    }

    tr.append(
      td(fmtCell(supplier.name), "cell--name"),
      td(fmtCell(supplier.formal_name)),
      td(fmtCell(supplier.contact_person)),
      td(fmtCell(supplier.contact_phone), "cell--phone"),
      td(fmtCell(supplier.contact_email), "cell--email"),
      td(fmtCell(supplier.business_address), "cell--address"),
    );

    // Edit button column — an explicit action for keyboard users; the
    // whole row is also click-to-edit so mouse users don't have to
    // aim for the tiny target.
    const editTd = document.createElement("td");
    editTd.className = "col--edit";
    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.className = "btn btn--secondary supplier-management-edit-btn";
    editBtn.textContent = "업체정보 수정";
    editBtn.addEventListener("click", (ev) => {
      ev.stopPropagation();
      openEditModalForSupplier(supplier);
    });
    editTd.appendChild(editBtn);
    tr.appendChild(editTd);

    // Row-level click also opens the modal — but only when the click
    // hit a plain cell (not a button / input) so the [업체정보 수정]
    // button doesn't double-fire.
    tr.addEventListener("click", (ev) => {
      const target = ev.target;
      if (
        target instanceof HTMLElement &&
        (target.tagName === "BUTTON" ||
          target.tagName === "INPUT" ||
          target.tagName === "A")
      ) {
        return;
      }
      openEditModalForSupplier(supplier);
    });
    return tr;
  }

  function renderRows() {
    tbody.innerHTML = "";
    for (const supplier of state.suppliers) {
      tbody.appendChild(buildRow(supplier));
    }
  }

  // 공지사항에서 '담당자 변경 대응' 으로 진입한 경우, 원인이 된 공급사 행만
  // 깜빡이며 강조한다. 페이지 아무 곳이나 클릭하면 강조가 종료된다.
  function applyPendingHighlight() {
    const rawId = consumeSupplierHighlight();
    if (rawId == null) return;
    const safeId =
      typeof CSS !== "undefined" && CSS.escape ? CSS.escape(rawId) : rawId;
    const row = tbody.querySelector(
      `.supplier-management-row[data-supplier-id="${safeId}"]`,
    );
    if (!row) return;
    row.classList.add("is-highlighted");
    try {
      row.scrollIntoView({ block: "center", behavior: "smooth" });
    } catch {
      /* scrollIntoView 옵션 미지원 — 무시 */
    }
    const stopBlink = () => {
      document
        .querySelectorAll(".supplier-management-row.is-highlighted")
        .forEach((r) => r.classList.remove("is-highlighted"));
    };
    // 내비게이션을 유발한 클릭이 끝난 뒤 리스너를 붙여, 같은 클릭으로 즉시
    // 꺼지지 않게 한다. 이후 페이지의 어떤 클릭이든 강조를 종료한다.
    window.setTimeout(() => {
      document.addEventListener("click", stopBlink, {
        once: true,
        capture: true,
      });
    }, 0);
  }

  function openEditModalForSupplier(supplier) {
    openSupplierEditModal(
      supplier,
      (updated) => {
        // Refresh the local row in place — cheaper than a full re-fetch
        // and keeps the scroll position stable.
        const idx = state.suppliers.findIndex((s) => s.id === updated.id);
        if (idx >= 0) {
          state.suppliers[idx] = updated;
          renderRows();
        } else {
          fetchSuppliers();
        }
        // Broadcast so other pages (dashboard filter, receiving modal
        // dropdown) refresh their own supplier caches on next open.
        window.dispatchEvent(
          new CustomEvent("suppliers:changed", {
            detail: { id: updated.id },
          }),
        );
        showToast("공급사 정보를 저장했습니다", "info");
      },
      () => {
        /* onClosed — nothing to do; modal already faded out. */
      },
    );
  }

  async function fetchSuppliers() {
    state.loading = true;
    state.error = null;
    renderStatus();
    try {
      const body = await apiFetch("/api/suppliers");
      state.suppliers = Array.isArray(body) ? body : [];
      state.loading = false;
      renderStatus();
      renderRows();
      applyPendingHighlight();
    } catch (err) {
      state.loading = false;
      state.error = err && err.message ? err.message : "공급사 목록을 불러오지 못했습니다";
      state.suppliers = [];
      renderStatus();
      renderRows();
    }
  }

  // Subscribe to global supplier-mutation events so any modal / receiving
  // flow that adds or renames a supplier keeps the table fresh.
  function onSuppliersChanged() {
    fetchSuppliers();
  }
  window.addEventListener("suppliers:changed", onSuppliersChanged);

  fetchSuppliers();
}
