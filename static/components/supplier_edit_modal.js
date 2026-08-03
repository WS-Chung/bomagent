// =============================================================================
// supplier_edit_modal.js — Inline editor for one Supplier row (공급관리)
// -----------------------------------------------------------------------------
// Source: 2025-02 UX request — the 공급관리 page opens this modal per row
// to edit the 6 supplier fields (공급사명 + 5 free-text detail fields).
// Persists via ``PATCH /api/suppliers/{id}`` and mirrors the shape /
// behaviour of ``edit_part_modal.js`` (220ms fade, tokens-only styling,
// field-level 4xx error surfacing, Esc closes, backdrop closes).
//
// Public API:
//   openSupplierEditModal(supplier, onSaved, onClosed) → controller
//     supplier: a supplier object as returned by GET /api/suppliers
//               ({id, name, formal_name, contact_person, contact_phone,
//                contact_email, business_address}).
//     onSaved(updatedSupplier): called once the PATCH succeeds.
//     onClosed(): called when the modal finishes its fade-out.
//
// The returned controller exposes ``close()`` for programmatic dismissal.
// =============================================================================

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

// Field configuration — declarative table of editable rows.  Keeping it
// here makes the form-construction loop below a straight enumeration
// and lets us surface exactly the same error highlighting logic that
// the ``edit_part_modal.js`` uses.
const SUPPLIER_FIELDS = [
  {
    key: "name",
    label: "공급사명",
    maxLength: 100,
    required: true,
  },
  {
    key: "formal_name",
    label: "정식 업체명",
    maxLength: 200,
    required: false,
  },
  {
    key: "contact_person",
    label: "담당자",
    maxLength: 200,
    required: false,
  },
  {
    key: "contact_phone",
    label: "담당자 연락처",
    maxLength: 200,
    required: false,
  },
  {
    key: "contact_email",
    label: "담당자 E-mail",
    maxLength: 200,
    required: false,
  },
  {
    key: "business_address",
    label: "사업자 주소",
    maxLength: 200,
    required: false,
  },
];

/**
 * Return the trimmed value from an input, coerced to the shape the API
 * expects.  Empty-after-trim on optional fields becomes ``null`` so the
 * server ends up storing the natural absence-of-value.
 */
function readFieldValue(input, field) {
  const raw = input.value == null ? "" : String(input.value);
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return field.required ? "" : null;
  }
  return trimmed;
}

/**
 * Open the Supplier Edit modal.
 *
 * Extended 2025-02 with a ``mode`` parameter (edit / create).  In
 * ``"edit"`` mode (the default, kept for backward compat) the modal
 * loads a supplier record into the form and PATCHes it on save; in
 * ``"create"`` mode it opens with empty fields, PATCH is swapped for
 * POST, and the title reads "공급사 추가".  Both modes share the same
 * form layout so operators encounter identical validation and error
 * surfacing regardless of which flow opened the modal.
 *
 * @param {object | null} supplier
 *   In edit mode: the supplier record to edit.  In create mode: pass
 *   ``null`` (the mode string alone triggers the empty-form path).
 * @param {(saved: object) => void} [onSaved]
 *   Called once the POST/PATCH succeeds with the persisted record.
 * @param {() => void} [onClosed]
 *   Called once the fade-out finishes.
 * @param {{ mode?: "create" | "edit" }} [opts]
 *   ``mode`` selects the behaviour; defaults to "edit" for backward
 *   compatibility with existing callers.
 * @returns {{ close: () => void }}
 */
