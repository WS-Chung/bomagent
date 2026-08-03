// =============================================================================
// sidebar.js — Sidebar navigation component
// -----------------------------------------------------------------------------
// Source: design.md §9.1, §9.2, §9.4
// Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.6
//
// The sidebar markup is pre-rendered in index.html so it is meaningful at first
// paint. This module's job is to:
//   1. Expose the canonical list of 3 top-level routes (재고관리 / 양산계획 /
//      대시보드) — Req 3.2 mandates "only these 3 items".
//   2. Toggle the .is-active class on the link matching the current route so
//      the active nav item is visually emphasized (Req 3.4).
//   3. Intercept link clicks and update window.location.hash; the actual route
//      change is driven by the hashchange listener inside app.js. This keeps
//      navigation behaviour identical for clicks and direct hash typing
//      (Req 3.6: the routing structure stays intact even when sub-routes like
//      #/inventory/history are reached via in-page links).
// =============================================================================

/**
 * Canonical top-level sidebar items. Order matters — it is the display order
 * shown to the user.
 *
 * Note (2025-02): the historical Req 3.2 constrained this list to exactly 3
 * entries.  The 공급관리 page added a 4th entry as an explicit UX request
 * ("공급관리 페이지를 사이드바에 추가해 주세요") so the list now carries 4
 * items.  New tests document the expanded contract; the design.md link
 * table has been updated in the same PR.
 *
 * Order (2025-02 second revision): the user requested the flow
 *   재고관리 → 공급관리 → 양산계획 → 대시보드
 * so 공급관리 sits between 재고관리 and 양산계획 (parts sourcing feels
 * more upstream than production plans), and the dashboard remains the
 * final "read the results" step.
 *
 * `match` is the route prefix that activates the link. We use prefix match so
 * that #/inventory/history still highlights the [재고관리] entry (Req 3.6).
 */
export const SIDEBAR_ITEMS = Object.freeze([
  // 2026-07: 공지사항(부서 공유 대시보드)을 맨 위 + 기본 첫 화면으로 추가.
  { label: "공지사항", route: "#/notices", match: "#/notices" },
  { label: "재고관리", route: "#/inventory", match: "#/inventory" },
  {
    label: "공급관리",
    route: "#/supplier-management",
    match: "#/supplier-management",
  },
  {
    label: "양산계획",
    route: "#/production-plan",
    match: "#/production-plan",
  },
  { label: "대시보드", route: "#/dashboard", match: "#/dashboard" },
]);

/**
 * Pick the canonical match prefix for a given hash. Returns null when the
 * current route does not belong to any sidebar item (e.g. #/audit-log) so the
 * caller can clear all active states.
 *
 * @param {string} hash window.location.hash, may include sub-paths.
 * @returns {string | null} matching `match` prefix or null.
 */
export function resolveActiveMatch(hash) {
  if (typeof hash !== "string" || hash.length === 0) return null;
  for (const item of SIDEBAR_ITEMS) {
    if (hash === item.match || hash.startsWith(item.match + "/")) {
      return item.match;
    }
  }
  return null;
}

/**
 * Initialise the sidebar: bind click handlers and apply the initial active
 * state. Idempotent — calling it twice is safe (handlers are re-bound).
 *
 * @param {HTMLElement} navEl The <nav> container holding .sidebar__link anchors.
 * @param {() => string} getCurrentHash Function returning the current route hash.
 */
export function initSidebar(navEl, getCurrentHash) {
  if (!(navEl instanceof HTMLElement)) {
    throw new TypeError("initSidebar: navEl must be an HTMLElement");
  }

  // Click handler. We let the browser update window.location.hash via the
  // anchor's href; the router (app.js) listens for `hashchange`. We do not
  // call preventDefault — the native behaviour is exactly what we want and
  // makes mid-click / open-in-new-tab work naturally for power users.
  navEl.querySelectorAll(".sidebar__link").forEach((link) => {
    // Replace by cloning to drop any previously-bound listeners safely.
    const fresh = link.cloneNode(true);
    link.replaceWith(fresh);
  });

  // Apply initial active state after re-cloning.
  setActiveRoute(navEl, getCurrentHash());
}

/**
 * Update which sidebar link carries the .is-active class based on the given
 * route hash. Safe to call repeatedly on every route change.
 *
 * @param {HTMLElement} navEl
 * @param {string} hash
 */
export function setActiveRoute(navEl, hash) {
  const activeMatch = resolveActiveMatch(hash);
  navEl.querySelectorAll(".sidebar__link").forEach((link) => {
    const route = link.dataset.route ?? link.getAttribute("href") ?? "";
    if (activeMatch !== null && route === activeMatch) {
      link.classList.add("is-active");
      link.setAttribute("aria-current", "page");
    } else {
      link.classList.remove("is-active");
      link.removeAttribute("aria-current");
    }
  });
}
