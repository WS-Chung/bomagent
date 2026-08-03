// =============================================================================
// edit_part_modal.js — Inline editor for a single Part row
// -----------------------------------------------------------------------------
// Source: design.md §9.5 InventoryPage, §10.1 Modal common spec
// Validates: Requirements 4.1, 4.2, 4.4, 5.1, 5.2, 5.6, 5.7, 7.15, 18.7
//
// Opens a 220ms fade modal showing every editable column for one part. Inventory
// and self_part_number remain readonly per Req 4.3 / 7.15 / Correctness
// Property 1. The class / manufacturer / supplier selectors use the shared
// `dropdown.js` widget which supplies "+ 신규 추가" inline creation.
//
// Public API:
//   openEditPartModal(part, onSaved, onClosed) → controller
//     part: a part object as returned by GET /api/parts (with nested
//           class / manufacturer / supplier objects).
//     onSaved(updatedPart): called once the PATCH succeeds. The caller
//       (inventory page) uses it to update the row in-place.
//     onClosed(): called when the modal finishes its fade-out.
//
// The returned controller exposes `close()` so callers can trigger a programmatic
// close (e.g. on hashchange) without needing to mimic the user-driven path.
// =============================================================================

import { createDropdown } from "/static/components/dropdown.js";

// Read the fade duration from the document so we stay in lockstep with
// tokens.css. Defaults to 220ms matching design §10.1.
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

// ── Small fetch helper that throws a structured Error on 4xx/5xx ────────
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

// ── Field config: declarative table of editable rows ────────────────────
//
// Each entry maps a server column to its label + value extractor + change
// handler. Defining this once keeps the form construction below readable
// and makes it trivial to add / remove columns in the future.
const EDITABLE_FIELDS = [
  { key: "mfr_part_number", label: "MfrPN", type: "text", maxLength: 200, required: true },
  { key: "cad_partname", label: "CAD Partname", type: "text", maxLength: 200 },
  { key: "value", label: "Value", type: "text", maxLength: 100 },
  { key: "package", label: "Package", type: "text", maxLength: 100 },
  { key: "lt_weeks", label: "L/T (주)", type: "integer", min: 0 },
  { key: "moq", label: "MOQ", type: "integer", min: 0 },
  { key: "unit_price", label: "단가", type: "number", min: 0, step: 0.01 },
  { key: "description", label: "Description", type: "textarea", maxLength: 2000 },
];

/**
 * Read a value out of an input element coerced according to a field's type.
 * Returns null when an optional numeric field is blank.
 */
function readFieldValue(input, field) {
  const raw = input.value;
  if (field.type === "integer") {
    if (raw === "" || raw === null) return field.required ? null : null;
    const n = parseInt(raw, 10);
    return Number.isNaN(n) ? null : n;
  }
  if (field.type === "number") {
    if (raw === "" || raw === null) return null;
    const n = parseFloat(raw);
    return Number.isNaN(n) ? null : n;
  }
  // text / textarea
  const trimmed = raw == null ? "" : String(raw);
  return trimmed.length === 0 && !field.required ? null : trimmed;
}

/**
 * Open the Edit Part modal.
 *
 * @param {object} part   The part to edit (current values).
 * @param {(updated: object) => void} [onSaved]
 * @param {() => void} [onClosed]
 * @returns {{ close: () => void }}
 */
