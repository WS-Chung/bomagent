// =============================================================================
// receiving_modal.js — Receiving (입고) modal with mode toggle
// -----------------------------------------------------------------------------
// Source: design.md §10.1 (공통 모달 사양), §10.2 ReceivingModal,
//         §9.5 ReceivingModal 와이어프레임
// Validates: Requirements 4.7, 5.1, 5.2, 5.3, 5.6, 5.7, 6.1, 6.2, 6.3, 6.5,
//            7.1, 7.13, 7.14, 18.7
//
// State machine (design §10.2):
//
//   CLOSED ──open──▶ OPEN_EXISTING ◀──toggle──▶ OPEN_NEW
//                        │                          │
//                        └─── submit ────► SUBMITTING (저장 disabled)
//                                          │
//                                          ├─ 2xx ──▶ CLOSED + emit "parts:changed"
//                                          └─ 4xx ──▶ OPEN_EXISTING / OPEN_NEW
//                                                     (값 유지 + 오류 표시)
//
// 2025-02 UX fix batch — three consolidations:
//   * Issue 1a — 수량 / 매입단가 fields use ``type="text" + inputMode``
//     instead of ``type="number"``.  This removes the browser's up/down
//     spinner chrome (which trips the finger + confuses touchpad users)
//     while keeping the mobile numeric keyboard hint via inputMode.
//     Validation on commit is unchanged: parseInt / parseFloat with the
//     same rejection toast the ProductionPlanPage cell uses.
//   * Issue 1b — the (공급사 / 분류 / 제조사) dropdowns run with
//     ``allowClear: true`` so "(선택 안 함)" is the first visible +
//     selectable option, existing rows are the middle options, and
//     "+ 신규 추가" is the last option (as before).  Selecting
//     "(선택 안 함)" reverts the field to null on the wire — useful for
//     the optional class/manufacturer/supplier fields.
//   * Issue 1c — 수량 / 매입단가 / 입고일자 / 공급사 are the SAME
//     regardless of mode, so they live in a single ``commonForm``
//     section below the mode-specific forms.  Mode-specific fields
//     (part search vs class/self_pn/mfr_pn/...) live in their own
//     forms which are toggled via ``hidden``.
// =============================================================================

import { createDropdown } from "/static/components/dropdown.js";

// ── State machine constants ─────────────────────────────────────────────
const STATE = Object.freeze({
  CLOSED: "CLOSED",
  OPEN_EXISTING: "OPEN_EXISTING",
  OPEN_NEW: "OPEN_NEW",
  SUBMITTING: "SUBMITTING",
});

// ── Constants & helpers ────────────────────────────────────────────────
const PART_SEARCH_DEBOUNCE_MS = 250;

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
 * Fetch wrapper that throws a structured Error on non-2xx so the caller
 * can branch on .status / .code / .details (same shape as edit_part_modal
 * + inventory page helpers — keep these in sync).
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

