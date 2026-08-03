// =============================================================================
// warehouse_modal.js — Warehouse map popup (2025-01 재고관리 페이지 UX)
// -----------------------------------------------------------------------------
// Source: user request "각 부품의 보관위치 항목을 클릭하면 루트폴더에 있는
//         Warehouse.jpg를 팝업으로 띄워주세요. warehouse.jpg의 투명도는
//         35%로 설정해 주세요."
//
// Public API:
//
//   openWarehouseModal({
//     storageLocation: string,        // "가1", "나3", ...
//   }) → { close: () => void }
//
// Behaviour:
//   * Renders a modal panel with the ``Warehouse.jpg`` map at 35%
//     opacity per user requirement.  The markers themselves stay at
//     full opacity — only the underlying image fades so the pins pop.
//   * Fetches all warehouse markers via GET /api/warehouse-markers and
//     overlays them on the image at their persisted (x_ratio, y_ratio).
//   * The marker whose ``name`` matches the clicked cell's storage
//     location gets ``.is-highlighted`` — a CSS pulse + blue halo
//     glow so the user can find it at a glance.
//   * Clicking anywhere on the map area OTHER than the highlighted
//     marker stops the pulse animation (user request: "지도 영역의
//     다른 부분을 클릭하면 애니메이션 종료").
//   * 220ms fade-in / fade-out via the shared --duration-fade tokens.
//   * Close paths: Esc / backdrop click / × button.  No data mutation
//     happens here so there is no confirm-on-close guard.
// =============================================================================

/**
 * Read --duration-fade from the document root (falling back to the design
 * spec 220ms when the token is unparseable).  Kept in sync with the other
 * modal helpers so all modals fade at the same tempo.
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
 * Open the Warehouse map popup.
 *
 * @param {{ storageLocation?: string }} opts
 * @returns {{ close: () => void }}
 */
