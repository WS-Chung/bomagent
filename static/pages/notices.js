// =============================================================================
// pages/notices.js — NoticesPage (공지사항, 2026-07)
// -----------------------------------------------------------------------------
// 부서 간 공유용 "한눈에 보기" 대시보드. 앱 진입 시 기본 첫 화면이며 사이드바
// 맨 위 항목이다. GET /api/notices 를 호출해 3개 섹션(양산/개발 · 공급관리 ·
// 자재관리)으로 나눠 렌더링한다:
//   - 각 섹션 상단: 중요 알림(발주 필요 / 대체 필요 / 담당자 변경) + [🛠 대응]
//   - 각 섹션 하단: 최근 7일 변동사항(감사로그 요약)
//
// [🛠 대응] 버튼 동작 (서버가 내려준 alert.action.type 기준):
//   - substitute_email → 대체품 확인 메일 초안 모달(substitute_email_modal.js)
//   - purchase         → 추천 대응 텍스트 팝업(confirm_dialog.js) + 대시보드 이동
//   - navigate         → action.route 로 해시 이동(예: 공급관리)
//
// 페이지/이벤트버스/apiFetch 패턴은 pages/dashboard.js 를 따른다.
// =============================================================================

import { openSubstituteEmailModal } from "/static/components/substitute_email_modal.js";
import { openConfirmDialog } from "/static/components/confirm_dialog.js";
import { openPurchaseOrderModal } from "/static/components/purchase_order_modal.js";
import { requestSupplierHighlight } from "/static/components/supplier_highlight.js";

const NOTICES_URL = "/api/notices";
const SUPPLIERS_URL = "/api/suppliers";

// 알림 level → chip 클래스(색상). tokens.css --color-risk-* 재사용.
const LEVEL_META = Object.freeze({
  critical: { label: "대체", cssClass: "notice-alert--critical" },
  warning: { label: "발주", cssClass: "notice-alert--warning" },
  info: { label: "정보", cssClass: "notice-alert--info" },
});

// ── Helpers ────────────────────────────────────────────────────────────────
async function apiFetch(url, init) {
  const merged = { cache: "no-store", ...(init || {}) };
  const resp = await fetch(url, merged);
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
    throw err;
  }
  return body;
}

