// =============================================================================
// confirm_dialog.js — Promise-based confirmation dialog
// -----------------------------------------------------------------------------
// Source: design.md §10.1 (공통 모달), §10.4 ConfirmDialog
// Validates: Requirements 8.5, 18.7
//
// Public API:
//
//   openConfirmDialog({
//     title:        string,                // header text (e.g. "확인")
//     message:      string,                // body text (line breaks honoured)
//     confirmLabel: string = "확인",       // primary button caption
//     cancelLabel:  string = "취소",       // secondary button caption
//     danger:       boolean = false,       // recolours [확인] to risk-red
//   }) → Promise<boolean>
//
// Resolves to:
//   true  — user clicked [확인]
//   false — user clicked [취소] / pressed Esc / clicked backdrop / pressed ×
//
// Behaviour highlights:
//   * 220ms opacity fade-in / fade-out using --duration-fade tokens
//     (Req 18.7). Implementation mirrors receiving_modal.js so the timing
//     stays consistent across the SPA.
//   * Esc and backdrop click both resolve(false) — the safe default for a
//     destructive-action gate (design.md §10.4).
//   * Focus moves to the primary button when the dialog opens; an outer
//     focus trap is intentionally NOT implemented because the dialog is
//     short-lived and the underlying page is already inert behind the
//     backdrop.
//   * Reuses the existing modal CSS primitives (.modal__backdrop /
//     .modal__panel / .modal__header / .modal__body / .modal__footer)
//     plus a small overlay stylesheet (confirm_dialog.css) for variant
//     bits like the danger-coloured confirm button.
// =============================================================================

/**
 * Read --duration-fade from the document root (falling back to the design
 * spec 220ms when the token is unparseable). Kept in sync with the
 * receiving_modal helper so all modals fade at the same tempo.
 */
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
 * Open a confirmation dialog. See module header for the option contract.
 *
 * @param {{
 *   title?: string,
 *   message: string,
 *   confirmLabel?: string,
 *   cancelLabel?: string,
 *   danger?: boolean,
 * }} opts
 * @returns {Promise<boolean>}
 */
export function openConfirmDialog(opts) {
  const {
    title = "확인",
    message = "",
    confirmLabel = "확인",
    cancelLabel = "취소",
    danger = false,
  } = opts || {};

  return new Promise((resolve) => {
    const fadeMs = resolveFadeDurationMs();
    const portal = document.getElementById("modal-portal") || document.body;

    // ── DOM scaffold (shared modal primitives) ─────────────────────────
    const backdrop = document.createElement("div");
    backdrop.className = "modal__backdrop confirm_dialog__backdrop is-entering";

    const panel = document.createElement("div");
    panel.className = "modal__panel confirm_dialog__panel";
    panel.setAttribute("role", "alertdialog");
    panel.setAttribute("aria-modal", "true");
    panel.setAttribute("aria-label", title);

    // Header
    const header = document.createElement("header");
    header.className = "modal__header";
    const titleEl = document.createElement("h2");
    titleEl.className = "modal__title";
    titleEl.textContent = title;
    const closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "modal__close";
    closeBtn.setAttribute("aria-label", "닫기");
    closeBtn.innerHTML = "&times;";
    header.append(titleEl, closeBtn);

    // Body — preserve any newlines the caller put in `message`.
    const body = document.createElement("div");
    body.className = "modal__body confirm_dialog__body";
    // Use textContent + white-space:pre-line in CSS so line breaks survive.
    body.textContent = message;

    // Footer
    const footer = document.createElement("footer");
    footer.className = "modal__footer";

    const cancelBtn = document.createElement("button");
    cancelBtn.type = "button";
    cancelBtn.className = "btn btn--secondary confirm_dialog__cancel";
    cancelBtn.textContent = cancelLabel;

    const confirmBtn = document.createElement("button");
    confirmBtn.type = "button";
    confirmBtn.className = danger
      ? "btn btn--danger confirm_dialog__confirm confirm_dialog__confirm--danger"
      : "btn btn--primary confirm_dialog__confirm";
    confirmBtn.textContent = confirmLabel;

    footer.append(cancelBtn, confirmBtn);
    panel.append(header, body, footer);
    backdrop.appendChild(panel);
    portal.appendChild(backdrop);

    // ── Lifecycle ─────────────────────────────────────────────────────
    let settled = false;

    function settle(result) {
      if (settled) return;
      settled = true;
      // Fade-out, then remove from the DOM after the transition completes.
      backdrop.classList.remove("is-open");
      backdrop.classList.add("is-leaving");
      window.setTimeout(() => {
        document.removeEventListener("keydown", onKeyDown, true);
        backdrop.remove();
        resolve(Boolean(result));
      }, fadeMs);
    }

    function onConfirm() {
      settle(true);
    }
    function onCancel() {
      settle(false);
    }
    function onBackdrop(ev) {
      // Only resolve on direct backdrop clicks — clicks bubbling up from
      // the panel itself should not dismiss the dialog.
      if (ev.target === backdrop) settle(false);
    }
    function onKeyDown(ev) {
      if (ev.key === "Escape") {
        ev.preventDefault();
        ev.stopPropagation();
        settle(false);
      } else if (ev.key === "Enter") {
        // Enter on the confirm button is native; only intercept when no
        // input has focus to avoid stealing a submit elsewhere.
        const tag =
          document.activeElement && document.activeElement.tagName
            ? document.activeElement.tagName.toLowerCase()
            : "";
        if (tag !== "input" && tag !== "textarea") {
          ev.preventDefault();
          settle(true);
        }
      }
    }

    confirmBtn.addEventListener("click", onConfirm);
    cancelBtn.addEventListener("click", onCancel);
    closeBtn.addEventListener("click", onCancel);
    backdrop.addEventListener("click", onBackdrop);
    document.addEventListener("keydown", onKeyDown, true);

    // ── Fade-in ───────────────────────────────────────────────────────
    requestAnimationFrame(() => {
      backdrop.classList.remove("is-entering");
      backdrop.classList.add("is-open");
      // Default focus on the destructive action goes to [취소] when in
      // danger mode (safer); otherwise [확인].
      const focusTarget = danger ? cancelBtn : confirmBtn;
      try {
        focusTarget.focus({ preventScroll: true });
      } catch {
        focusTarget.focus();
      }
    });
  });
}
