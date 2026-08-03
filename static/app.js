// =============================================================================
// app.js — SPA entry: hash router + page-transition fade
// -----------------------------------------------------------------------------
// Source: design.md §9.1, §9.2
// Validates: Requirements 3.3, 3.4, 3.5, 3.6, 18.7
//
// Responsibilities
//   1. Hash-based router. Routes (design §9.1):
//        #/inventory          (default)
//        #/inventory/history
//        #/production-plan
//        #/dashboard
//        #/audit-log
//      Hash routing was chosen so reloads work from a static file mount
//      without server-side rewrites (design §9.1 note + Req 3.6).
//   2. Page-fade transitions on route change. The .page-body element fades
//      out (opacity 1→0, 220ms), swaps inner HTML for the new page, then
//      fades back in (opacity 0→1, 220ms). Timing uses the
//      --duration-fade / --easing-fade tokens (Req 3.5, 18.7).
//   3. Active-state sync of the sidebar (Req 3.4) via setActiveRoute.
//   4. Page-title sync inside the page header (Req 18.9).
//
// Each route delegates rendering to a `pages/*.js` module that exports
// `render(container)`. The page modules ship as placeholders today; the
// concrete implementations are filled in by tasks 2.5, 3.5, 4.5, 5.4, 6.2.
// This indirection means future tasks need only edit their page module —
// they never have to touch the router.
// =============================================================================

import { initSidebar, setActiveRoute } from "/static/components/sidebar.js";
import { initChatPanel } from "/static/components/chat_panel.js";
import * as noticesPage from "/static/pages/notices.js";
import * as inventoryPage from "/static/pages/inventory.js";
import * as receivingHistoryPage from "/static/pages/receiving_history.js";
import * as productionPlanPage from "/static/pages/production_plan.js";
import * as dashboardPage from "/static/pages/dashboard.js";
import * as auditLogPage from "/static/pages/audit_log.js";
import * as supplierManagementPage from "/static/pages/supplier_management.js";

// ──────────────────────────── Route table ──────────────────────────────────
//
// Each route maps to { title, render }. `render(container)` mutates the
// supplied #page-body element directly — this keeps page modules in charge
// of their own DOM (event listeners, sub-components, etc.) while the router
// stays neutral.
//
// The placeholder pages will be replaced by real implementations in tasks
// 2.5 (inventory), 3.5 (receiving history), 4.5 (production plan), 5.4
// (dashboard), 6.2 (audit log).
const ROUTES = Object.freeze({
  "#/notices": { title: "공지사항", render: noticesPage.render },
  "#/inventory": { title: "재고관리", render: inventoryPage.render },
  "#/inventory/history": {
    title: "입고 이력",
    render: receivingHistoryPage.render,
  },
  "#/production-plan": {
    title: "양산계획",
    render: productionPlanPage.render,
  },
  "#/dashboard": { title: "대시보드", render: dashboardPage.render },
  "#/supplier-management": {
    title: "공급관리",
    render: supplierManagementPage.render,
  },
  "#/audit-log": { title: "감사 로그", render: auditLogPage.render },
});

// Default route when the URL has no hash. 2026-07: 공지사항 대시보드가
// 앱 진입 시 기본 첫 화면(부서 공유 "한눈에 보기").
const DEFAULT_ROUTE = "#/notices";

