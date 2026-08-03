// =============================================================================
// purchase_order_modal.js — 발주서 자동작성 (Purchase Order auto-draft)
// -----------------------------------------------------------------------------
// Source: 2025-02 UX request — the dashboard's [발주서 자동작성] button
// (top-right of the table area) opens this modal.  The modal presents an
// A4-portrait document laid out like a real purchase order:
//
//   ┌────────────────────────────────────────────────────────────────┐
//   │ [top-left: 공급받는자]  [top-center: 발주서]   [top-right: 공급자]│
//   │  주식회사 엑스모스                                공급자: XX     │
//   │  주소: ...                                        담당자: XX     │
//   │  담당자: 김이박                                    사업자등록번호: X │
//   ├────────────────────────────────────────────────────────────────┤
//   │  ┌────┬───────────────┬──────┬──────┬─────────────┐             │
//   │  │ 순번│ 품목명         │ 단가 │ 수량 │ 공급가액     │  ... 12 rows │
//   │  ├────┴───────────────┴──────┴──────┴─────────────┤             │
//   │  │            총 공급가액   ₩ ...                    │             │
//   │  │            부가세 (10%)   ₩ ...                    │             │
//   │  │            총 계         ₩ ...                    │             │
//   │  └────────────────────────────────────────────────┘             │
//   │  주식회사 엑스모스     대표이사 홍길동  (인)    발주일자: ...      │
//   └────────────────────────────────────────────────────────────────┘
//   [저장]  [인쇄]  [닫기]
//
// Buyer info is hardcoded (BUYER_INFO below).  Supplier info flows from
// the caller — the dashboard passes the full supplier row + up to 12
// forecast rows.  The 12 line slots are prefilled from the forecast
// rows; empty slots let the operator type in manually.
//
// The [저장] button is a stub for now (persistence layer TBD) — it just
// toasts "발주서를 저장했습니다 (임시)".  [인쇄] calls window.print()
// combined with the print-media CSS in purchase_order_modal.css so only
// the panel body is printable.  [닫기] runs the standard fade-out.
//
// Public API:
//   openPurchaseOrderModal({ supplier, rows }) → { close }
// =============================================================================

// ── Buyer info — hardcoded per the 2025-02 spec ───────────────────────
// Frozen so a future refactor cannot accidentally mutate the header.
export const BUYER_INFO = Object.freeze({
  company: "주식회사 엑스모스",
  address: "서울특별시 강남구 삼성동 135",
  contact: "김이박",
  businessRegNumber: "123-45-67890",
  representative: "홍길동",
});

// Number of prefilled / editable line slots in the PO table.  A4 portrait
// comfortably fits 12 rows with the totals section and the footer while
// still leaving room for the two heading blocks at the top.
const MAX_LINE_COUNT = 12;

// VAT rate for the totals block (Korea standard 10%).
const VAT_RATE = 0.1;

// ── Helpers ───────────────────────────────────────────────────────────
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

/**
 * Convert an ``<input>`` value string to a non-negative finite number.
 * Invalid input (empty, non-numeric, negative, NaN, Infinity) → 0.  This
 * matches the spec's "invalid input → treat as 0" rule so the totals
 * row never shows NaN / Infinity, and the operator can still type
 * intermediate states (like just "-") without the UI blowing up.
 */
function parseNumericInput(raw) {
  if (raw === null || raw === undefined) return 0;
  const s = String(raw).trim();
  if (s.length === 0) return 0;
  const n = parseFloat(s);
  if (!Number.isFinite(n) || n < 0) return 0;
  return n;
}

/** Format a number as ko-KR thousands-separated string (no currency prefix). */
function fmtNumber(n) {
  if (!Number.isFinite(n)) return "0";
  // Round to nearest integer for currency-display consistency.  Cents /
  // sub-won values aren't meaningful for a Korean PO.
  return Math.round(n).toLocaleString("ko-KR");
}

/** Format an amount as "₩ 1,000,000" (used in the totals footer). */
function fmtCurrency(n) {
  return `₩ ${fmtNumber(n)}`;
}