export function openWarehouseModal(opts = {}) {
  const storageLocation =
    opts && typeof opts.storageLocation === "string"
      ? opts.storageLocation
      : "";

  const fadeMs = resolveFadeDurationMs();
  const portal = document.getElementById("modal-portal") || document.body;

  // ── DOM scaffold — shared modal primitives ─────────────────────────
  const backdrop = document.createElement("div");
  backdrop.className =
    "modal__backdrop warehouse-modal__backdrop is-entering";

  const panel = document.createElement("div");
  panel.className = "modal__panel warehouse-modal__panel";
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-modal", "true");
  panel.setAttribute(
    "aria-label",
    storageLocation
      ? `보관위치 확인 (${storageLocation})`
      : "보관위치 확인",
  );

  // Header — Issue 2 (2025-02 UX fix): the old heading rendered the
  // clicked storage-location label as an h2 which duplicated information
  // the user already had (they were looking at that cell moments ago).
  // The header is now visually minimal: just the ×-close button in
  // the top-right, no <h2>.
  const header = document.createElement("header");
  header.className = "modal__header warehouse-modal__header";

  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.className = "modal__close";
  closeBtn.setAttribute("aria-label", "닫기");
  closeBtn.innerHTML = "&times;";
  header.append(closeBtn);

  // Body — image + a same-sized overlay layer that hosts the markers.
  // The image is faded to 35% opacity (user request); markers live in
  // a sibling overlay that stays at full opacity so the pins remain
  // crisp against the softened map.
  const body = document.createElement("div");
  body.className = "modal__body warehouse-modal__body";

  const imageContainer = document.createElement("div");
  imageContainer.className = "warehouse-modal__image-container";

  const image = document.createElement("img");
  image.className = "warehouse-modal__image";
  image.src = "/static/images/Warehouse.jpg";
  image.alt = "창고 배치도";
  image.draggable = false;
  imageContainer.appendChild(image);

  const overlay = document.createElement("div");
  overlay.className = "warehouse-modal__overlay";
  imageContainer.appendChild(overlay);

  body.appendChild(imageContainer);

  // Footer — a single [닫기] button so keyboard users have an obvious
  // dismiss target that isn't the corner ×.
  const footer = document.createElement("footer");
  footer.className = "modal__footer";
  const dismissBtn = document.createElement("button");
  dismissBtn.type = "button";
  dismissBtn.className = "btn btn--secondary warehouse-modal__close-btn";
  dismissBtn.textContent = "닫기";
  footer.appendChild(dismissBtn);

  panel.append(header, body, footer);
  backdrop.appendChild(panel);
  portal.appendChild(backdrop);

  // ── Lifecycle ─────────────────────────────────────────────────────
  let closing = false;

  function close() {
    if (closing) return;
    closing = true;
    backdrop.classList.remove("is-open");
    backdrop.classList.add("is-leaving");
    document.removeEventListener("keydown", onKeyDown, true);
    window.setTimeout(() => {
      backdrop.remove();
    }, fadeMs);
  }

  function onKeyDown(ev) {
    if (ev.key === "Escape") {
      ev.preventDefault();
      ev.stopPropagation();
      close();
    }
  }

  function onBackdropClick(ev) {
    // Only close on a direct backdrop click — clicks bubbling up from
    // the panel itself must not dismiss the popup.
    if (ev.target === backdrop) close();
  }

  closeBtn.addEventListener("click", close);
  dismissBtn.addEventListener("click", close);
  backdrop.addEventListener("click", onBackdropClick);
  document.addEventListener("keydown", onKeyDown, true);

  // ── Marker rendering + highlight ──────────────────────────────────
  // Fetch all persisted markers and overlay them at their (x_ratio,
  // y_ratio) positions.  The one whose name matches ``storageLocation``
  // gets the pulse animation until the user clicks elsewhere.
  //
  // Bug fix (2025-02): the ``.warehouse-modal__image-container`` uses
  // ``display: inline-block``, which sizes the container to the <img>'s
  // rendered dimensions.  On the FIRST cold-boot open the image has not
  // been loaded yet and reports ``naturalWidth = 0``, so the container
  // — and therefore the overlay layered on top of it — collapse to 0×0.
  // Every marker's ``left: {ratio*100}%`` then resolves to 0px, and the
  // ``translate(-50%, -100%)`` transform pushes them off the panel where
  // the modal's overflow clips them.  We defer marker rendering until
  // the image has finished decoding so the overlay has real dimensions
  // to project the ratios into.
  function ensureImageLoaded() {
    return new Promise((resolve) => {
      if (image.complete && image.naturalWidth > 0) {
        resolve();
        return;
      }
      image.addEventListener("load", () => resolve(), { once: true });
      // Resolve on error too so a broken image src never leaves the
      // marker fetch permanently pending; the modal stays open and
      // simply shows no markers on top of the broken image.
      image.addEventListener("error", () => resolve(), { once: true });
    });
  }

  let highlighted = null;

  function stopHighlight() {
    if (!highlighted) return;
    highlighted.classList.remove("is-highlighted");
    highlighted = null;
  }

  // Clicks anywhere in the image area other than the highlighted marker
  // itself should stop the animation.  Attached to the overlay AND the
  // image so both layers cooperate; the marker's own click handler
  // stops propagation so the pulse survives clicking the pin itself.
  function onMapAreaClick(ev) {
    // If the click came from the highlighted marker (or its children),
    // leave the animation running.
    if (highlighted && ev.target.closest(
      '.warehouse-modal__marker.is-highlighted'
    )) {
      return;
    }
    stopHighlight();
  }
  imageContainer.addEventListener("click", onMapAreaClick);

  function renderMarkers(markers) {
    // Clear any previously rendered markers (defensive — this function
    // could be called more than once in future).
    overlay
      .querySelectorAll(".warehouse-modal__marker")
      .forEach((el) => el.remove());

    for (const marker of markers) {
      const el = document.createElement("div");
      el.className = "warehouse-modal__marker";
      el.dataset.markerId = String(marker.id);
      el.dataset.markerName = marker.name;
      el.style.left = `${marker.x_ratio * 100}%`;
      el.style.top = `${marker.y_ratio * 100}%`;

      const pin = document.createElement("img");
      pin.className = "warehouse-modal__marker-pin";
      pin.src = "/static/images/marker.png";
      // Issue 3 (2025-02 UX fix) — the visible marker-name label is
      // gone; hover the pin to see the name via the native tooltip.
      // ``alt`` keeps screen readers happy without cluttering the map.
      pin.alt = marker.name;
      pin.title = marker.name;
      pin.draggable = false;
      el.appendChild(pin);

      if (
        storageLocation &&
        marker.name.trim() === storageLocation.trim()
      ) {
        el.classList.add("is-highlighted");
        highlighted = el;
      }
      overlay.appendChild(el);
    }
  }

  fetch("/api/warehouse-markers")
    .then((resp) => (resp.ok ? resp.json() : Promise.reject(resp)))
    .then(async (data) => {
      if (closing) return;
      // Bug fix (2025-02) — wait for the image to finish loading before
      // projecting ratios into the (potentially 0×0) overlay.  See the
      // ``ensureImageLoaded`` docstring above.
      await ensureImageLoaded();
      if (closing) return;
      renderMarkers(Array.isArray(data) ? data : []);
    })
    .catch(() => {
      // Graceful degradation — the popup is still useful without
      // markers, so a network hiccup shouldn't blow up the UX.
    });

  // ── Fade-in ───────────────────────────────────────────────────────
  requestAnimationFrame(() => {
    backdrop.classList.remove("is-entering");
    backdrop.classList.add("is-open");
    try {
      dismissBtn.focus({ preventScroll: true });
    } catch {
      dismissBtn.focus();
    }
  });

  return { close };
}