export function openSupplierEditModal(supplier, onSaved, onClosed, opts) {
  const mode = (opts && opts.mode) === "create" ? "create" : "edit";
  const record = mode === "create" ? {} : (supplier || {});
  const fadeMs = resolveFadeDurationMs();
  const portal = document.getElementById("modal-portal") || document.body;

  // ── Modal scaffold ────────────────────────────────────────────────
  const backdrop = document.createElement("div");
  backdrop.className = "modal__backdrop";

  const panel = document.createElement("div");
  panel.className = "modal__panel modal__panel--supplier-edit";
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-modal", "true");
  panel.setAttribute(
    "aria-label",
    mode === "create" ? "공급사 추가" : "업체정보 수정",
  );

  // ── Header ────────────────────────────────────────────────────────
  const header = document.createElement("header");
  header.className = "modal__header";
  const title = document.createElement("h2");
  title.className = "modal__title";
  title.textContent = mode === "create" ? "공급사 추가" : "업체정보 수정";
  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.className = "modal__close";
  closeBtn.setAttribute("aria-label", "닫기");
  closeBtn.innerHTML = "&times;";
  header.append(title, closeBtn);

  // ── Body / form ───────────────────────────────────────────────────
  const body = document.createElement("div");
  body.className = "modal__body";

  const form = document.createElement("form");
  form.className = "supplier-edit-form";
  form.setAttribute("novalidate", "true");

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

  const fieldInputs = new Map();
  for (const field of SUPPLIER_FIELDS) {
    const input = document.createElement("input");
    input.type = "text";
    input.className = "form-control";
    input.maxLength = field.maxLength;
    // In create mode ``record`` is an empty object so every field
    // starts blank; in edit mode we hydrate from the passed record.
    const current = record[field.key];
    input.value = current === null || current === undefined ? "" : current;
    if (field.required) input.required = true;
    const { wrap } = row(field.label, input, { fieldKey: field.key });
    form.appendChild(wrap);
    fieldInputs.set(field.key, input);
  }

  body.appendChild(form);

  // ── Footer ────────────────────────────────────────────────────────
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

  // ── Fade in ───────────────────────────────────────────────────────
  backdrop.classList.add("is-entering");
  requestAnimationFrame(() => {
    backdrop.classList.remove("is-entering");
    backdrop.classList.add("is-open");
    // Focus the 공급사명 input on entry — that's the required field
    // and typically the one the operator is here to change.
    const firstInput = fieldInputs.get("name");
    if (firstInput && typeof firstInput.focus === "function") {
      firstInput.focus();
      firstInput.select();
    }
  });

  // ── Error helpers ─────────────────────────────────────────────────
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

  // ── Submit / close ────────────────────────────────────────────────
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

    // Client-side required check for 공급사명 — the server also enforces
    // this via min_length=1 but surfacing it inline avoids the round trip.
    const nameInput = fieldInputs.get("name");
    if (nameInput && nameInput.value.trim().length === 0) {
      showFieldError("name", "공급사명을 입력해주세요");
      nameInput.focus();
      return;
    }

    saveBtn.disabled = true;
    cancelBtn.disabled = true;
    try {
      let saved;
      if (mode === "create") {
        // Build POST body — include every field the operator filled in.
        // Empty strings collapse to ``null`` via ``readFieldValue`` on
        // optional fields, matching how the SupplierCreate validator
        // treats blanks as "not provided".  The name field is always
        // included (required + trimmed non-empty at this point).
        /** @type {Record<string, any>} */
        const payload = {};
        for (const field of SUPPLIER_FIELDS) {
          const input = fieldInputs.get(field.key);
          const next = readFieldValue(input, field);
          if (field.required || next !== null) payload[field.key] = next;
        }
        saved = await apiFetch("/api/suppliers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        // Broadcast so any listening page (dashboard filter, receiving
        // modal, 공급관리 table) refreshes its supplier cache.  The
        // caller's ``onSaved`` callback still fires for local state
        // updates.
        window.dispatchEvent(
          new CustomEvent("suppliers:changed", {
            detail: { id: saved.id },
          }),
        );
      } else {
        // Edit mode — only include fields whose value differs from the
        // current record so the audit trail stays clean.
        /** @type {Record<string, any>} */
        const updates = {};
        for (const field of SUPPLIER_FIELDS) {
          const input = fieldInputs.get(field.key);
          const next = readFieldValue(input, field);
          const cur = record[field.key];
          const curNorm = cur === undefined ? null : cur;
          if (next !== curNorm) updates[field.key] = next;
        }
        saved = await apiFetch(`/api/suppliers/${record.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates),
        });
      }
      fadeOutAndDestroy(() => {
        if (typeof onSaved === "function") onSaved(saved);
      });
    } catch (err) {
      saveBtn.disabled = false;
      cancelBtn.disabled = false;
      if (
        err.status === 422 &&
        err.details &&
        typeof err.details.field === "string"
      ) {
        showFieldError(err.details.field, err.message);
      } else if (err.status === 409) {
        // Duplicate name — highlight the name row specifically.
        const fieldName =
          err.details && typeof err.details.field === "string"
            ? err.details.field
            : "name";
        showFieldError(fieldName, err.message);
      } else {
        showGlobalError(err.message);
      }
    }
  }

  function onKeydown(ev) {
    if (ev.key === "Escape") {
      ev.preventDefault();
      ev.stopPropagation();
      requestClose();
    } else if (ev.key === "Enter" && ev.target instanceof HTMLInputElement) {
      // Convenience: Enter in any text input submits the form.
      ev.preventDefault();
      submit();
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


/**
 * Convenience wrapper for the 공급관리 페이지 "+ 공급사 추가" flow.
 *
 * Opens the shared supplier modal in ``create`` mode with an empty
 * form; on successful POST the returned supplier record is passed to
 * the caller's ``onSaved`` callback so the calling page can insert
 * the new row into its local state without a full re-fetch.
 *
 * @param {{
 *   onSaved?: (created: object) => void,
 *   onClosed?: () => void,
 * }} [config]
 * @returns {{ close: () => void }}
 */
export function openSupplierCreateModal(config) {
  const cfg = config || {};
  return openSupplierEditModal(null, cfg.onSaved, cfg.onClosed, {
    mode: "create",
  });
}
