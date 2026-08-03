// =============================================================================
// substitute_email_modal.js — 대체품 확인 요청 메일 초안 (2026-07)
// -----------------------------------------------------------------------------
// Source: 2026-07 UX request — the dashboard's 위험도 컬럼에서 '대체'
// (SUBSTITUTE) 등급 부품은 chip 대신 버튼으로 렌더링되며, 이 버튼을 누르면
// 아래 모달이 열린다.  모달은 공급사에 보낼 "대체품 확인 요청" 이메일 초안을
// 세 영역으로 제시한다:
//
//   1. 제목  — 고정 문구 "[AXMOS]대체품 확인 요청의 건" (읽기 전용).
//   2. 받는 사람 — 공급사 드롭다운.  업체를 고르면 옆 필드에 해당 업체
//                  담당자 이메일(contact_email)이 자동 입력된다.
//   3. 본문  — 현재 부족한 부품명을 명시하며 대체품 유무를 문의하는 정중한
//              초안.  메일 끝에 첨부파일이 있음을 함께 안내한다.
//
// 첨부파일명은 "<부품명>_Datasheet.pdf" 로 안내한다.  (원 요청의 철자
// "Datasheeet" 는 오타로 판단하여 표준 철자 "Datasheet" 로 표기.)
//
// [메일 앱으로 열기] 버튼은 현재 받는사람 이메일 / 고정 제목 / 본문으로
// ``mailto:`` 링크를 구성해 로컬 메일 클라이언트를 연다 (외부 HTTP 아님).
// [닫기] 는 표준 fade-out.
//
// Public API:
//   openSubstituteEmailModal({ part, suppliers }) → { close }
// =============================================================================

// 고정 제목 — 요구사항에 명시된 문구를 그대로 사용한다.
export const SUBSTITUTE_EMAIL_SUBJECT = "[AXMOS]대체품 확인 요청의 건";

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
 * 부품을 대표하는 사람이 읽을 수 있는 이름.  공급사에게는 제조사 부품번호가
 * 가장 식별력이 높으므로 mfr_part_number 를 우선 사용하고, 없으면 CAD 부품명 →
 * 자체 채번번호 순으로 폴백한다.
 */
function partDisplayName(part) {
  if (!part) return "해당 부품";
  return (
    part.mfr_part_number ||
    part.cad_partname ||
    part.self_part_number ||
    "해당 부품"
  );
}

/** 첨부 데이터시트 파일명 — "<부품명>_Datasheet.pdf". */
function attachmentFileName(part) {
  const base =
    (part && (part.mfr_part_number || part.self_part_number)) || "부품";
  return `${base}_Datasheet.pdf`;
}

/**
 * 본문 초안 생성.  부족 부품명을 명시하고 대체품 유무를 정중히 문의하며,
 * 끝에 첨부파일 안내를 포함한다 (2026-07 요구사항).
 */
function buildDraftBody(part) {
  const name = partDisplayName(part);
  const mfr = (part && part.mfr_part_number) || name;
  const attachment = attachmentFileName(part);
  return [
    "안녕하세요, 주식회사 엑스모스 구매팀입니다.",
    "",
    `당사에서 사용 중인 아래 부품의 수급이 향후 6개월 이내에 불안정할 것으로 예상됩니다.`,
    "",
    `- 부품명: ${name}`,
    `- 제조사 부품번호: ${mfr}`,
    "",
    "해당 부품은 납기(L/T)가 길어 사전 발주만으로는 적기 수급이 어려운 상황입니다.",
    "동등한 사양으로 사용할 수 있는 대체품이 있는지 확인 부탁드립니다.",
    "가능하시다면 대체 가능 품목의 사양서와 예상 납기도 함께 회신해 주시면 감사하겠습니다.",
    "",
    "바쁘신 와중에 검토해 주셔서 감사합니다.",
    "",
    "주식회사 엑스모스 구매팀 드림",
    "",
    `※ 첨부파일: ${attachment} (해당 부품 데이터시트)`,
  ].join("\n");
}

// =============================================================================
// openSubstituteEmailModal({ part, suppliers }) — entry point
// =============================================================================
/**
 * 대체품 확인 요청 메일 초안 모달을 연다.
 *
 * @param {object} arg
 * @param {object} arg.part      대시보드 forecast row (self_part_number /
 *                               mfr_part_number / cad_partname / supplier 등).
 * @param {Array<object>} arg.suppliers  전체 공급사 목록(각 항목은
 *                               {id, name, contact_person?, contact_email?}).
 * @returns {{ close: () => void }}
 */