function todayIso() {
  // Format today's date as YYYY-MM-DD in the local timezone — the server
  // compares against date.today() which is also local, so we must not use
  // toISOString() (UTC).
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

// =============================================================================
// openReceivingModal — public entry
// -----------------------------------------------------------------------------
// Caller:
//   openReceivingModal({
//     onSaved: (response) => { ... },   // 201 with { receiving_id, part }
//     onClosed: () => { ... },          // fade-out finished (any path)
//   });
//
// Returns:
//   { close: () => void }  — programmatic close (used by hashchange etc.)
// =============================================================================
export function openReceivingModal(opts = {}) {
  const onSaved = typeof opts.onSaved === "function" ? opts.onSaved : null;
  const onClosed = typeof opts.onClosed === "function" ? opts.onClosed : null;

  const fadeMs = resolveFadeDurationMs();
  const portal = document.getElementById("modal-portal") || document.body;

  // ── Internal state ────────────────────────────────────────────────────
  let machineState = STATE.OPEN_EXISTING;

  // Common fields (수량 / 매입단가 / 입고일자 / 공급사) — the same values
  // apply regardless of mode.  Consolidated here in 2025-02 to remove the
  // duplicate rendering the user reported in Issue 1c.
  const commonState = {
    quantity: "",
    unitPrice: "",
    receivedDate: todayIso(),
    supplierId: null,
  };

  // Mode-specific state — cleared on mode switch would surprise the user,
  // so we preserve values across toggles.
  const existingState = {
    selectedPart: null, // PartOut object
  };
  const newState = {
    classId: null,
    classPrefix: null,
    selfPartNumber: "",
    selfPartNumberUserEdited: false,
    mfrPartNumber: "",
    cadPartname: "",
    value: "",
    pkg: "",
    ltWeeks: "",
    moq: "",
    manufacturerId: null,
    description: "",
  };

  // ── DOM scaffold (modal common shell) ─────────────────────────────────
  const backdrop = document.createElement("div");
  backdrop.className = "modal__backdrop";

  const panel = document.createElement("div");
  panel.className = "modal__panel modal__panel--receiving";
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-modal", "true");
  panel.setAttribute("aria-label", "입고");

  // Header
  const header = document.createElement("header");
  header.className = "modal__header";
  const title = document.createElement("h2");
  title.className = "modal__title";
  title.textContent = "입고";
  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.className = "modal__close";
  closeBtn.setAttribute("aria-label", "닫기");
  closeBtn.innerHTML = "&times;";
  header.append(title, closeBtn);

  // Body
  const body = document.createElement("div");
  body.className = "modal__body";

  // Mode toggle (radio-style tabs)
  const toggle = document.createElement("div");
  toggle.className = "receiving-mode-toggle";
  toggle.setAttribute("role", "tablist");
  toggle.setAttribute("aria-label", "입고 모드");

  const tabExisting = document.createElement("button");
  tabExisting.type = "button";
  tabExisting.className = "receiving-mode-toggle__tab is-active";
  tabExisting.dataset.mode = "existing";
  tabExisting.setAttribute("role", "tab");
  tabExisting.setAttribute("aria-selected", "true");
  tabExisting.textContent = "기존 부품";

  const tabNew = document.createElement("button");
  tabNew.type = "button";
  tabNew.className = "receiving-mode-toggle__tab";
  tabNew.dataset.mode = "new";
  tabNew.setAttribute("role", "tab");
  tabNew.setAttribute("aria-selected", "false");
  tabNew.textContent = "신규 부품";

  toggle.append(tabExisting, tabNew);
  body.appendChild(toggle);

  // Per-mode form containers — each holds ONLY the fields that differ
  // between modes.  Common fields (quantity, unit_price, received_date,
  // supplier) live in ``commonForm`` below.
  const existingForm = document.createElement("form");
  existingForm.className = "receiving-form receiving-form--existing";
  existingForm.setAttribute("novalidate", "true");

  const newForm = document.createElement("form");
  newForm.className = "receiving-form receiving-form--new";
  newForm.setAttribute("novalidate", "true");
  newForm.hidden = true;

  // Common form — always visible regardless of mode.
  const commonForm = document.createElement("form");
  commonForm.className = "receiving-form receiving-form--common";
  commonForm.setAttribute("novalidate", "true");

  body.append(existingForm, newForm, commonForm);

  // Footer
  const footer = document.createElement("footer");
  footer.className = "modal__footer";

  const formError = document.createElement("div");
  formError.className = "modal__form-error";
  formError.hidden = true;
  formError.setAttribute("role", "alert");

  const cancelBtn = document.createElement("button");
  cancelBtn.type = "button";
  cancelBtn.className = "btn btn--secondary";
  cancelBtn.textContent = "취소";

  const saveBtn = document.createElement("button");
  saveBtn.type = "button";
  saveBtn.className = "btn btn--primary";
  saveBtn.textContent = "저장";

  footer.append(formError, cancelBtn, saveBtn);
  panel.append(header, body, footer);
  backdrop.appendChild(panel);
  portal.appendChild(backdrop);

  // ── Form-building helpers ─────────────────────────────────────────────
  /**
   * Build a labelled row (form-row) and append it to `parent`.
   * Returns { wrap, errEl } so the caller can attach interactions and
   * surface field-level errors.
   */
  function appendRow(parent, labelText, contentEl, fieldKey) {
    const wrap = document.createElement("div");
    wrap.className = "form-row";
    if (fieldKey) wrap.dataset.field = fieldKey;
    const lbl = document.createElement("label");
    lbl.className = "form-row__label";
    lbl.textContent = labelText;
    const errEl = document.createElement("span");
    errEl.className = "form-row__error";
    errEl.hidden = true;
    errEl.setAttribute("role", "alert");
    wrap.append(lbl, contentEl, errEl);
    parent.appendChild(wrap);
    return { wrap, errEl };
  }

  // ── Existing-mode form ────────────────────────────────────────────────
  // PartPicker: search input + result list. Selecting a row sets
  // existingState.selectedPart and enables [저장].
  const partPickerWrap = document.createElement("div");
  partPickerWrap.className = "part-picker";

  const partSearchInput = document.createElement("input");
  partSearchInput.type = "search";
  partSearchInput.className = "form-control part-picker__input";
  partSearchInput.placeholder = "🔍 자체PN 또는 MfrPN 검색";
  partSearchInput.setAttribute("aria-label", "부품 검색");

  const partResultList = document.createElement("ul");
  partResultList.className = "part-picker__results";
  partResultList.hidden = true;

  const partSelectedLabel = document.createElement("div");
  partSelectedLabel.className = "part-picker__selected";
  partSelectedLabel.hidden = true;

  partPickerWrap.append(partSearchInput, partResultList, partSelectedLabel);
  appendRow(existingForm, "부품 검색", partPickerWrap, "part_id");

  // ── New-mode form (part-master fields only) ──────────────────────────
  const newClassSlot = document.createElement("div");
  newClassSlot.className = "dropdown-slot";
  appendRow(newForm, "분류", newClassSlot, "class_id");

  const newSpnInput = document.createElement("input");
  newSpnInput.type = "text";
  newSpnInput.maxLength = 8;
  newSpnInput.className = "form-control";
  newSpnInput.placeholder = "분류 선택 시 자동 채번";
  newSpnInput.autocomplete = "off";
  appendRow(newForm, "자체PN", newSpnInput, "self_part_number");

  const newMfrPnInput = document.createElement("input");
  newMfrPnInput.type = "text";
  newMfrPnInput.maxLength = 200;
  newMfrPnInput.className = "form-control";
  appendRow(newForm, "MfrPN", newMfrPnInput, "mfr_part_number");

  const newCadInput = document.createElement("input");
  newCadInput.type = "text";
  newCadInput.maxLength = 200;
  newCadInput.className = "form-control";
  appendRow(newForm, "CAD Partname", newCadInput, "cad_partname");

  const newValueInput = document.createElement("input");
  newValueInput.type = "text";
  newValueInput.maxLength = 100;
  newValueInput.className = "form-control";
  appendRow(newForm, "Value", newValueInput, "value");

  const newPkgInput = document.createElement("input");
  newPkgInput.type = "text";
  newPkgInput.maxLength = 100;
  newPkgInput.className = "form-control";
  appendRow(newForm, "Package", newPkgInput, "package");

  // Issue 1a — L/T and MOQ also drop the browser's up/down spinner.
  // The commit-time parseInt handles validation.
  const newLtInput = document.createElement("input");
  newLtInput.type = "text";
  newLtInput.inputMode = "numeric";
  newLtInput.pattern = "[0-9]*";
  newLtInput.className = "form-control";
  appendRow(newForm, "L/T (주)", newLtInput, "lt_weeks");

  const newMoqInput = document.createElement("input");
  newMoqInput.type = "text";
  newMoqInput.inputMode = "numeric";
  newMoqInput.pattern = "[0-9]*";
  newMoqInput.className = "form-control";
  appendRow(newForm, "MOQ", newMoqInput, "moq");

  const newManufacturerSlot = document.createElement("div");
  newManufacturerSlot.className = "dropdown-slot";
  appendRow(newForm, "제조사", newManufacturerSlot, "manufacturer_id");

  // ── Common form (수량 / 매입단가 / 입고일자 / 공급사) ─────────────────
  // Issue 1a — quantity / unit_price switch to type="text" + inputMode so
  // the browser stops rendering the up/down spinner chrome that the user
  // reported.  Commit-time validation with parseInt / parseFloat mirrors
  // the ProductionPlanPage cell edit path.
  const quantityInput = document.createElement("input");
  quantityInput.type = "text";
  quantityInput.inputMode = "numeric";
  quantityInput.pattern = "[0-9]*";
  quantityInput.className = "form-control";
  quantityInput.name = "quantity";
  quantityInput.autocomplete = "off";
  appendRow(commonForm, "수량", quantityInput, "quantity");

  const unitPriceInput = document.createElement("input");
  unitPriceInput.type = "text";
  unitPriceInput.inputMode = "decimal";
  unitPriceInput.className = "form-control";
  unitPriceInput.name = "unit_price";
  unitPriceInput.autocomplete = "off";
  appendRow(commonForm, "매입단가", unitPriceInput, "unit_price");

  const receivedDateInput = document.createElement("input");
  receivedDateInput.type = "date";
  receivedDateInput.className = "form-control";
  receivedDateInput.value = commonState.receivedDate;
  receivedDateInput.max = todayIso(); // hint to the picker (server still enforces)
  appendRow(commonForm, "입고일자", receivedDateInput, "received_date");

  const supplierSlot = document.createElement("div");
  supplierSlot.className = "dropdown-slot";
  appendRow(commonForm, "공급사", supplierSlot, "supplier_id");

  // ── Dropdown instances (need to be created after slots exist) ─────────
  // Common supplier dropdown — one instance across both modes so the
  // user's selection carries over on toggle.  ``allowClear: true`` +
  // placeholder "(선택 안 함)" gives users a way to un-choose.
  const supplierDropdown = createDropdown({
    options: [],
    value: null,
    placeholder: "(선택 안 함)",
    allowClear: true,
    ariaLabel: "공급사",
    onChange: (id) => {
      commonState.supplierId = id;
    },
    onCreate: async (name) => {
      const created = await apiFetch("/api/suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      return { id: created.id, label: created.name };
    },
  });
  supplierSlot.replaceWith(supplierDropdown.el);

  // New-mode class dropdown
  let classOptions = []; // [{id, label, prefix}]
  const classDropdown = createDropdown({
    options: [],
    value: null,
    placeholder: "(선택 안 함)",
    allowClear: true,
    ariaLabel: "분류",
    onChange: (id) => {
      newState.classId = id;
      // Look up prefix from the cached options list.
      const match = classOptions.find((o) => o.id === id);
      newState.classPrefix = match ? match.prefix : null;
      // Auto-fill self_part_number ONLY when the user has not edited it.
      if (!newState.selfPartNumberUserEdited && newState.classPrefix) {
        autoFillSelfPartNumber(newState.classPrefix);
      }
    },
    onCreate: async (name) => {
      // The class entity requires both name + 2-letter prefix. We surface
      // a window.prompt for the prefix — a future task may swap this for
      // a 2-field inline form, but this matches the inline pattern used
      // in edit_part_modal.js today.
      const prefix = window.prompt(
        "신규 분류 Prefix (영문 대문자 2자):",
        "",
      );
      if (!prefix) throw new Error("Prefix 입력이 취소되었습니다");
      const created = await apiFetch("/api/part-classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, prefix }),
      });
      const opt = {
        id: created.id,
        label: `${created.name} (${created.prefix})`,
        prefix: created.prefix,
      };
      classOptions.push(opt);
      return { id: created.id, label: opt.label };
    },
  });
  newClassSlot.replaceWith(classDropdown.el);

  // New-mode manufacturer dropdown
  const manufacturerDropdown = createDropdown({
    options: [],
    value: null,
    placeholder: "(선택 안 함)",
    allowClear: true,
    ariaLabel: "제조사",
    onChange: (id) => {
      newState.manufacturerId = id;
    },
    onCreate: async (name) => {
      const created = await apiFetch("/api/manufacturers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      return { id: created.id, label: created.name };
    },
  });
  newManufacturerSlot.replaceWith(manufacturerDropdown.el);

  // ── Initial fetches for dropdown options ──────────────────────────────
  // Bug fix (2025-02): pre-fix, this was ``loadDropdownOptions()`` fired
  // and forgotten immediately before the modal fade-in.  When the JSON
  // arrived AFTER the user had already clicked open a dropdown (racing
  // paint against a slow fetch) they saw only "(선택 안 함)" / "──────" /
  // "+ 신규 추가", not the 9 suppliers / 12 classes / 24 manufacturers the
  // server actually held.  The fix is to await ``loadDropdownOptions``
  // BEFORE fading in — so by the time the user can see the panel, every
  // dropdown is fully populated.
  //
  // A silent catch here also masked the failure completely; we now
  // re-throw so the outer initModal().catch(...) is the ONE place that
  // decides "fade in anyway", which keeps the modal usable even if the
  // network hiccups but stops swallowing bugs entirely.
  async function loadDropdownOptions() {
    try {
      const [classes, mfrs, sups] = await Promise.all([
        apiFetch("/api/part-classes"),
        apiFetch("/api/manufacturers"),
        apiFetch("/api/suppliers"),
      ]);
      classOptions = (classes || []).map((c) => ({
        id: c.id,
        label: `${c.name} (${c.prefix})`,
        prefix: c.prefix,
      }));
      classDropdown.setOptions(
        classOptions.map((o) => ({ id: o.id, label: o.label })),
      );
      const mfrOpts = (mfrs || []).map((m) => ({ id: m.id, label: m.name }));
      manufacturerDropdown.setOptions(mfrOpts);
      const supOpts = (sups || []).map((s) => ({ id: s.id, label: s.name }));
      supplierDropdown.setOptions(supOpts);

      // Sanity check — if any dropdown got detached from the DOM before
      // we set its options, surface a warning so the smoking-gun path is
      // visible during development.  The .el reference is stable across
      // slot.replaceWith() so this should always pass; if it ever fires
      // we've found a real DOM lifecycle bug worth investigating.
      if (!document.contains(classDropdown.el)) {
        // eslint-disable-next-line no-console
        console.error(
          "[receiving_modal] classDropdown.el detached before setOptions",
        );
      }
      if (!document.contains(manufacturerDropdown.el)) {
        // eslint-disable-next-line no-console
        console.error(
          "[receiving_modal] manufacturerDropdown.el detached before setOptions",
        );
      }
      if (!document.contains(supplierDropdown.el)) {
        // eslint-disable-next-line no-console
        console.error(
          "[receiving_modal] supplierDropdown.el detached before setOptions",
        );
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn(
        "[receiving_modal] failed to load dropdown options:",
        err,
      );
      // Re-throw so the caller (initModal) can decide whether to still
      // reveal the modal — the user can create entries via the inline
      // "+ 신규 추가" affordance even without seeded options.
      throw err;
    }
  }

  // ── Auto-fill self_part_number on class change ─────────────────────────
  async function autoFillSelfPartNumber(prefix) {
    try {
      const resp = await apiFetch(
        `/api/parts/next-number?prefix=${encodeURIComponent(prefix)}`,
      );
      // Re-check the user-edited flag in case the user typed during the
      // async window — never overwrite their input.
      if (!newState.selfPartNumberUserEdited && resp && resp.next) {
        newSpnInput.value = resp.next;
        newState.selfPartNumber = resp.next;
      }
    } catch {
      // Silent — channel will retry on next class change. Leaving the
      // field empty surfaces the standard validation message at submit.
    }
  }

  // Mark user-edit on real keyboard input so subsequent class changes
  // never clobber the typed value.
  newSpnInput.addEventListener("input", () => {
    newState.selfPartNumberUserEdited = newSpnInput.value.length > 0;
    newState.selfPartNumber = newSpnInput.value;
  });

  // ── PartPicker behaviour ──────────────────────────────────────────────
  const debouncedSearch = debounce(runPartSearch, PART_SEARCH_DEBOUNCE_MS);

  async function runPartSearch() {
    const q = partSearchInput.value.trim();
    if (q.length === 0) {
      partResultList.hidden = true;
      partResultList.innerHTML = "";
      return;
    }
    try {
      const params = new URLSearchParams();
      params.set("q", q);
      params.set("limit", "20");
      const data = await apiFetch(`/api/parts?${params.toString()}`);
      renderPartResults(Array.isArray(data.items) ? data.items : []);
    } catch (err) {
      renderPartError(err && err.message ? err.message : "검색 실패");
    }
  }

  function renderPartResults(items) {
    partResultList.innerHTML = "";
    if (items.length === 0) {
      const li = document.createElement("li");
      li.className = "part-picker__result part-picker__result--empty";
      li.textContent = "검색 결과 없음";
      partResultList.appendChild(li);
      partResultList.hidden = false;
      return;
    }
    for (const item of items) {
      const li = document.createElement("li");
      li.className = "part-picker__result";
      li.tabIndex = 0;
      li.dataset.partId = String(item.id);
      const cad = item.cad_partname ? ` (${item.cad_partname})` : "";
      li.textContent = `${item.self_part_number} — ${item.mfr_part_number}${cad}`;
      li.addEventListener("click", () => selectPart(item));
      li.addEventListener("keydown", (ev) => {
        if (ev.key === "Enter" || ev.key === " ") {
          ev.preventDefault();
          selectPart(item);
        }
      });
      partResultList.appendChild(li);
    }
    partResultList.hidden = false;
  }

  function renderPartError(msg) {
    partResultList.innerHTML = "";
    const li = document.createElement("li");
    li.className = "part-picker__result part-picker__result--error";
    li.textContent = msg;
    partResultList.appendChild(li);
    partResultList.hidden = false;
  }

  function selectPart(part) {
    existingState.selectedPart = part;
    partSearchInput.value = "";
    partResultList.hidden = true;
    partResultList.innerHTML = "";
    const cad = part.cad_partname ? ` (${part.cad_partname})` : "";
    partSelectedLabel.textContent = `선택됨: ${part.self_part_number} — ${part.mfr_part_number}${cad}`;
    partSelectedLabel.hidden = false;
    // Pre-fill price + supplier from the selected part's current values
    // when the user has not already typed something — this matches the
    // common case (재입고 시 같은 단가/공급사).
    if (unitPriceInput.value === "") {
      unitPriceInput.value =
        part.unit_price !== null && part.unit_price !== undefined
          ? String(part.unit_price)
          : "";
      commonState.unitPrice = unitPriceInput.value;
    }
    if (commonState.supplierId === null && part.supplier) {
      supplierDropdown.setValue(part.supplier.id);
      commonState.supplierId = part.supplier.id;
    }
    updateSaveButtonState();
  }

  partSearchInput.addEventListener("input", () => {
    debouncedSearch();
  });

  // ── Wire input changes to state ───────────────────────────────────────
  quantityInput.addEventListener("input", () => {
    commonState.quantity = quantityInput.value;
    updateSaveButtonState();
  });
  unitPriceInput.addEventListener("input", () => {
    commonState.unitPrice = unitPriceInput.value;
    updateSaveButtonState();
  });
  receivedDateInput.addEventListener("input", () => {
    commonState.receivedDate = receivedDateInput.value;
  });

  newMfrPnInput.addEventListener("input", () => {
    newState.mfrPartNumber = newMfrPnInput.value;
    updateSaveButtonState();
  });
  newCadInput.addEventListener("input", () => {
    newState.cadPartname = newCadInput.value;
  });
  newValueInput.addEventListener("input", () => {
    newState.value = newValueInput.value;
  });
  newPkgInput.addEventListener("input", () => {
    newState.pkg = newPkgInput.value;
  });
  newLtInput.addEventListener("input", () => {
    newState.ltWeeks = newLtInput.value;
  });
  newMoqInput.addEventListener("input", () => {
    newState.moq = newMoqInput.value;
  });

  // ── Mode toggle handlers ──────────────────────────────────────────────
  function setMode(nextMode) {
    if (machineState === STATE.SUBMITTING) return;
    clearFieldErrors();
    if (nextMode === "existing") {
      machineState = STATE.OPEN_EXISTING;
      tabExisting.classList.add("is-active");
      tabExisting.setAttribute("aria-selected", "true");
      tabNew.classList.remove("is-active");
      tabNew.setAttribute("aria-selected", "false");
      existingForm.hidden = false;
      newForm.hidden = true;
    } else {
      machineState = STATE.OPEN_NEW;
      tabNew.classList.add("is-active");
      tabNew.setAttribute("aria-selected", "true");
      tabExisting.classList.remove("is-active");
      tabExisting.setAttribute("aria-selected", "false");
      newForm.hidden = false;
      existingForm.hidden = true;
    }
    updateSaveButtonState();
  }

  tabExisting.addEventListener("click", () => setMode("existing"));
  tabNew.addEventListener("click", () => setMode("new"));

  // ── Save-button gating ────────────────────────────────────────────────
  function updateSaveButtonState() {
    if (machineState === STATE.SUBMITTING) {
      saveBtn.disabled = true;
      return;
    }
    const commonOk =
      commonState.quantity !== "" && commonState.unitPrice !== "";
    if (machineState === STATE.OPEN_EXISTING) {
      const ok = existingState.selectedPart !== null && commonOk;
      saveBtn.disabled = !ok;
      return;
    }
    if (machineState === STATE.OPEN_NEW) {
      const ok =
        newSpnInput.value.trim().length > 0 &&
        newState.mfrPartNumber.trim().length > 0 &&
        newState.classId !== null &&
        commonOk;
      saveBtn.disabled = !ok;
      return;
    }
    saveBtn.disabled = true;
  }

  updateSaveButtonState();

  // ── Field-error helpers ───────────────────────────────────────────────
  function clearFieldErrors() {
    formError.hidden = true;
    formError.textContent = "";
    panel.querySelectorAll(".form-row__error").forEach((el) => {
      el.hidden = true;
      el.textContent = "";
    });
    panel
      .querySelectorAll(".form-row.is-invalid")
      .forEach((el) => el.classList.remove("is-invalid"));
  }

  function showFieldError(fieldKey, message) {
    // Look up the row inside the currently-visible form first, then in
    // the always-visible common form, then panel-wide as a last resort.
    const activeForm =
      machineState === STATE.OPEN_NEW ? newForm : existingForm;
    let row =
      activeForm.querySelector(`.form-row[data-field="${fieldKey}"]`) ||
      commonForm.querySelector(`.form-row[data-field="${fieldKey}"]`);
    if (!row) {
      row = panel.querySelector(`.form-row[data-field="${fieldKey}"]`);
    }
    if (!row) {
      showGlobalError(message);
      return;
    }
    row.classList.add("is-invalid");
    const errEl = row.querySelector(".form-row__error");
    if (errEl) {
      errEl.textContent = message;
      errEl.hidden = false;
    }
  }

  function showGlobalError(message) {
    formError.textContent = message;
    formError.hidden = false;
  }

  // ── Submit ────────────────────────────────────────────────────────────
  async function submit() {
    clearFieldErrors();
    const prevState = machineState;
    machineState = STATE.SUBMITTING;
    saveBtn.disabled = true;
    cancelBtn.disabled = true;

    // Issue 1a — parse the type=text inputs at commit time.  Reject
    // non-integer quantity and non-finite unit_price with a field-level
    // error and roll the state back so the user can fix + retry.
    const quantityParsed = parseInt(commonState.quantity, 10);
    if (
      !Number.isFinite(quantityParsed) ||
      !Number.isInteger(quantityParsed) ||
      quantityParsed < 1
    ) {
      machineState = prevState;
      cancelBtn.disabled = false;
      updateSaveButtonState();
      showFieldError("quantity", "수량은 1 이상의 정수여야 합니다");
      return;
    }
    const unitPriceParsed = parseFloat(commonState.unitPrice);
    if (!Number.isFinite(unitPriceParsed) || unitPriceParsed < 0) {
      machineState = prevState;
      cancelBtn.disabled = false;
      updateSaveButtonState();
      showFieldError("unit_price", "매입단가는 0 이상이어야 합니다");
      return;
    }

    let payload;
    if (prevState === STATE.OPEN_EXISTING) {
      if (!existingState.selectedPart) {
        // Defensive — updateSaveButtonState should already keep this off.
        machineState = STATE.OPEN_EXISTING;
        saveBtn.disabled = false;
        cancelBtn.disabled = false;
        showGlobalError("부품을 선택하세요");
        return;
      }
      payload = {
        mode: "existing",
        part_id: existingState.selectedPart.id,
        quantity: quantityParsed,
        unit_price: unitPriceParsed,
        received_date: commonState.receivedDate,
        supplier_id: commonState.supplierId,
      };
    } else {
      payload = {
        mode: "new",
        self_part_number: newSpnInput.value.trim(),
        class_id: newState.classId,
        mfr_part_number: newState.mfrPartNumber.trim(),
        cad_partname: newState.cadPartname.trim() || null,
        value: newState.value.trim() || null,
        package: newState.pkg.trim() || null,
        lt_weeks: newState.ltWeeks === "" ? null : parseInt(newState.ltWeeks, 10),
        moq: newState.moq === "" ? null : parseInt(newState.moq, 10),
        manufacturer_id: newState.manufacturerId,
        description: newState.description.trim() || null,
        quantity: quantityParsed,
        unit_price: unitPriceParsed,
        received_date: commonState.receivedDate,
        supplier_id: commonState.supplierId,
      };
    }

    try {
      const resp = await apiFetch("/api/receiving", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      // Emit parts:changed so any active page (InventoryPage in
      // particular) can refresh within the 2s acceptance window.
      window.dispatchEvent(
        new CustomEvent("parts:changed", { detail: resp }),
      );
      // Fade out + propagate to caller.
      fadeOutAndDestroy(() => {
        if (onSaved) onSaved(resp);
        if (onClosed) onClosed();
      });
    } catch (err) {
      // Restore previous mode so the user sees the form they typed into.
      machineState = prevState;
      cancelBtn.disabled = false;
      updateSaveButtonState();
      // 422 with details.field → highlight specific field.
      if (
        (err.status === 422 || err.status === 404 || err.status === 409) &&
        err.details &&
        typeof err.details.field === "string"
      ) {
        showFieldError(err.details.field, err.message);
      } else {
        showGlobalError(err.message);
      }
    }
  }

  // ── Fade-in (initial mount) ───────────────────────────────────────────
  // Bug fix (2025-02) — dropdown fetch is now awaited before the modal
  // becomes visible so the user never sees an empty 공급사 / 분류 /
  // 제조사 list.  On fetch failure we still fade in so the inline
  // "+ 신규 추가" path is reachable and the modal isn't stuck.
  backdrop.classList.add("is-entering");

  function showModal() {
    requestAnimationFrame(() => {
      backdrop.classList.remove("is-entering");
      backdrop.classList.add("is-open");
      // Focus the part search input by default (existing-mode starts active).
      partSearchInput.focus();
    });
  }

  async function initModal() {
    await loadDropdownOptions();
    showModal();
  }

  initModal().catch(() => {
    // Show anyway on fetch failure — a warn was already logged inside
    // loadDropdownOptions().  Users can still seed values via the
    // inline "+ 신규 추가" affordance on each dropdown.
    showModal();
  });

  // ── Fade-out ──────────────────────────────────────────────────────────
  let closing = false;
  function fadeOutAndDestroy(onDone) {
    if (closing) return;
    closing = true;
    machineState = STATE.CLOSED;
    backdrop.classList.remove("is-open");
    backdrop.classList.add("is-leaving");
    window.setTimeout(() => {
      document.removeEventListener("keydown", onKeydown, true);
      backdrop.remove();
      if (typeof onDone === "function") onDone();
    }, fadeMs);
  }

  function requestClose() {
    // The cancel / backdrop / Esc paths do NOT emit parts:changed.
    if (machineState === STATE.SUBMITTING) return; // ignore mid-submit
    fadeOutAndDestroy(() => {
      if (onClosed) onClosed();
    });
  }

  // ── Event wiring (modal-wide) ─────────────────────────────────────────
  function onKeydown(ev) {
    if (ev.key === "Escape") {
      // Defer to dropdown inline-create's own Esc handler if any is open.
      const activeCreate = panel.querySelector(
        ".dropdown__create:not([hidden])",
      );
      if (activeCreate) return;
      ev.preventDefault();
      ev.stopPropagation();
      requestClose();
    }
  }

  saveBtn.addEventListener("click", submit);
  cancelBtn.addEventListener("click", requestClose);
  closeBtn.addEventListener("click", requestClose);
  backdrop.addEventListener("click", (ev) => {
    if (ev.target === backdrop) requestClose();
  });
  document.addEventListener("keydown", onKeydown, true);

  return {
    close: requestClose,
  };
}
