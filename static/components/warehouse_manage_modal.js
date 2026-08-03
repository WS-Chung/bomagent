// =============================================================================
// warehouse_manage_modal.js — Warehouse manager modal (창고관리, 2025-01 UX)
// -----------------------------------------------------------------------------
// Full edit mode for placing, renaming, dragging, and deleting the markers
// that render on top of Warehouse.jpg.  Opened from the inventory toolbar's
// "창고관리" button (see pages/inventory.js).
//
// Design decisions (source: task brief):
//
//   * Image renders at OPACITY 1.0 (unlike warehouse_modal.js which uses
//     0.35) so the user can see the full warehouse layout while editing.
//   * Marker coordinates persist as unit-square ratios (0..1) of the
//     rendered image.  Placement is anchored at the marker's bottom-center
//     (the tip of the pin) so clicking at (x, y) puts the pin's tip on
//     that pixel — matching the intuitive "drop a pin here" mental model.
//   * All mutations persist immediately via the REST API:
//       - Add:    POST   /api/warehouse-markers
//       - Move:   PATCH  /api/warehouse-markers/{id} {x_ratio, y_ratio}
//       - Rename: PATCH  /api/warehouse-markers/{id} {name}
//       - Delete: DELETE /api/warehouse-markers/{id}
//     The [완료] button therefore only closes the modal — nothing to
//     commit locally.
//
// Public API:
//
//   openWarehouseManageModal({
//     onClosed?: () => void,   // fired after fade-out completes
//   }) → { close: () => void }
// =============================================================================

const API_BASE = "/api/warehouse-markers";
const NAME_MAX_LEN = 20;

/**
 * Read --duration-fade from the document root, falling back to 220ms.
 * Kept identical to warehouse_modal.js so the two modals feel unified.
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
 * Toast — minimal notification piggy-backing on the .toast-host layout
 * already set up by pages/inventory.js so the whole app shares one
 * bottom-right notification stream.
 */