export function openSubstituteEmailModal({ part, suppliers }) {
  const fadeMs = resolveFadeDurationMs();
  const portal = document.getElementById("modal-portal") || document.body;
  const supplierList = Array.isArray(suppliers) ? suppliers : [];

  // ── Modal scaffold ─────────────────────────────────────────────────
  const backdrop = document.createElement("div");
  backdrop.className = "modal__backdrop substitute-email-backdrop";

  const panel = document.createElement("div");
  panel.className = "modal__panel substitute-email-panel";
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-modal", "true");
  panel.setAttribute("aria-label", "대체품 확인 요청 메일 초안");

  // ── Header ──────────────────────────────────────────────────────────
  const header = document.createElement("div");
  header.className = "substitute-email-header";
  header.innerHTML = `
    <h2 class="substitute-email-title">대체품 확인 요청 메일</h2>
    <p class="substitute-email-subtitle">${partDisplayName(part)} — 대체품 문의 초안</p>
  `;
  panel.appendChild(header);

  const form = document.createElement("div");
  form.className = "substitute-email-form";

  // ── (1) 제목 (고정, 읽기 전용) ─────────────────────────────────────
  const subjectField = document.createElement("div");
  subjectField.className = "substitute-email-field";
  const subjectLabel = document.createElement("label");
  subjectLabel.className = "substitute-email-label";
  subjectLabel.textContent = "제목";
  subjectLabel.htmlFor = "substitute-email-subject";
  const subjectInput = document.createElement("input");
  subjectInput.type = "text";
  subjectInput.id = "substitute-email-subject";
  subjectInput.className = "substitute-email-input substitute-email-input--fixed";
  subjectInput.value = SUBSTITUTE_EMAIL_SUBJECT;
  subjectInput.readOnly = true;
  subjectInput.setAttribute("aria-label", "메일 제목 (고정)");
  subjectField.append(subjectLabel, subjectInput);
  form.appendChild(subjectField);

  // ── (2) 받는 사람 (공급사 드롭다운 → 담당자 이메일 자동 입력) ───────
  const toField = document.createElement("div");
  toField.className = "substitute-email-field";
  const toLabel = document.createElement("label");
  toLabel.className = "substitute-email-label";
  toLabel.textContent = "받는 사람";
  toLabel.htmlFor = "substitute-email-supplier";

  const toRow = document.createElement("div");
  toRow.className = "substitute-email-to-row";

  const supplierSelect = document.createElement("select");
  supplierSelect.id = "substitute-email-supplier";
  supplierSelect.className = "substitute-email-select";
  supplierSelect.setAttribute("aria-label", "공급사 선택");
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "공급사 선택…";
  supplierSelect.appendChild(placeholder);
  for (const sup of supplierList) {
    const opt = document.createElement("option");
    opt.value = String(sup.id);
    opt.textContent = sup.name;
    supplierSelect.appendChild(opt);
  }

  const emailInput = document.createElement("input");
  emailInput.type = "email";
  emailInput.className = "substitute-email-input substitute-email-input--email";
  emailInput.placeholder = "담당자 이메일";
  emailInput.setAttribute("aria-label", "받는사람 이메일");

  // 업체를 고르면 해당 업체 담당자 이메일을 자동 입력한다.
  function fillEmailFor(supplierId) {
    const match = supplierList.find((s) => String(s.id) === String(supplierId));
    emailInput.value = (match && match.contact_email) || "";
  }
  supplierSelect.addEventListener("change", () => {
    fillEmailFor(supplierSelect.value);
  });

  toRow.append(supplierSelect, emailInput);
  toField.append(toLabel, toRow);
  form.appendChild(toField);

  // 부품이 이미 공급사를 가진 경우 해당 공급사를 기본 선택 + 이메일 자동입력.
  if (part && part.supplier && part.supplier.id != null) {
    const preId = String(part.supplier.id);
    const hasOption = supplierList.some((s) => String(s.id) === preId);
    if (hasOption) {
      supplierSelect.value = preId;
      fillEmailFor(preId);
    }
  }

  // ── (3) 본문 (초안 프리필) ─────────────────────────────────────────
  const bodyField = document.createElement("div");
  bodyField.className = "substitute-email-field";
  const bodyLabel = document.createElement("label");
  bodyLabel.className = "substitute-email-label";
  bodyLabel.textContent = "본문";
  bodyLabel.htmlFor = "substitute-email-body";
  const bodyInput = document.createElement("textarea");
  bodyInput.id = "substitute-email-body";
  bodyInput.className = "substitute-email-textarea";
  bodyInput.rows = 14;
  bodyInput.value = buildDraftBody(part);
  bodyInput.setAttribute("aria-label", "메일 본문");
  bodyField.append(bodyLabel, bodyInput);
  form.appendChild(bodyField);

  panel.appendChild(form);

  // ── Action bar ──────────────────────────────────────────────────────
  const actions = document.createElement("div");
  actions.className = "substitute-email-actions";

  const openMailBtn = document.createElement("button");
  openMailBtn.type = "button";
  openMailBtn.className = "btn btn--primary substitute-email-action-btn";
  openMailBtn.textContent = "메일 앱으로 열기";
  openMailBtn.addEventListener("click", () => {
    // mailto: 링크로 로컬 메일 클라이언트를 연다 (외부 HTTP 아님).
    const to = encodeURIComponent(emailInput.value.trim());
    const subject = encodeURIComponent(SUBSTITUTE_EMAIL_SUBJECT);
    const body = encodeURIComponent(bodyInput.value);
    const href = `mailto:${to}?subject=${subject}&body=${body}`;
    const a = document.createElement("a");
    a.href = href;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    a.remove();
  });

  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.className = "btn btn--secondary substitute-email-action-btn";
  closeBtn.textContent = "닫기";
  closeBtn.addEventListener("click", () => requestClose());

  actions.append(openMailBtn, closeBtn);
  panel.appendChild(actions);

  backdrop.appendChild(panel);
  portal.appendChild(backdrop);

  // ── Fade in ────────────────────────────────────────────────────────
  backdrop.classList.add("is-entering");
  requestAnimationFrame(() => {
    backdrop.classList.remove("is-entering");
    backdrop.classList.add("is-open");
  });

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
    if (ev.target === backdrop) requestClose();
  });

  return {
    close: requestClose,
  };
}