/** ISO(UTC) → "M/D HH:MM" 짧은 로컬 표기. */
function fmtWhen(iso) {
  if (typeof iso !== "string" || iso.length === 0) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const mo = d.getMonth() + 1;
  const day = d.getDate();
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${mo}/${day} ${hh}:${mm}`;
}

function fmtText(v) {
  return v === null || v === undefined ? "" : String(v);
}

// =============================================================================
// render(container)
// =============================================================================
export function render(container) {
  const state = {
    data: null,
    suppliers: [],
    days: 7, // 최근 변동 조회 기간(1~7)
    loading: false,
    error: null,
    requestKey: 0,
  };

  container.innerHTML = "";
  const root = document.createElement("section");
  root.className = "notices-page";
  container.appendChild(root);

  // ── Toolbar (최근 변동 기간 토글) ──────────────────────────────────────
  const toolbar = document.createElement("div");
  toolbar.className = "notices-toolbar";
  const periodLabel = document.createElement("label");
  periodLabel.className = "notices-toolbar__label";
  periodLabel.textContent = "최근 변동 기간";
  periodLabel.htmlFor = "notices-period-select";
  const periodSelect = document.createElement("select");
  periodSelect.id = "notices-period-select";
  periodSelect.className = "notices-period-select";
  periodSelect.setAttribute("aria-label", "최근 변동 조회 기간(일)");
  for (let d = 1; d <= 7; d += 1) {
    const opt = document.createElement("option");
    opt.value = String(d);
    opt.textContent = `${d}일`;
    if (d === state.days) opt.selected = true;
    periodSelect.appendChild(opt);
  }
  periodSelect.addEventListener("change", () => {
    const v = Number(periodSelect.value);
    state.days = Number.isFinite(v) ? v : 7;
    fetchNotices();
  });
  toolbar.append(periodLabel, periodSelect);
  root.appendChild(toolbar);

  // ── Summary strip ──────────────────────────────────────────────────────
  const summary = document.createElement("div");
  summary.className = "notices-summary";
  root.appendChild(summary);

  // ── Status bar ─────────────────────────────────────────────────────────
  const statusBar = document.createElement("div");
  statusBar.className = "notices-status";
  root.appendChild(statusBar);

  // ── Section grid ───────────────────────────────────────────────────────
  const grid = document.createElement("div");
  grid.className = "notices-grid";
  root.appendChild(grid);

  // ── Render functions ───────────────────────────────────────────────────
  function renderStatus() {
    if (state.loading) {
      statusBar.textContent = "불러오는 중…";
      statusBar.dataset.kind = "loading";
    } else if (state.error) {
      statusBar.textContent = `오류: ${state.error}`;
      statusBar.dataset.kind = "error";
    } else {
      statusBar.textContent = "";
      statusBar.dataset.kind = "";
    }
  }

  function countAlerts(kind) {
    if (!state.data || !Array.isArray(state.data.sections)) return 0;
    let n = 0;
    for (const sec of state.data.sections) {
      for (const a of sec.alerts || []) {
        if (a.kind === kind) n += 1;
      }
    }
    return n;
  }

  function totalRecent() {
    if (!state.data || !Array.isArray(state.data.sections)) return 0;
    return state.data.sections.reduce(
      (acc, s) => acc + (s.recent_total || 0),
      0,
    );
  }

  function renderSummary() {
    summary.innerHTML = "";
    if (!state.data) return;
    const cards = [
      { label: `최근 ${state.days}일 변동`, value: totalRecent(), tone: "neutral" },
      { label: "발주 필요", value: countAlerts("order"), tone: "warning" },
      { label: "대체 필요", value: countAlerts("substitute"), tone: "critical" },
      {
        label: "담당자 변경",
        value: countAlerts("contact_change"),
        tone: "info",
      },
    ];
    for (const c of cards) {
      const el = document.createElement("div");
      el.className = "notices-stat";
      el.dataset.tone = c.tone;
      const val = document.createElement("span");
      val.className = "notices-stat__value";
      val.textContent = c.value.toLocaleString("ko-KR");
      const lab = document.createElement("span");
      lab.className = "notices-stat__label";
      lab.textContent = c.label;
      el.append(val, lab);
      summary.appendChild(el);
    }
  }

  function buildAlert(alert) {
    const meta = LEVEL_META[alert.level] || LEVEL_META.info;
    const li = document.createElement("li");
    li.className = `notice-alert ${meta.cssClass}`;

    const badge = document.createElement("span");
    badge.className = "notice-alert__badge";
    badge.textContent = meta.label;

    const textWrap = document.createElement("div");
    textWrap.className = "notice-alert__text";
    const title = document.createElement("div");
    title.className = "notice-alert__title";
    // 종류별 헤드라인: 대체=부품, 발주=공급사+건수, 담당자변경=공급사명.
    let headline = alert.title;
    if (alert.part) {
      const p = alert.part;
      headline = `${alert.title} — ${fmtText(p.mfr_part_number)} (${fmtText(p.self_part_number)})`;
    } else if (typeof alert.count === "number") {
      const sname = (alert.supplier && alert.supplier.name) || "미지정";
      headline = `${alert.title} — ${sname} (${alert.count}건)`;
    } else if (alert.supplier_name) {
      headline = `${alert.title} — ${fmtText(alert.supplier_name)}`;
    }
    title.textContent = headline;
    const detail = document.createElement("div");
    detail.className = "notice-alert__detail";
    detail.textContent = fmtText(alert.detail);
    textWrap.append(title, detail);

    const respondBtn = document.createElement("button");
    respondBtn.type = "button";
    respondBtn.className = "notice-respond-btn";
    respondBtn.textContent = "🛠 대응";
    respondBtn.setAttribute("aria-label", `${alert.title} 대응`);
    respondBtn.addEventListener("click", () => onRespond(alert));

    li.append(badge, textWrap, respondBtn);
    return li;
  }

  function buildRecentItem(change) {
    const li = document.createElement("li");
    li.className = "notice-change";
    const when = document.createElement("span");
    when.className = "notice-change__when";
    when.textContent = fmtWhen(change.changed_at);
    const summ = document.createElement("span");
    summ.className = "notice-change__summary";
    summ.textContent = fmtText(change.summary);
    const ref = document.createElement("span");
    ref.className = "notice-change__ref";
    ref.textContent = change.target_row_id ? `#${change.target_row_id}` : "";
    li.append(when, summ, ref);
    return li;
  }

  function buildSectionCard(section) {
    const card = document.createElement("section");
    card.className = "notice-card";
    card.dataset.section = section.key;

    const head = document.createElement("header");
    head.className = "notice-card__head";
    const h = document.createElement("h2");
    h.className = "notice-card__title";
    h.textContent = section.label;
    const count = document.createElement("span");
    count.className = "notice-card__count";
    count.textContent = `최근 ${(section.recent_total || 0).toLocaleString("ko-KR")}건`;
    head.append(h, count);
    card.appendChild(head);

    // 중요 알림
    const alertsWrap = document.createElement("div");
    alertsWrap.className = "notice-card__alerts";
    const alerts = section.alerts || [];
    if (alerts.length > 0) {
      const ul = document.createElement("ul");
      ul.className = "notice-alert-list";
      for (const a of alerts) ul.appendChild(buildAlert(a));
      alertsWrap.appendChild(ul);
    } else {
      const empty = document.createElement("p");
      empty.className = "notice-empty";
      empty.textContent = "중요 알림 없음";
      alertsWrap.appendChild(empty);
    }
    card.appendChild(alertsWrap);

    // 최근 변동
    const changesLabel = document.createElement("div");
    changesLabel.className = "notice-card__subhead";
    changesLabel.textContent = `최근 ${state.days}일 변동`;
    card.appendChild(changesLabel);

    const changes = section.recent_changes || [];
    if (changes.length > 0) {
      const ul = document.createElement("ul");
      ul.className = "notice-change-list";
      for (const c of changes) ul.appendChild(buildRecentItem(c));
      card.appendChild(ul);
    } else {
      const empty = document.createElement("p");
      empty.className = "notice-empty";
      empty.textContent = "최근 변동 없음";
      card.appendChild(empty);
    }

    return card;
  }

  function renderGrid() {
    grid.innerHTML = "";
    if (!state.data || !Array.isArray(state.data.sections)) return;
    for (const section of state.data.sections) {
      grid.appendChild(buildSectionCard(section));
    }
  }

  function renderAll() {
    renderStatus();
    renderSummary();
    renderGrid();
  }

  // ── '대응' 액션 ─────────────────────────────────────────────────────────
  function onRespond(alert) {
    const action = alert.action || {};

    // 대체 필요 → 대체품 확인 메일 초안.
    if (action.type === "substitute_email" && alert.part) {
      openSubstituteEmailModal({
        part: alert.part,
        suppliers: state.suppliers,
      });
      return;
    }

    // 발주 필요(공급사 단위) → 해당 공급사 발주서 즉시 생성.
    if (action.type === "purchase_order") {
      // 전체 공급사 상세(연락처/사업자번호 등)를 로컬 캐시에서 찾아 넘겨
      // 발주서 상단 공급자 블록이 완전히 채워지도록 한다. 미지정이면 최소값.
      const sid = alert.supplier && alert.supplier.id;
      const full =
        (sid != null &&
          state.suppliers.find((s) => s.id === sid)) ||
        alert.supplier ||
        { id: null, name: "미지정" };
      openPurchaseOrderModal({ supplier: full, rows: alert.parts || [] });
      return;
    }

    // 담당자/업체정보 변경 → 공급관리 페이지 이동 + 해당 업체 행 강조(깜빡임).
    if (action.type === "navigate" && action.route) {
      if (alert.supplier_id != null) {
        requestSupplierHighlight(alert.supplier_id);
      }
      window.location.hash = action.route;
      return;
    }

    // Fallback — 알 수 없는 액션이면 안내만.
    openConfirmDialog({
      title: alert.title || "대응",
      message: fmtText(alert.detail) || "추천 대응 정보가 없습니다.",
      confirmLabel: "확인",
      cancelLabel: "닫기",
    });
  }

  // ── Data fetch ──────────────────────────────────────────────────────────
  async function fetchSuppliers() {
    try {
      const body = await apiFetch(SUPPLIERS_URL);
      state.suppliers = Array.isArray(body) ? body : [];
    } catch {
      state.suppliers = [];
    }
  }

  async function fetchNotices() {
    const key = ++state.requestKey;
    state.loading = true;
    state.error = null;
    renderStatus();
    try {
      const body = await apiFetch(`${NOTICES_URL}?days=${state.days}`);
      if (key !== state.requestKey) return; // stale
      state.data = body;
      state.loading = false;
      renderAll();
    } catch (err) {
      if (key !== state.requestKey) return;
      state.loading = false;
      state.error =
        err && err.message ? err.message : "공지사항을 불러오지 못했습니다";
      renderAll();
    }
  }

  // ── External event listeners — upstream 변동 시 재조회 ─────────────────
  function onUpstreamChanged() {
    fetchNotices();
  }
  window.addEventListener("parts:changed", onUpstreamChanged);
  window.addEventListener("bom:changed", onUpstreamChanged);
  window.addEventListener("production_plan:changed", onUpstreamChanged);
  window.addEventListener("suppliers:changed", onUpstreamChanged);

  // ── First load ──────────────────────────────────────────────────────────
  fetchSuppliers();
  fetchNotices();
}