// Fade duration in ms — MUST stay in sync with --duration-fade in tokens.css.
// We read the computed value at boot so the timing always reflects the token,
// avoiding silent drift if the token changes (Req 18.7).
function resolveFadeDurationMs() {
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue("--duration-fade")
    .trim();
  // Accepts "220ms" or "0.22s". Fall back to design spec value on parse failure.
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

// ───────────────────────────── Router core ─────────────────────────────────

/**
 * Resolve which route entry to render for an arbitrary hash. Unknown hashes
 * fall back to the default (Req 3.3 — no broken UI on stray fragments).
 *
 * @param {string} hash
 * @returns {{ key: string, entry: { title: string, render: (el: HTMLElement) => void } }}
 */
function resolveRoute(hash) {
  if (hash && Object.prototype.hasOwnProperty.call(ROUTES, hash)) {
    return { key: hash, entry: ROUTES[hash] };
  }
  return { key: DEFAULT_ROUTE, entry: ROUTES[DEFAULT_ROUTE] };
}

/**
 * Run the page transition: fade-out → swap content → fade-in.
 *
 * We use the CSS class `.is-fading` (opacity 0) and rely on the transition
 * declared in layout.css; the explicit timeout ensures we wait the full
 * duration even if the user is on a tab where transitionend is throttled.
 *
 * @param {HTMLElement} bodyEl  #page-body
 * @param {(el: HTMLElement) => void} renderFn  Page render function.
 * @param {number} durMs  Fade duration in ms.
 */
function transitionTo(bodyEl, renderFn, durMs) {
  // Fade out — let the CSS transition run.
  bodyEl.classList.add("is-fading");

  // Wait one duration before swapping content, then fade back in. Using a
  // single setTimeout matches the "메인 페이드 220ms" acceptance criterion
  // (Req 3.5) and keeps the swap invisible at opacity 0.
  window.setTimeout(() => {
    // Clear previous page contents before letting the module render —
    // page modules expect a clean container.
    bodyEl.innerHTML = "";
    renderFn(bodyEl);
    // Force a paint frame so the browser registers innerHTML at opacity 0
    // before we transition back. requestAnimationFrame is the cheapest sync.
    requestAnimationFrame(() => {
      bodyEl.classList.remove("is-fading");
    });
  }, durMs);
}

/**
 * Render the route currently encoded in window.location.hash. Idempotent.
 *
 * On a stray / empty hash we *replace* the URL with DEFAULT_ROUTE so the user
 * sees a stable hash in the address bar after a reload, which also makes the
 * "hash route preserved after refresh" criterion observable (Req 3.6).
 *
 * @param {{ navEl: HTMLElement, titleEl: HTMLElement, bodyEl: HTMLElement,
 *           fadeMs: number, isInitial: boolean }} ctx
 */
function renderCurrentRoute(ctx) {
  const { navEl, titleEl, bodyEl, fadeMs, isInitial } = ctx;
  const rawHash = window.location.hash;
  const { key, entry } = resolveRoute(rawHash);

  // Normalize address bar for empty / unknown hashes. We use replaceState
  // (via history) to avoid pushing an extra entry into the back stack.
  if (rawHash !== key) {
    history.replaceState(null, "", key);
  }

  // Update sidebar active state + page title synchronously so the user sees
  // them snap into place at the same time as the fade-in begins.
  setActiveRoute(navEl, key);
  titleEl.textContent = entry.title;
  document.title = `${entry.title} · BOM 자재관리 에이전트`;

  if (isInitial) {
    // First paint: skip the fade-out half (there is no previous content).
    bodyEl.innerHTML = "";
    entry.render(bodyEl);
    return;
  }

  transitionTo(bodyEl, entry.render, fadeMs);
}

// ──────────────────────────────── Boot ────────────────────────────────────
function boot() {
  const navEl = document.getElementById("sidebar-nav");
  const titleEl = document.getElementById("page-title");
  const bodyEl = document.getElementById("page-body");

  if (!navEl || !titleEl || !bodyEl) {
    // Defensive: index.html and app.js are deployed together; if any of
    // these are missing we have a deployment bug rather than a runtime one.
    // eslint-disable-next-line no-console
    console.error("app.js: required DOM nodes missing", {
      navEl,
      titleEl,
      bodyEl,
    });
    return;
  }

  const fadeMs = resolveFadeDurationMs();

  initSidebar(navEl, () => window.location.hash);

  // 2026-07: 앱 전역 챗봇 패널을 1회 초기화. #page-body 밖(document.body)에
  // 부착되므로 라우팅으로 페이지가 교체돼도 대화/열림 상태가 보존된다.
  initChatPanel();

  // Initial render — no fade-out (nothing to fade from).
  renderCurrentRoute({ navEl, titleEl, bodyEl, fadeMs, isInitial: true });

  // Subsequent route changes — full fade.
  window.addEventListener("hashchange", () => {
    renderCurrentRoute({ navEl, titleEl, bodyEl, fadeMs, isInitial: false });
  });
}

// Run after DOM is parsed. Because we load with `<script type="module">`,
// execution is already deferred — but the listener is harmless if the
// document is already interactive.
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot, { once: true });
} else {
  boot();
}
