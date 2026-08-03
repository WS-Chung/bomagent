// =============================================================================
// supplier_highlight.js — 공급관리 행 강조(깜빡임) 인텐트 전달 (2026-07)
// -----------------------------------------------------------------------------
// 공지사항의 '담당자/업체정보 변경' 알림에서 [대응] 을 누르면 공급관리 페이지로
// 이동하는데, 그 원인이 된 공급사 행만 깜빡이며 강조되어야 한다. 해시 라우팅으로
// 페이지가 새로 render 되므로, 이동 직전 대상 공급사 id 를 sessionStorage 에
// 담아두고 공급관리 페이지가 render 시 이를 소비(consume)해 해당 행을 강조한다.
//
//   requestSupplierHighlight(id)   — 이동 직전 대상 id 저장 (notices.js)
//   consumeSupplierHighlight()     — 저장된 id 를 읽고 즉시 비움(1회성)
// =============================================================================

const KEY = "bom_highlight_supplier";

/** 강조할 공급사 id 를 저장(다음 공급관리 페이지 render 에서 1회 소비). */
export function requestSupplierHighlight(id) {
  try {
    window.sessionStorage.setItem(KEY, String(id));
  } catch {
    /* sessionStorage 사용 불가 환경 — 무시 */
  }
}

/** 저장된 강조 대상 id 를 반환하고 비운다. 없으면 null. */
export function consumeSupplierHighlight() {
  try {
    const v = window.sessionStorage.getItem(KEY);
    if (v != null) window.sessionStorage.removeItem(KEY);
    return v;
  } catch {
    return null;
  }
}