export function openEditPartModal(part, onSaved, onClosed) {
  const fadeMs = resolveFadeDurationMs();
  const portal = document.getElementById("modal-portal") || document.body;

  // ── Modal scaffold ───────────────────────────────────────────────────
  const backdrop = document.createElement("div");
  backdrop.className = "modal__backdrop";

  const panel = document.createElement("div");
  panel.className = "modal__panel modal__panel--edit-part";
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-modal", "true");
  panel.setAttribute("aria-label", "부품 편집");

  // Header
  const header = document.createElement("header");
  header.className = "modal__header";
  const title = document.createElement("h2");
  title.className = "modal__title";
  title.textContent = `부품 편집 — ${part.self_part_number}`;
  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.className = "modal__close";
  closeBtn.setAttribute("aria-label", "닫기");
  closeBtn.innerHTML = "&times;";
  header.append(title, closeBtn);

  // Body — form
  const body = document.createElement("div");
  body.className = "modal__body";

  const form = document.createElement("form");
  form.className = "edit-part-form";
  form.setAttribute("novalidate", "true");

  // Helper to build a labelled row.
  function row(labelText, contentEl, { fieldKey } = {}) {
    const wrap = document.createElement("div");
    wrap.className = "form-row";
    if (fieldKey) wrap.dataset.field = fieldKey;
    const lbl = document.createElement("label");
    lbl.className = "form-row__label";
    lbl.textContent = labelText;
    wrap.append(lbl, contentEl);
    const err = document.createElement("span");
    err.className = "form-row__error";
    err.hidden = true;
    err.setAttribute("role", "alert");
    wrap.append(err);
    return { wrap, err };
  }

  // ─ Readonly: self_part_number ─
  const spnInput = document.createElement("input");
  spnInput.type = "text";
  spnInput.className = "form-control form-control--readonly";
  spnInput.readOnly = true;
  spnInput.value = part.self_part_number;
  form.appendChild(row("자체PN", spnInput).wrap);

  // ─ Class dropdown ─
  let classDropdown = null;
  {
    const placeholder = document.createElement("div");
    placeholder.className = "dropdown-slot";
    const wrap = row("분류", placeholder, { fieldKey: "class_id" });
    form.appendChild(wrap.wrap);
    classDropdown = createDropdown({
      options: [],
      value: part.class ? part.class.id : null,
      ariaLabel: "분류",
      onCreate: async (name) => {
        // The class create requires a 2-letter prefix too. We surface a
        // simple prompt so the inline UI still works in a single click;
        // a future task may upgrade this to a 2-field inline form.
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
        return { id: created.id, label: `${created.name} (${created.prefix})` };
      },
    });
    placeholder.replaceWith(classDropdown.el);
  }

  // ─ Manufacturer dropdown ─
  let mfrDropdown = null;
  {
    const placeholder = document.createElement("div");
    placeholder.className = "dropdown-slot";
    const wrap = row("제조사", placeholder, { fieldKey: "manufacturer_id" });
    form.appendChild(wrap.wrap);
    mfrDropdown = createDropdown({
      options: [],
      value: part.manufacturer ? part.manufacturer.id : null,
      ariaLabel: "제조사",
      onCreate: async (name) => {
        const created = await apiFetch("/api/manufacturers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name }),
        });
        return { id: created.id, label: created.name };
      },
    });
    placeholder.replaceWith(mfrDropdown.el);
  }

  // ─ Supplier dropdown ─
  let supDropdown = null;
  {
    const placeholder = document.createElement("div");
    placeholder.className = "dropdown-slot";
    const wrap = row("공급사", placeholder, { fieldKey: "supplier_id" });
    form.appendChild(wrap.wrap);
    supDropdown = createDropdown({
      options: [],
      value: part.supplier ? part.supplier.id : null,
      ariaLabel: "공급사",
      onCreate: async (name) => {
        const created = await apiFetch("/api/suppliers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name }),
        });
        return { id: created.id, label: created.name };
      },
    });
    placeholder.replaceWith(supDropdown.el);
  }

  // ─ Standard editable fields ─
  const fieldInputs = new Map(); // key -> input element
  for (const f of EDITABLE_FIELDS) {
    let input;
    if (f.type === "textarea") {
      input = document.createElement("textarea");
      input.rows = 3;
    } else {
      input = document.createElement("input");
      input.type = f.type === "text" ? "text" : "number";
      if (f.type === "integer") input.step = "1";
      if (f.step !== undefined) input.step = String(f.step);
      if (f.min !== undefined) input.min = String(f.min);
    }
    input.className = "form-control";
    if (f.maxLength) input.maxLength = f.maxLength;
    const current = part[f.key];
    input.value = current === null || current === undefined ? "" : current;
    const { wrap } = row(f.label, input, { fieldKey: f.key });
    form.appendChild(wrap);
    fieldInputs.set(f.key, input);
  }

  // ─ Storage location dropdown (2025-02 재고관리 편집 UX) ─
  //
  // Per-part override of the class-level 보관위치.  Options come from
  // GET /api/warehouse-markers (marker.name → both the option id and
  // its label since the parts.storage_location column stores the name
  // string, not the marker id).  ``allowClear: true`` gives the
  // "(분류 기본값 사용)" reset row — selecting it PATCHes ``null`` and
  // the response's COALESCE re-derives the effective value from the
  // class default.  Load happens in parallel with the other option
  // fetches so the modal opens without an extra round-trip.
  let storageDropdown = null;
  {
    const placeholder = document.createElement("div");
    placeholder.className = "dropdown-slot";
    const wrap = row("보관위치", placeholder, {
      fieldKey: "storage_location",
    });
    form.appendChild(wrap.wrap);
    storageDropdown = createDropdown({
      options: [],
      // Seed the widget with the effective value read from the part
      // (already COALESCE'd server-side).  If the value isn't in the
      // options list yet (they load asynchronously) the widget will
      // still show it as a plain string once ``setOptions`` runs.
      value: part.storage_location ?? null,
      ariaLabel: "보관위치",
      allowClear: true,
      placeholder: "(분류 기본값 사용)",
    });
    placeholder.replaceWith(storageDropdown.el);
  }

  // ─ Readonly: inventory ─
  const invInput = document.createElement("input");
  invInput.type = "text";
  invInput.className = "form-control form-control--readonly";
  invInput.readOnly = true;
  invInput.value = String(part.inventory ?? 0);
  form.appendChild(row("재고 (readonly)", invInput).wrap);

  body.appendChild(form);

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

  // Load dropdown options asynchronously after mount so the modal can
  // render immediately. If a fetch fails we leave the dropdown empty —
  // the user can still save (the current pre-selected option remains valid
  // because it's loaded directly from the part record).
  loadDropdownOptions();

  async function loadDropdownOptions() {
    try {
      // Warehouse markers are added to the parallel fetch so the 보관위치
      // dropdown lights up in the same frame as the other selectors.
      // Empty response is fine — the widget still shows the
      // "(분류 기본값 사용)" clear entry alone.
      const [classes, mfrs, sups, markers] = await Promise.all([
        apiFetch("/api/part-classes"),
        apiFetch("/api/manufacturers"),
        apiFetch("/api/suppliers"),
        apiFetch("/api/warehouse-markers"),
      ]);
      classDropdown.setOptions(
        (classes || []).map((c) => ({
          id: c.id,
          label: `${c.name} (${c.prefix})`,
        })),
      );
      classDropdown.setValue(part.class ? part.class.id : null);
      mfrDropdown.setOptions(
        (mfrs || []).map((m) => ({ id: m.id, label: m.name })),
      );
      mfrDropdown.setValue(part.manufacturer ? part.manufacturer.id : null);
      supDropdown.setOptions(
        (sups || []).map((s) => ({ id: s.id, label: s.name })),
      );
      supDropdown.setValue(part.supplier ? part.supplier.id : null);
      // Marker names are used as both the value and the label — the
      // parts.storage_location column stores the name string, so the
      // dropdown returns the exact value the API expects on PATCH.
      storageDropdown.setOptions(
        (markers || []).map((m) => ({ id: m.name, label: m.name })),
      );
      storageDropdown.setValue(part.storage_location ?? null);
    } catch {
      // Surfacing this error inline would be noisy; the pre-selected ids
      // remain valid so saving still works.
    }
  }

  // ── Fade in ──────────────────────────────────────────────────────────
  // Start at opacity 0 then transition to 1 on next frame so the browser
  // registers the initial state before the transition triggers.
  backdrop.classList.add("is-entering");
  requestAnimationFrame(() => {
    backdrop.classList.remove("is-entering");
    backdrop.classList.add("is-open");
    // Focus the first interactive field after the fade begins.
    const firstInput = panel.querySelector(
      ".form-control:not([readonly]), .dropdown__select",
    );
    if (firstInput && typeof firstInput.focus === "function") {
      firstInput.focus();
    }
  });

  // ── Field-error helpers ──────────────────────────────────────────────
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
    const row = panel.querySelector(`.form-row[data-field="${fieldKey}"]`);
    if (!row) {
      formError.textContent = message;
      formError.hidden = false;
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

  // ── Save / close handlers ────────────────────────────────────────────
  let closing = false;

  function fadeOutAndDestroy(onDone) {
    if (closing) return;
    closing = true;
    backdrop.classList.remove("is-open");
    backdrop.classList.add("is-leaving");
    window.setTimeout(() => {
      backdrop.remove();
      document.removeEventListener("keydown", onKeydown, true);
      if (typeof onDone === "function") onDone();
    }, fadeMs);
  }

  function requestClose() {
    fadeOutAndDestroy(() => {
      if (typeof onClosed === "function") onClosed();
    });
  }

  async function submit() {
    clearFieldErrors();

    // Build PATCH body. Only include fields whose new value differs from
    // the current part record — this keeps the audit_log impact minimal.
    /** @type {Record<string, any>} */
    const updates = {};

    for (const f of EDITABLE_FIELDS) {
      const input = fieldInputs.get(f.key);
      const next = readFieldValue(input, f);
      const cur = part[f.key];
      // Compare normalized values; null/undefined equal each other.
      const curNorm = cur === undefined ? null : cur;
      if (next !== curNorm) updates[f.key] = next;
    }

    const classId = classDropdown.getValue();
    const mfrId = mfrDropdown.getValue();
    const supId = supDropdown.getValue();
    if (classId !== (part.class ? part.class.id : null)) updates.class_id = classId;
    if (mfrId !== (part.manufacturer ? part.manufacturer.id : null))
      updates.manufacturer_id = mfrId;
    if (supId !== (part.supplier ? part.supplier.id : null))
      updates.supplier_id = supId;

    // Storage location — send the raw dropdown value.  A ``null`` here
    // clears the per-part override, letting the class-level default
    // take over via the response's COALESCE.  The Pydantic layer also
    // accepts empty string and normalises it to ``null``, but we send
    // JSON ``null`` explicitly so the server-side audit trail is
    // unambiguous ("cleared" vs "set to empty string").
    const storageVal = storageDropdown.getValue();
    const curStorage =
      part.storage_location === undefined ? null : part.storage_location;
    if (storageVal !== curStorage) updates.storage_location = storageVal;

    saveBtn.disabled = true;
    cancelBtn.disabled = true;
    try {
      const updated = await apiFetch(`/api/parts/${part.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      // Success → fade out and notify caller.
      fadeOutAndDestroy(() => {
        if (typeof onSaved === "function") onSaved(updated);
      });
    } catch (err) {
      saveBtn.disabled = false;
      cancelBtn.disabled = false;
      // 422 with details.field → highlight specific field.
      if (
        err.status === 422 &&
        err.details &&
        typeof err.details.field === "string"
      ) {
        showFieldError(err.details.field, err.message);
      } else if (err.status === 409) {
        // Duplicate key — likely from a referenced FK; surface globally.
        showGlobalError(err.message);
      } else {
        showGlobalError(err.message);
      }
    }
  }

  // ── Wire events ──────────────────────────────────────────────────────
  function onKeydown(ev) {
    if (ev.key === "Escape") {
      // Only intercept if no inline-create is open (the dropdown handles
      // its own Esc to cancel inline creation).
      const activeCreate = panel.querySelector(".dropdown__create:not([hidden])");
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