function showToast(message, kind = "info") {
  let host = document.getElementById("toast-host");
  if (!host) {
    host = document.createElement("div");
    host.id = "toast-host";
    host.className = "toast-host";
    document.body.appendChild(host);
  }
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

/**
 * Minimal fetch wrapper — throws an Error decorated with `.status`,
 * `.code`, `.details` on non-2xx so callers can branch on the API's
 * standard error envelope.
 */
async function apiFetch(url, init) {
  const resp = await fetch(url, init);
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

/**
 * Clamp a raw pixel offset into a 0..1 ratio relative to the image's
 * rendered size.  Guard against divide-by-zero when the image is still
 * loading and reports a size of 0.
 */
function clampRatio(pixels, extent) {
  if (!Number.isFinite(pixels) || !Number.isFinite(extent) || extent <= 0) {
    return 0;
  }
  const ratio = pixels / extent;
  if (ratio < 0) return 0;
  if (ratio > 1) return 1;
  return ratio;
}

/**
 * Open the Warehouse manager modal.
 *
 * @param {{ onClosed?: () => void }} opts
 * @returns {{ close: () => void }}
 */
export function openWarehouseManageModal(opts = {}) {
  const onClosed = typeof opts.onClosed === "function" ? opts.onClosed : null;
  const fadeMs = resolveFadeDurationMs();
  const portal = document.getElementById("modal-portal") || document.body;

  // ── State ─────────────────────────────────────────────────────────
  // ``markers`` is the source of truth mirroring the server; every
  // element on screen is rebuilt from this array so we never carry
  // stale DOM after a rename/drag/delete cycle.
  let markers = [];
  let mode = "view"; // "view" | "placing"

  // ── DOM scaffold ──────────────────────────────────────────────────
  const backdrop = document.createElement("div");
  backdrop.className =
    "modal__backdrop warehouse-manage-modal__backdrop is-entering";

  const panel = document.createElement("div");
  panel.className = "modal__panel warehouse-manage-modal__panel";
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-modal", "true");
  panel.setAttribute("aria-label", "창고관리");

  // Header
  const header = document.createElement("header");
  header.className = "modal__header";
  const titleEl = document.createElement("h2");
  titleEl.className = "modal__title";
  titleEl.textContent = "창고관리";
  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.className = "modal__close";
  closeBtn.setAttribute("aria-label", "닫기");
  closeBtn.innerHTML = "&times;";
  header.append(titleEl, closeBtn);

  // Body: toolbar hint + image container
  const body = document.createElement("div");
  body.className = "modal__body warehouse-manage-modal__body";

  const hint = document.createElement("p");
  hint.className = "warehouse-manage-modal__hint";
  hint.textContent =
    "핀을 드래그하여 위치를 옮기거나, 더블클릭으로 이름을 바꾸거나, 우클릭으로 삭제할 수 있습니다.";
  body.appendChild(hint);

  const imageContainer = document.createElement("div");
  imageContainer.className = "warehouse-manage-modal__image-container";

  const image = document.createElement("img");
  image.className = "warehouse-manage-modal__image";
  image.src = "/static/images/Warehouse.jpg";
  image.alt = "창고 배치도";
  image.draggable = false;
  imageContainer.appendChild(image);

  // Overlay layer that receives clicks in placing mode and hosts marker
  // elements.  Kept as a sibling of the image so the cursor:crosshair
  // rule scopes to the map area, not the whole modal body.
  const overlay = document.createElement("div");
  overlay.className = "warehouse-manage-modal__overlay";
  imageContainer.appendChild(overlay);

  body.appendChild(imageContainer);

  // Footer — [+ 보관위치 추가] on the left, [완료] on the right.
  const footer = document.createElement("footer");
  footer.className = "modal__footer warehouse-manage-modal__footer";

  const addBtn = document.createElement("button");
  addBtn.type = "button";
  addBtn.className = "btn btn--secondary warehouse-manage-modal__add-btn";
  addBtn.textContent = "+ 보관위치 추가";

  const spacer = document.createElement("div");
  spacer.className = "warehouse-manage-modal__footer-spacer";

  const doneBtn = document.createElement("button");
  doneBtn.type = "button";
  doneBtn.className = "btn btn--primary warehouse-manage-modal__done-btn";
  doneBtn.textContent = "완료";

  footer.append(addBtn, spacer, doneBtn);

  panel.append(header, body, footer);
  backdrop.appendChild(panel);
  portal.appendChild(backdrop);

  // ── Lifecycle ─────────────────────────────────────────────────────
  let closing = false;

  function close() {
    if (closing) return;
    closing = true;
    exitPlacingMode({ silent: true });
    backdrop.classList.remove("is-open");
    backdrop.classList.add("is-leaving");
    document.removeEventListener("keydown", onKeyDown, true);
    window.setTimeout(() => {
      backdrop.remove();
      if (onClosed) {
        try {
          onClosed();
        } catch {
          /* swallow — closed already */
        }
      }
    }, fadeMs);
  }

  function onKeyDown(ev) {
    if (ev.key === "Escape") {
      // Two-step Escape: if we're placing a marker OR editing an inline
      // name, cancel that first; only close the modal on the second Esc.
      if (mode === "placing") {
        ev.preventDefault();
        ev.stopPropagation();
        exitPlacingMode();
        return;
      }
      const activeEdit = overlay.querySelector(
        ".warehouse-manage-modal__marker.is-editing input",
      );
      if (activeEdit) {
        ev.preventDefault();
        ev.stopPropagation();
        activeEdit.dispatchEvent(new Event("blur"));
        return;
      }
      ev.preventDefault();
      ev.stopPropagation();
      close();
    }
  }

  function onBackdropClick(ev) {
    if (ev.target === backdrop) close();
  }

  closeBtn.addEventListener("click", close);
  doneBtn.addEventListener("click", close);
  backdrop.addEventListener("click", onBackdropClick);
  document.addEventListener("keydown", onKeyDown, true);

  // ── Rendering ─────────────────────────────────────────────────────
  function renderMarkers() {
    // Remove any existing marker elements (but keep the placing-mode
    // preview marker if one is on screen).
    overlay
      .querySelectorAll(".warehouse-manage-modal__marker.is-persisted")
      .forEach((el) => el.remove());

    for (const marker of markers) {
      overlay.appendChild(buildMarkerElement(marker));
    }
  }

  function buildMarkerElement(marker) {
    const el = document.createElement("div");
    el.className =
      "warehouse-manage-modal__marker is-persisted";
    el.dataset.markerId = String(marker.id);
    el.style.left = `${marker.x_ratio * 100}%`;
    el.style.top = `${marker.y_ratio * 100}%`;

    const pin = document.createElement("img");
    pin.className = "warehouse-manage-modal__marker-pin";
    pin.src = "/static/images/marker.png";
    // Issue 3 (2025-02 UX fix) — no visible label beneath the pin; the
    // name surfaces via the native tooltip on hover and via ``alt`` for
    // assistive tech.  ``label`` element is kept around (hidden) so
    // the rename flow can still swap it for an <input> without a full
    // rebuild of the marker's DOM.
    pin.alt = marker.name;
    pin.title = marker.name;
    pin.draggable = false;

    const label = document.createElement("div");
    label.className = "warehouse-manage-modal__marker-label";
    label.textContent = marker.name;
    label.hidden = true;

    el.append(pin, label);

    // Drag handlers.  Pointer events cover mouse + touch + pen uniformly.
    let drag = null;
    pin.addEventListener("pointerdown", (ev) => {
      if (mode === "placing") return; // don't start a drag mid-placement
      if (ev.button !== 0) return;
      ev.preventDefault();
      ev.stopPropagation();
      const rect = image.getBoundingClientRect();
      drag = {
        pointerId: ev.pointerId,
        startX: marker.x_ratio,
        startY: marker.y_ratio,
        moved: false,
        rect,
      };
      el.classList.add("is-dragging");
      try {
        pin.setPointerCapture(ev.pointerId);
      } catch {
        /* browsers without capture — safe to ignore */
      }
    });

    pin.addEventListener("pointermove", (ev) => {
      if (!drag || ev.pointerId !== drag.pointerId) return;
      ev.preventDefault();
      const nextX = clampRatio(ev.clientX - drag.rect.left, drag.rect.width);
      const nextY = clampRatio(ev.clientY - drag.rect.top, drag.rect.height);
      el.style.left = `${nextX * 100}%`;
      el.style.top = `${nextY * 100}%`;
      if (nextX !== drag.startX || nextY !== drag.startY) drag.moved = true;
    });

    async function endDrag(ev) {
      if (!drag || ev.pointerId !== drag.pointerId) return;
      ev.preventDefault();
      el.classList.remove("is-dragging");
      try {
        pin.releasePointerCapture(ev.pointerId);
      } catch {
        /* noop */
      }
      const finalX = clampRatio(
        ev.clientX - drag.rect.left,
        drag.rect.width,
      );
      const finalY = clampRatio(
        ev.clientY - drag.rect.top,
        drag.rect.height,
      );
      const originalX = drag.startX;
      const originalY = drag.startY;
      drag = null;

      // Rollback point if the PATCH fails.
      if (!(finalX !== originalX || finalY !== originalY)) return;

      try {
        const updated = await apiFetch(`${API_BASE}/${marker.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ x_ratio: finalX, y_ratio: finalY }),
        });
        Object.assign(marker, updated);
        el.style.left = `${updated.x_ratio * 100}%`;
        el.style.top = `${updated.y_ratio * 100}%`;
      } catch (err) {
        el.style.left = `${originalX * 100}%`;
        el.style.top = `${originalY * 100}%`;
        showToast(
          err && err.message ? err.message : "마커 이동 실패",
          "error",
        );
      }
    }
    pin.addEventListener("pointerup", endDrag);
    pin.addEventListener("pointercancel", endDrag);

    // Double-click → inline rename.  The label element still exists in
    // the DOM (hidden) so the rename flow keeps working; a double-click
    // on the pin is the primary entry point now that no visible label
    // is available for the user to double-click on.
    pin.addEventListener("dblclick", (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      startRename(el, pin, label, marker);
    });
    label.addEventListener("dblclick", (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      startRename(el, pin, label, marker);
    });

    // Right-click → delete confirmation.
    el.addEventListener("contextmenu", (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      requestDelete(marker, el);
    });

    return el;
  }

  function startRename(el, pin, label, marker) {
    if (el.classList.contains("is-editing")) return;
    el.classList.add("is-editing");
    const original = marker.name;
    // Label starts hidden (Issue 3 — no visible label under the marker);
    // the rename flow surfaces an input in the same DOM slot.

    const input = document.createElement("input");
    input.type = "text";
    input.className = "warehouse-manage-modal__marker-input";
    input.maxLength = NAME_MAX_LEN;
    input.value = original;
    el.appendChild(input);
    input.focus();
    input.select();

    let resolved = false;

    async function commit() {
      if (resolved) return;
      resolved = true;
      const next = input.value.trim();
      cleanup();
      if (!next || next === original) {
        // Nothing to change; caller triggered blur on Esc/empty.
        return;
      }
      try {
        const updated = await apiFetch(`${API_BASE}/${marker.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: next }),
        });
        Object.assign(marker, updated);
        // Issue 3 (2025-02) — no visible label to refresh; update the
        // pin's ``title`` + ``alt`` so hover tooltips + assistive tech
        // both reflect the new name immediately.
        label.textContent = updated.name;
        pin.title = updated.name;
        pin.alt = updated.name;
        showToast(`이름을 "${updated.name}" 로 변경했습니다`, "info");
      } catch (err) {
        showToast(
          err && err.message ? err.message : "이름 변경 실패",
          "error",
        );
      }
    }

    function cancel() {
      if (resolved) return;
      resolved = true;
      cleanup();
    }

    function cleanup() {
      el.classList.remove("is-editing");
      if (input.parentNode === el) el.removeChild(input);
      // Issue 3 — the label stays hidden.  ``pin.title`` (updated on
      // commit) drives the hover tooltip and screen-reader label.
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

  async function requestDelete(marker, el) {
    // A window.confirm keeps the UX approachable — no bespoke confirm
    // dialog wiring needed for the destructive path.
    const ok = window.confirm(`"${marker.name}" 마커를 삭제할까요?`);
    if (!ok) return;
    try {
      await apiFetch(`${API_BASE}/${marker.id}`, { method: "DELETE" });
      markers = markers.filter((m) => m.id !== marker.id);
      el.remove();
      showToast(`"${marker.name}" 마커를 삭제했습니다`, "info");
    } catch (err) {
      showToast(
        err && err.message ? err.message : "마커 삭제 실패",
        "error",
      );
    }
  }

  // ── Placement flow ────────────────────────────────────────────────
  function enterPlacingMode() {
    if (mode === "placing") return;
    mode = "placing";
    imageContainer.classList.add("is-placing");
    addBtn.disabled = true;
    showToast("지도 위의 원하는 위치를 클릭하세요", "info");
  }

  function exitPlacingMode({ silent = false } = {}) {
    if (mode !== "placing") return;
    mode = "view";
    imageContainer.classList.remove("is-placing");
    addBtn.disabled = false;
    // Remove any in-flight preview.
    const preview = overlay.querySelector(
      ".warehouse-manage-modal__marker.is-preview",
    );
    if (preview) preview.remove();
    if (!silent) {
      showToast("보관위치 추가를 취소했습니다", "info");
    }
  }

  addBtn.addEventListener("click", () => {
    if (mode === "placing") {
      exitPlacingMode();
      return;
    }
    enterPlacingMode();
  });

  imageContainer.addEventListener("click", (ev) => {
    if (mode !== "placing") return;
    // Ignore clicks that originated on an existing marker.
    if (ev.target.closest(".warehouse-manage-modal__marker.is-persisted")) {
      return;
    }
    const rect = image.getBoundingClientRect();
    const xRatio = clampRatio(ev.clientX - rect.left, rect.width);
    const yRatio = clampRatio(ev.clientY - rect.top, rect.height);
    beginPlacementAt(xRatio, yRatio);
  });

  function beginPlacementAt(xRatio, yRatio) {
    // Draw an in-progress preview marker with an inline input so the
    // user can name it before we commit to the server.
    const preview = document.createElement("div");
    preview.className =
      "warehouse-manage-modal__marker is-preview is-editing";
    preview.style.left = `${xRatio * 100}%`;
    preview.style.top = `${yRatio * 100}%`;
    const pin = document.createElement("img");
    pin.className = "warehouse-manage-modal__marker-pin";
    pin.src = "/static/images/marker.png";
    pin.alt = "새 마커 미리보기";
    pin.draggable = false;
    const input = document.createElement("input");
    input.type = "text";
    input.className = "warehouse-manage-modal__marker-input";
    input.maxLength = NAME_MAX_LEN;
    input.placeholder = "이름 입력 후 Enter";
    preview.append(pin, input);
    overlay.appendChild(preview);
    input.focus();

    let resolved = false;

    async function commit() {
      if (resolved) return;
      const name = input.value.trim();
      if (!name) {
        // Empty name → cancel entirely.
        cancel();
        return;
      }
      // Disable while the POST is in flight so a double-Enter can't
      // spam duplicate creates.
      input.disabled = true;
      try {
        const created = await apiFetch(API_BASE, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            x_ratio: xRatio,
            y_ratio: yRatio,
          }),
        });
        resolved = true;
        preview.remove();
        markers.push(created);
        overlay.appendChild(buildMarkerElement(created));
        exitPlacingMode({ silent: true });
        showToast(`"${created.name}" 마커를 추가했습니다`, "info");
      } catch (err) {
        input.disabled = false;
        input.focus();
        input.select();
        showToast(
          err && err.message ? err.message : "마커 추가 실패",
          "error",
        );
      }
    }

    function cancel() {
      if (resolved) return;
      resolved = true;
      preview.remove();
      exitPlacingMode({ silent: true });
    }

    input.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter") {
        ev.preventDefault();
        commit();
      } else if (ev.key === "Escape") {
        ev.preventDefault();
        ev.stopPropagation();
        cancel();
      }
    });
    // Blur on the input while placing means the user clicked away — treat
    // that as a cancel so we don't leave an orphan preview on screen.
    input.addEventListener("blur", () => {
      // Small delay so a click that transferred focus to another marker
      // input doesn't race with the blur.
      setTimeout(() => {
        if (!resolved) cancel();
      }, 0);
    });
  }

  // Wait for the map image to finish decoding so the overlay has real
  // dimensions before we project (x_ratio, y_ratio) into it.  The
  // container is ``display: inline-block``, so before ``load`` fires
  // it shrinks to 0×0 and every marker collapses to the top-left corner
  // (or gets clipped by the modal panel).  This bug only manifested on
  // the very first cold-boot open; subsequent opens reused the cached
  // image and reported non-zero dimensions immediately.
  function ensureImageLoaded() {
    return new Promise((resolve) => {
      if (image.complete && image.naturalWidth > 0) {
        resolve();
        return;
      }
      image.addEventListener("load", () => resolve(), { once: true });
      // Resolve on error too so a broken image src doesn't leave the
      // marker fetch permanently pending.
      image.addEventListener("error", () => resolve(), { once: true });
    });
  }

  // ── Initial load ──────────────────────────────────────────────────
  async function loadMarkers() {
    try {
      const data = await apiFetch(API_BASE);
      markers = Array.isArray(data) ? data : [];
      // Bug fix (2025-02) — wait for the image to finish decoding
      // before rendering so the ratio→pixel projection lands on the
      // real overlay bounds instead of a 0×0 container.
      await ensureImageLoaded();
      renderMarkers();
    } catch (err) {
      showToast(
        err && err.message ? err.message : "마커 목록을 불러오지 못했습니다",
        "error",
      );
    }
  }

  // Fade-in + focus the primary "완료" button so keyboard users have an
  // obvious dismiss target immediately.
  requestAnimationFrame(() => {
    backdrop.classList.remove("is-entering");
    backdrop.classList.add("is-open");
    try {
      doneBtn.focus({ preventScroll: true });
    } catch {
      doneBtn.focus();
    }
  });

  // Load markers on next tick so the modal fade-in isn't blocked by the
  // network round-trip.  ``loadMarkers`` internally awaits
  // ``ensureImageLoaded`` before calling ``renderMarkers`` so the ratio
  // → pixel math never runs against a 0×0 container.
  loadMarkers();

  return { close };
}