/** ISO YYYY-MM-DD for the 발주일자 footer.  Uses local time (Korea). */
function todayIsoDate() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Build a default 품목명 for one forecast row.
 *
 * Per user requirement 2025-02: the PO's 품목명 column carries only the
 * manufacturer part number.  Self-part-number (내부 채번) and CAD part
 * name are omitted — those are internal metadata not meaningful to the
 * supplier reading the document.
 */
function defaultItemName(row) {
  return row && row.mfr_part_number ? String(row.mfr_part_number) : "";
}

/**
 * Format a unit price with ko-KR thousand separators AND exactly one
 * decimal place (e.g. 500 → "500.0", 1500 → "1,500.0").  Kept aligned
 * across every row so the price column reads like a proper document.
 */
function fmtPrice(n) {
  if (!Number.isFinite(n) || n < 0) return "0.0";
  return n.toLocaleString("ko-KR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

/**
 * Parse a user-typed price string that may contain thousand-separator
 * commas.  Non-numeric / negative / empty → 0 (matches the same
 * defensive rule as parseNumericInput above).
 */
function parsePriceInput(raw) {
  if (raw === null || raw === undefined) return 0;
  const s = String(raw).replace(/,/g, "").trim();
  if (s.length === 0) return 0;
  const n = parseFloat(s);
  if (!Number.isFinite(n) || n < 0) return 0;
  return n;
}

// ── Lightweight toast (matches other pages' visual language) ────────
function ensureToastHost() {
  let host = document.getElementById("toast-host");
  if (!host) {
    host = document.createElement("div");
    host.id = "toast-host";
    host.className = "toast-host";
    document.body.appendChild(host);
  }
  return host;
}

function showToast(message, kind = "info") {
  const host = ensureToastHost();
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

// ── Line-item state model ────────────────────────────────────────────
/**
 * Prepare the 12 line slots.  Positions 0..min(rows.length,12)-1 are
 * seeded from the dashboard rows; any remaining positions carry the
 * blank template so the operator can type in a custom line.
 *
 * Each line holds:
 *   itemName, unitPrice, quantity — mutable via input handlers.
 *
 * We keep raw numbers (not strings) in state so re-render is cheap.
 */
function makeLines(rows) {
  const lines = [];
  const source = Array.isArray(rows) ? rows.slice(0, MAX_LINE_COUNT) : [];
  for (let i = 0; i < MAX_LINE_COUNT; i += 1) {
    const row = source[i];
    if (row) {
      const price = Number(row.unit_price);
      const qty = Number(row.recommended_order_qty);
      lines.push({
        itemName: defaultItemName(row),
        unitPrice: Number.isFinite(price) && price >= 0 ? price : 0,
        quantity: Number.isFinite(qty) && qty >= 0 ? qty : 0,
      });
    } else {
      lines.push({ itemName: "", unitPrice: 0, quantity: 0 });
    }
  }
  return lines;
}

// =============================================================================
// openPurchaseOrderModal({ supplier, rows }) — entry point
// =============================================================================
/**
 * Open the PO auto-draft modal.
 *
 * @param {object} arg
 * @param {object} arg.supplier   Full supplier row (must carry name /
 *                                formal_name / contact_person /
 *                                business_registration_number).
 * @param {Array<object>} arg.rows Dashboard rows filtered by this
 *                                supplier (already narrowed server-side).
 * @returns {{ close: () => void }}
 */
export function openPurchaseOrderModal({ supplier, rows }) {
  const fadeMs = resolveFadeDurationMs();
  const portal = document.getElementById("modal-portal") || document.body;

  const state = {
    lines: makeLines(rows),
  };

  // ── Modal scaffold ─────────────────────────────────────────────────
  const backdrop = document.createElement("div");
  backdrop.className = "modal__backdrop purchase-order-backdrop";

  const panel = document.createElement("div");
  panel.className = "modal__panel purchase-order-panel";
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-modal", "true");
  panel.setAttribute("aria-label", "발주서 자동작성");

  // ── Header (document heading + closer) ────────────────────────────
  const docBody = document.createElement("div");
  docBody.className = "purchase-order-doc";

  // Top row: 공급받는자 | title | 공급자
  const topRow = document.createElement("div");
  topRow.className = "purchase-order-top";

  const buyerBlock = document.createElement("div");
  buyerBlock.className = "purchase-order-party purchase-order-party--buyer";
  buyerBlock.innerHTML = `
    <div class="purchase-order-party__label">공급받는자</div>
    <div class="purchase-order-party__company">${BUYER_INFO.company}</div>
    <div class="purchase-order-party__row">주소: ${BUYER_INFO.address}</div>
    <div class="purchase-order-party__row">담당자: ${BUYER_INFO.contact}</div>
    <div class="purchase-order-party__row">사업자 등록번호: ${BUYER_INFO.businessRegNumber}</div>
  `;

  const titleBlock = document.createElement("div");
  titleBlock.className = "purchase-order-title-block";
  titleBlock.innerHTML = `
    <h2 class="purchase-order-title">발 주 서</h2>
    <p class="purchase-order-subtitle">아래와 같이 요청 드립니다.</p>
  `;

  const supplierBlock = document.createElement("div");
  supplierBlock.className = "purchase-order-party purchase-order-party--supplier";
  const sName =
    (supplier && (supplier.formal_name || supplier.name)) || "(공급자 미지정)";
  const sAddress =
    (supplier && supplier.business_address) || "(주소 미지정)";
  const sContact =
    (supplier && supplier.contact_person) || "(담당자 미지정)";
  const sReg =
    (supplier && supplier.business_registration_number) ||
    "(사업자등록번호 미지정)";
  // 2025-02 UX: mirror the 공급받는자 block layout — company / 주소 /
  // 담당자 / 사업자등록번호 four rows.  Previously the 공급자 side was
  // missing the address line even though the supplier record already
  // carried ``business_address``.
  supplierBlock.innerHTML = `
    <div class="purchase-order-party__label">공급자</div>
    <div class="purchase-order-party__company">${sName}</div>
    <div class="purchase-order-party__row">주소: ${sAddress}</div>
    <div class="purchase-order-party__row">담당자: ${sContact}</div>
    <div class="purchase-order-party__row">사업자등록번호: ${sReg}</div>
  `;

  topRow.append(buyerBlock, titleBlock, supplierBlock);
  docBody.appendChild(topRow);

  // ── Item table ─────────────────────────────────────────────────────
  const tableWrap = document.createElement("div");
  tableWrap.className = "purchase-order-table-wrap";

  const table = document.createElement("table");
  table.className = "purchase-order-table";
  table.innerHTML = `
    <thead>
      <tr>
        <th class="col-idx">순번</th>
        <th class="col-item">품목명</th>
        <th class="col-price">단가(원)</th>
        <th class="col-qty">수량</th>
        <th class="col-total">공급가액</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;
  const tbody = table.querySelector("tbody");

  // Track per-row output cell so recompute() can update in place.
  const rowOutputs = [];
  const priceInputs = [];
  const qtyInputs = [];
  const itemInputs = [];

  for (let i = 0; i < MAX_LINE_COUNT; i += 1) {
    const tr = document.createElement("tr");
    tr.className = "purchase-order-row";

    const idxCell = document.createElement("td");
    idxCell.className = "col-idx";
    idxCell.textContent = String(i + 1);
    tr.appendChild(idxCell);

    // 품목명 — free text.
    const itemCell = document.createElement("td");
    itemCell.className = "col-item";
    const itemInput = document.createElement("input");
    itemInput.type = "text";
    itemInput.className = "purchase-order-input purchase-order-input--item";
    itemInput.value = state.lines[i].itemName;
    itemInput.setAttribute("aria-label", `${i + 1}번 품목명`);
    itemInput.addEventListener("input", () => {
      state.lines[i].itemName = itemInput.value;
    });
    itemInputs.push(itemInput);
    itemCell.appendChild(itemInput);
    tr.appendChild(itemCell);

    // 단가 — numeric text input with thousand-separator + 1-decimal
    // formatting on blur.  The stored state is a raw number; the
    // display value is the formatted string.  Focusing the input
    // swaps in an unformatted raw string so the user can edit smoothly
    // without fighting cursor placement inside commas.
    const priceCell = document.createElement("td");
    priceCell.className = "col-price";
    const priceInput = document.createElement("input");
    priceInput.type = "text";
    priceInput.inputMode = "decimal";
    priceInput.className =
      "purchase-order-input purchase-order-input--num";
    // Empty rows (unitPrice === 0) render as a blank input, NOT "0.0",
    // so the printed / on-screen document reads clean when the operator
    // only bought e.g. 8 of the 12 slots.  A row with a positive price
    // still shows the ko-KR 1-decimal format ("1,500.0") on blur.
    priceInput.value =
      state.lines[i].unitPrice > 0
        ? fmtPrice(state.lines[i].unitPrice)
        : "";
    priceInput.setAttribute("aria-label", `${i + 1}번 단가`);
    priceInput.addEventListener("focus", () => {
      // Show raw (comma-free) numeric string during editing.
      const raw = state.lines[i].unitPrice;
      priceInput.value = raw > 0 ? String(raw) : "";
    });
    priceInput.addEventListener("input", () => {
      state.lines[i].unitPrice = parsePriceInput(priceInput.value);
      recompute();
    });
    priceInput.addEventListener("blur", () => {
      // On blur, restore the formatted display — but keep it blank when
      // the value is 0 so the empty-row invariant survives round-trips.
      priceInput.value =
        state.lines[i].unitPrice > 0
          ? fmtPrice(state.lines[i].unitPrice)
          : "";
    });
    priceInputs.push(priceInput);
    priceCell.appendChild(priceInput);
    tr.appendChild(priceCell);

    // 수량 — numeric text input.
    const qtyCell = document.createElement("td");
    qtyCell.className = "col-qty";
    const qtyInput = document.createElement("input");
    qtyInput.type = "text";
    qtyInput.inputMode = "numeric";
    qtyInput.className =
      "purchase-order-input purchase-order-input--num";
    qtyInput.value =
      state.lines[i].quantity > 0 ? String(state.lines[i].quantity) : "";
    qtyInput.setAttribute("aria-label", `${i + 1}번 수량`);
    qtyInput.addEventListener("input", () => {
      state.lines[i].quantity = parseNumericInput(qtyInput.value);
      recompute();
    });
    qtyInputs.push(qtyInput);
    qtyCell.appendChild(qtyInput);
    tr.appendChild(qtyCell);

    // 공급가액 — read-only computed.  Empty rows render as blank text
    // (not "0") so the document doesn't clutter the printed page with
    // zero-value lines when the operator bought fewer than 12 items.
    const totalCell = document.createElement("td");
    totalCell.className = "col-total";
    {
      const initTotal = state.lines[i].unitPrice * state.lines[i].quantity;
      totalCell.textContent = initTotal > 0 ? fmtNumber(initTotal) : "";
    }
    rowOutputs.push(totalCell);
    tr.appendChild(totalCell);

    tbody.appendChild(tr);
  }

  tableWrap.appendChild(table);
  docBody.appendChild(tableWrap);

  // ── Totals block ───────────────────────────────────────────────────
  const totalsWrap = document.createElement("div");
  totalsWrap.className = "purchase-order-totals";
  totalsWrap.innerHTML = `
    <div class="purchase-order-totals__row">
      <span class="purchase-order-totals__label">총 공급가액</span>
      <span class="purchase-order-totals__value" data-role="subtotal">₩ 0</span>
    </div>
    <div class="purchase-order-totals__row">
      <span class="purchase-order-totals__label">부가세 (10%)</span>
      <span class="purchase-order-totals__value" data-role="vat">₩ 0</span>
    </div>
    <div class="purchase-order-totals__row purchase-order-totals__row--grand">
      <span class="purchase-order-totals__label">총 계</span>
      <span class="purchase-order-totals__value" data-role="grand">₩ 0</span>
    </div>
  `;
  const subtotalCell = totalsWrap.querySelector('[data-role="subtotal"]');
  const vatCell = totalsWrap.querySelector('[data-role="vat"]');
  const grandCell = totalsWrap.querySelector('[data-role="grand"]');
  docBody.appendChild(totalsWrap);

  // ── Footer (formal signature block) ─────────────────────────────────
  const footerBlock = document.createElement("div");
  footerBlock.className = "purchase-order-footer";
  footerBlock.innerHTML = `
    <div class="purchase-order-footer__signature">
      <div class="purchase-order-footer__company">${BUYER_INFO.company}</div>
      <div class="purchase-order-footer__rep">
        대표이사 ${BUYER_INFO.representative}
        <span class="purchase-order-footer__seal">(인)</span>
      </div>
    </div>
    <div class="purchase-order-footer__date">
      발주일자: ${todayIsoDate()}
    </div>
  `;
  docBody.appendChild(footerBlock);

  panel.appendChild(docBody);

  // ── Action bar (below the document, hidden on print) ───────────────
  const actions = document.createElement("div");
  actions.className = "purchase-order-actions";

  const saveBtn = document.createElement("button");
  saveBtn.type = "button";
  saveBtn.className = "btn btn--primary purchase-order-action-btn";
  saveBtn.textContent = "저장";
  saveBtn.addEventListener("click", () => {
    // Stub: persistence layer TBD.  Just toast so the operator gets
    // feedback that the button is wired up.
    showToast("발주서를 저장했습니다 (임시)", "info");
  });

  const printBtn = document.createElement("button");
  printBtn.type = "button";
  printBtn.className = "btn btn--secondary purchase-order-action-btn";
  printBtn.textContent = "인쇄";
  printBtn.addEventListener("click", () => {
    // The @media print CSS in purchase_order_modal.css hides everything
    // except the .purchase-order-doc so the printed page is a clean A4.
    window.print();
  });

  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.className = "btn btn--secondary purchase-order-action-btn";
  closeBtn.textContent = "닫기";
  closeBtn.addEventListener("click", () => requestClose());

  actions.append(saveBtn, printBtn, closeBtn);
  panel.appendChild(actions);

  backdrop.appendChild(panel);
  portal.appendChild(backdrop);

  // ── Fade in ────────────────────────────────────────────────────────
  backdrop.classList.add("is-entering");
  requestAnimationFrame(() => {
    backdrop.classList.remove("is-entering");
    backdrop.classList.add("is-open");
    recompute();
  });

  // ── Totals recomputation (fires on every numeric input change) ─────
  function recompute() {
    let subtotal = 0;
    for (let i = 0; i < MAX_LINE_COUNT; i += 1) {
      const line = state.lines[i];
      const rowTotal = line.unitPrice * line.quantity;
      // Empty row → leave cell blank rather than showing "0".  The row
      // is "empty" when the product is zero (either price or quantity
      // is zero), which naturally captures the "no purchase this line"
      // case regardless of which side the operator has typed into.
      rowOutputs[i].textContent = rowTotal > 0 ? fmtNumber(rowTotal) : "";
      subtotal += rowTotal;
    }
    const vat = subtotal * VAT_RATE;
    const grand = subtotal + vat;
    subtotalCell.textContent = fmtCurrency(subtotal);
    vatCell.textContent = fmtCurrency(vat);
    grandCell.textContent = fmtCurrency(grand);
  }

  // ── Close / fade-out ───────────────────────────────────────────────
  let closing = false;

  function fadeOutAndDestroy() {
    if (closing) return;
    closing = true;
    backdrop.classList.remove("is-open");
    backdrop.classList.add("is-leaving");
    window.setTimeout(() => {
      backdrop.remove();
      document.removeEventListener("keydown", onKeydown, true);
    }, fadeMs);
  }

  function requestClose() {
    fadeOutAndDestroy();
  }

  function onKeydown(ev) {
    if (ev.key === "Escape") {
      ev.preventDefault();
      ev.stopPropagation();
      requestClose();
    }
  }
  document.addEventListener("keydown", onKeydown, true);

  backdrop.addEventListener("click", (ev) => {
    // Backdrop click closes — but ignore clicks inside the panel.
    if (ev.target === backdrop) requestClose();
  });

  return {
    close: requestClose,
  };
}
