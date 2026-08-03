// =============================================================================
// i18n.js — KR / EN 표시 전환 레이어 (데모 · 화면녹화용)
// -----------------------------------------------------------------------------
// 페이지/컴포넌트 코드는 전혀 수정하지 않는다.  렌더링된 한국어 텍스트를
// 영어로 치환하는 표시 전용(display-only) 레이어이며, 사이드바의 [KR|EN]
// 토글로 어느 화면에서든 즉시 상호 전환된다(새로고침 없음).
//
//   · 기본값은 한국어. 선택한 언어는 localStorage 에 남아 다음 방문에도 유지.
//   · EN 으로 바꿀 때 바꾼 값의 원문을 모두 기억해 두었다가, KR 로 되돌릴 때
//     그대로 복원한다.  따라서 어느 화면에서 전환해도 손실이 없다.
//   · 값(value)이 아니라 표시(text)만 바꾸므로 API 요청 본문은 그대로다.
//     드롭다운도 option 의 value(=id)는 유지되고 라벨만 영어로 보인다.
//
// 치환은 3단계다.
//   1) EXACT  — 문장 전체가 일치하면 교체 (가장 정확)
//   2) RULES  — 숫자·부품명 등 동적 값이 섞인 문장을 정규식으로 교체
//   3) WORDS  — 남은 한글에 대해 긴 낱말부터 부분 치환 (누락 방지 안전망)
// =============================================================================

const STORAGE_KEY = "bomagent.lang";
const HANGUL = /[가-힣]/;

// ── 1) 문장 단위 사전 ────────────────────────────────────────────────────
const EXACT = {
  // AppShell / navigation
  "BOM 자재관리 에이전트": "BOM Material Management Agent",
  공지사항: "Notices",
  재고관리: "Inventory",
  공급관리: "Suppliers",
  양산계획: "Production Plan",
  대시보드: "Dashboard",
  "주 메뉴": "Main menu",
  "감사 로그": "Audit Log",
  "입고 이력": "Receiving History",
  "← 재고관리": "← Inventory",

  // 공통 액션 / 상태
  저장: "Save",
  취소: "Cancel",
  추가: "Add",
  수정: "Edit",
  삭제: "Delete",
  확인: "Confirm",
  완료: "Done",
  닫기: "Close",
  인쇄: "Print",
  전송: "Send",
  초기화: "Reset",
  유지: "Keep",
  이전: "Prev",
  다음: "Next",
  선택: "Select",
  "필터 적용": "Apply",
  "페이지 이동": "Pagination",
  "불러오는 중…": "Loading…",
  "오류:": "Error:",
  "+ 신규 추가": "+ Add new",
  "+ 추가": "+ Add",
  "(선택 안 함)": "(none)",
  "이름을 입력하세요": "Enter a name",
  "이름 입력 후 추가": "Type a name, then Add",
  "추가에 실패했습니다": "Failed to add",
  "생성 응답이 올바르지 않습니다": "Unexpected create response",
  "변경된 내용이 없습니다": "Nothing changed",
  "검색 결과 없음": "No results",
  "검색 실패": "Search failed",
  "부품 검색": "Search parts",
  "선택됨:": "Selected:",
  미지정: "Unassigned",

  // 재고관리
  창고관리: "Warehouse Map",
  "+ 입고": "+ Receive",
  자체PN: "Internal P/N",
  분류: "Category",
  공급사: "Supplier",
  단가: "Unit Price",
  재고: "Stock",
  보관위치: "Location",
  "🔍 자체PN / MfrPN / 공급사 / 제조사 검색":
    "🔍 Search internal P/N · MPN · supplier · manufacturer",
  "🔍 자체PN 또는 MfrPN 검색": "🔍 Search internal P/N or MPN",
  "🔍 자체PN 또는 MfrPN 검색 (최대 50건)":
    "🔍 Search internal P/N or MPN (max 50)",
  "클릭하여 단가 수정": "Click to edit unit price",
  "재고는 입고/취소로만 변경됩니다":
    "Stock changes only through receiving / cancellation",
  "보관위치 확인": "View storage location",
  "부품 목록을 불러오지 못했습니다": "Failed to load parts",
  "등록된 부품이 없습니다": "No parts registered",
  "검색 결과가 없습니다": "No search results",
  "부품 정보를 저장했습니다": "Part saved",
  "입고 처리를 저장했습니다": "Receiving saved",
  "단가는 0 이상의 숫자여야 합니다": "Unit price must be 0 or greater",
  "단가 수정 실패": "Failed to update unit price",

  // 공급관리
  "+ 공급사 추가": "+ Add Supplier",
  "공급사 추가": "Add Supplier",
  "정식 업체명": "Legal Name",
  담당자: "Contact",
  "담당자 연락처": "Phone",
  "담당자 E-mail": "Email",
  "사업자 주소": "Address",
  "업체정보 수정": "Edit",
  공급사명: "Supplier name",
  "공급사명을 입력해주세요": "Please enter a supplier name",
  "공급사 정보를 저장했습니다": "Supplier saved",
  "공급사를 추가했습니다": "Supplier added",
  "등록된 공급사가 없습니다": "No suppliers registered",
  "공급사 목록을 불러오지 못했습니다": "Failed to load suppliers",
  "담당자 미지정": "No contact",
  "(담당자 미지정)": "(no contact)",
  "(미지정)": "(unset)",
  "(온라인 채널 통합)": "(Online channels)",
  "(주소 미지정)": "(no address)",
  "(공급자 미지정)": "(no supplier)",
  "(사업자등록번호 미지정)": "(no business reg. no.)",

  // 양산계획
  "제품 / 월": "Product / Month",
  "+ 월": "+ Month",
  "+ 제품 추가": "+ Add Product",
  제품명: "Product name",
  "제품명 수정": "Rename product",
  "양산월 추가": "Add month",
  "BOM 편집": "Edit BOM",
  "제품 삭제": "Delete product",
  "제품 삭제 취소": "Undo product deletion",
  "제품 삭제 (저장 시 실제 삭제)": "Delete product (applied on Save)",
  "양산월 삭제": "Delete month",
  "삭제 취소": "Undo delete",
  "삭제 예약": "Delete pending",
  "더블클릭: 라벨 수정 · ✕: 월 삭제":
    "Double-click to rename · ✕ to delete the month",
  "양산계획의 셀 / 제품명 / 양산월 라벨 변경을 저장합니다 (BOM 편집은 자동 저장됩니다)":
    "Saves cell, product-name and month-label edits (BOM edits save automatically)",
  "등록된 제품 또는 양산월이 없습니다. 아래에서 제품을, 표 우측에서 월을 추가하세요.":
    "No products or months yet. Add a product below, or a month on the right of the table.",
  "수량은 정수여야 합니다": "Quantity must be an integer",
  "제품명은 비울 수 없습니다": "Product name cannot be empty",
  "양산월 라벨은 비울 수 없습니다": "Month label cannot be empty",
  "변경 사항이 저장 대기 중입니다": "Changes are pending — press Save",
  "삭제 예약된 제품은 수정할 수 없습니다":
    "A product marked for deletion cannot be edited",
  "삭제 예약된 제품의 셀은 수정할 수 없습니다":
    "Cells of a product marked for deletion cannot be edited",
  "저장할 변경 사항이 없습니다 (BOM 편집은 자동 저장되었습니다)":
    "Nothing to save (BOM edits were saved automatically)",
  "이 달의 양산계획 데이터가 모두 사라집니다.":
    "All production-plan data for this month will be removed.",
  "삭제가 예약되었습니다. [저장] 시 삭제됩니다.":
    "Deletion queued — it is applied when you press Save.",
  "[저장] 버튼을 눌러야 실제로 삭제됩니다.":
    "The deletion is applied only after you press Save.",

  // 대시보드
  위험도: "Risk",
  전체: "All",
  위험: "Critical",
  주의: "Watch",
  정상: "OK",
  대체: "Substitute",
  추천량: "Suggested",
  기준일: "As of",
  "발주서 자동작성": "Generate PO",
  "위험도 필터": "Risk filter",
  "공급사 필터": "Supplier filter",
  "대체품 확인 요청": "Request substitute",
  "필터 조건에 맞는 부품이 없습니다": "No parts match the current filters",
  "표시할 부품이 없습니다": "No parts to display",
  "대시보드를 불러오지 못했습니다": "Failed to load the dashboard",

  // 공지사항
  "최근 변동 기간": "Activity window",
  "최근 변동 조회 기간(일)": "Activity window (days)",
  "발주 필요": "Order needed",
  "대체 필요": "Substitute needed",
  "담당자 변경": "Contact changed",
  "양산/개발": "Production / R&D",
  자재관리: "Materials",
  발주: "Order",
  정보: "Info",
  대응: "Act",
  "🛠 대응": "🛠 Act",
  "최근 변동 없음": "No recent changes",
  "중요 알림 없음": "No alerts",
  "추천 대응 정보가 없습니다.": "No recommended action available.",
  "공지사항을 불러오지 못했습니다": "Failed to load notices",
  "대체 필요 대응": "Handle substitute alert",
  "발주 필요 대응": "Handle order alert",
  // 최근 변동 요약 라벨 (app/notices.py 의 _summarize_change 와 1:1)
  "부품 신규 등록": "Part registered",
  "부품 정보 수정": "Part updated",
  "부품 분류 추가": "Category added",
  "제조사 등록": "Manufacturer added",
  "제조사 정보 수정": "Manufacturer updated",
  "공급사 등록": "Supplier added",
  "공급사 정보 수정": "Supplier updated",
  "제품 추가": "Product added",
  "제품명 변경": "Product renamed",
  "BOM 생성": "BOM created",
  "BOM 라인 추가": "BOM line added",
  "BOM 라인 수정": "BOM line updated",
  "양산월 추가": "Month added",
  "양산월 라벨 변경": "Month renamed",
  "양산계획 입력": "Plan entered",
  "양산계획 수량 변경": "Plan quantity changed",
  "입고 등록": "Receipt registered",
  "창고 위치 추가": "Storage location added",
  "창고 위치 이동": "Storage location moved",
  "창고 위치 삭제": "Storage location removed",
  "담당자/업체정보 변경": "Contact / company info changed",
  "공급사 담당자/업체정보 변경": "Supplier contact / company info changed",

  // 입고 이력
  입고일자: "Received",
  수량: "Qty",
  매입단가: "Unit Cost",
  취소여부: "Status",
  취소됨: "Cancelled",
  "취소 처리": "Cancel",
  "입고 취소": "Cancel receiving",
  "이미 취소된 입고 건입니다": "This receipt is already cancelled",
  "취소 시 재고가 음수가 되어 처리할 수 없습니다":
    "Cancelling would drive stock negative",
  "계속하시겠습니까?": "Continue?",
  "입고 건을 취소했습니다": "Receipt cancelled",
  "취소 처리에 실패했습니다": "Failed to cancel the receipt",
  "조회된 입고 이력이 없습니다": "No receiving history",
  "입고 이력을 불러오지 못했습니다": "Failed to load receiving history",

  // 감사 로그
  "대상 테이블": "Table",
  "대상 행 ID": "Row ID",
  "변경 시각": "Changed at",
  컬럼명: "Column",
  액션: "Action",
  사용자: "User",
  "시작 시각": "From",
  "종료 시각": "To",
  "감사 로그 필터": "Audit log filter",
  "클릭하여 펼치기": "Click to expand",
  "클릭하여 접기": "Click to collapse",
  "조회된 변경 이력이 없습니다": "No audit entries",
  "감사 로그를 불러오지 못했습니다": "Failed to load the audit log",
  "예: 12": "e.g. 12",

  // 챗봇
  "AI 도우미": "AI Assistant",
  "AI 도우미 열기": "Open AI assistant",
  "AI 도우미 닫기": "Close AI assistant",
  "메시지 입력": "Message",
  "예) 지금 위험한 부품 몇 개야?": "e.g. How many parts are at risk now?",
  "안녕하세요! 재고·양산계획·부품 수급 위험도 등 무엇이든 물어보세요.":
    "Hi! Ask me anything about stock, production plans or supply risk.",
  "생각 중…": "Thinking…",
  "답변을 가져오지 못했습니다. 잠시 후 다시 시도해 주세요.":
    "Couldn't get a response. Please try again in a moment.",
  "응답을 이해하지 못했습니다.": "Could not read the response.",

  // 입고 모달
  입고: "Receive",
  "입고 모드": "Mode",
  "기존 부품": "Existing part",
  "신규 부품": "New part",
  "부품을 선택하세요": "Select a part",
  "분류 선택 시 자동 채번": "Auto-numbered once a category is chosen",
  "수량은 1 이상의 정수여야 합니다": "Quantity must be an integer of 1 or more",
  "매입단가는 0 이상이어야 합니다": "Unit cost must be 0 or greater",
  제조사: "Manufacturer",
  "L/T (주)": "L/T (weeks)",
  "신규 분류 Prefix (영문 대문자 2자):":
    "New category prefix (2 uppercase letters):",
  "Prefix 입력이 취소되었습니다": "Prefix entry cancelled",

  // 부품 편집 모달
  "부품 편집": "Edit Part",
  "재고 (readonly)": "Stock (read-only)",
  "(분류 기본값 사용)": "(use category default)",

  // BOM 모달
  "BOM 총액 (등록 단가 기준)": "BOM total (at registered unit price)",
  "BOM 라인이 없습니다": "No BOM lines",
  "BOM 라인 삭제": "Delete BOM line",
  "BOM 라인을 삭제하시겠습니까?": "Delete this BOM line?",
  "BOM 라인 삭제에 실패했습니다": "Failed to delete the BOM line",
  "BOM 라인 추가에 실패했습니다": "Failed to add the BOM line",
  "BOM 을 불러오지 못했습니다": "Failed to load the BOM",
  "pt 는 1 이상의 정수여야 합니다": "pt must be an integer of 1 or more",
  "pt 저장에 실패했습니다": "Failed to save pt",
  "이미 동일 부품이 BOM 에 등록되어 있습니다":
    "This part is already in the BOM",
  "먼저 검색 결과에서 부품을 선택하세요":
    "Pick a part from the search results first",
  "부품 검색 후 목록에서 선택하세요": "Search for a part, then pick it",
  "↵ Enter 로 선택 · ↑ ↓ 로 이동": "↵ Enter to select · ↑ ↓ to move",
  "Reference 를 변경했습니다": "Reference updated",
  "Reference 저장에 실패했습니다": "Failed to save the reference",

  // 창고
  "창고 배치도": "Warehouse layout",
  "+ 보관위치 추가": "+ Add location",
  "이름 입력 후 Enter": "Type a name, then press Enter",
  "지도 위의 원하는 위치를 클릭하세요": "Click the spot you want on the map",
  "핀을 드래그하여 위치를 옮기거나, 더블클릭으로 이름을 바꾸거나, 우클릭으로 삭제할 수 있습니다.":
    "Drag a pin to move it, double-click to rename, right-click to delete.",
  "새 마커 미리보기": "New marker preview",
  "마커 목록을 불러오지 못했습니다": "Failed to load markers",
  "보관위치 추가를 취소했습니다": "Cancelled adding a location",
  "마커 이동 실패": "Failed to move the marker",
  "이름 변경 실패": "Failed to rename",
  "마커 삭제 실패": "Failed to delete the marker",
  "마커 추가 실패": "Failed to add the marker",

  // 발주서
  "발 주 서": "PURCHASE ORDER",
  공급받는자: "Buyer",
  공급자: "Supplier",
  "주소:": "Address:",
  "담당자:": "Contact:",
  "사업자등록번호:": "Business Reg. No:",
  "사업자 등록번호:": "Business Reg. No:",
  "발주일자:": "PO Date:",
  순번: "#",
  품목명: "Item",
  "단가(원)": "Unit Price (KRW)",
  공급가액: "Amount",
  "총 공급가액": "Subtotal",
  "부가세 (10%)": "VAT (10%)",
  "총 계": "Total",
  "아래와 같이 요청 드립니다.": "We hereby place the following order.",
  "주식회사 엑스모스": "AXMOS Inc.",
  대표이사: "CEO",
  홍길동: "Gildong Hong",
  김이박: "Yipark Kim",
  "(인)": "(Seal)",
  "서울특별시 강남구 삼성동 135": "135 Samseong-dong, Gangnam-gu, Seoul",
  "발주서를 저장했습니다 (임시)": "Purchase order saved (stub)",

  // 대체품 메일
  "대체품 확인 요청 메일": "Substitute Request Email",
  "대체품 확인 요청 메일 초안": "Substitute request email draft",
  "메일 제목 (고정)": "Subject (fixed)",
  "[AXMOS]대체품 확인 요청의 건":
    "[AXMOS] Request to confirm a substitute part",
  "받는 사람": "Recipient",
  "받는사람 이메일": "Recipient email",
  "담당자 이메일": "Contact email",
  "공급사 선택": "Select supplier",
  "공급사 선택…": "Select a supplier…",
  "메일 본문": "Body",
  제목: "Subject",
  본문: "Body",
  부품: "Part",
  "해당 부품": "the part",
  "메일 앱으로 열기": "Open in mail app",
  "(해당 부품 데이터시트)": "(datasheet for this part)",
  "안녕하세요, 주식회사 엑스모스 구매팀입니다.":
    "Hello, this is the purchasing team at AXMOS Inc.",
  "당사에서 사용 중인 아래 부품의 수급이 향후 6개월 이내에 불안정할 것으로 예상됩니다.":
    "We expect supply of the part below to become unstable within the next six months.",
  "해당 부품은 납기(L/T)가 길어 사전 발주만으로는 적기 수급이 어려운 상황입니다.":
    "Its lead time is long enough that ordering early alone cannot secure delivery in time.",
  "동등한 사양으로 사용할 수 있는 대체품이 있는지 확인 부탁드립니다.":
    "Could you confirm whether an equivalent substitute part is available?",
  "가능하시다면 대체 가능 품목의 사양서와 예상 납기도 함께 회신해 주시면 감사하겠습니다.":
    "If possible, please also send the datasheet and expected lead time for any alternative.",
  "바쁘신 와중에 검토해 주셔서 감사합니다.":
    "Thank you for taking the time to review this.",
  "주식회사 엑스모스 구매팀 드림": "Purchasing Team, AXMOS Inc.",
  "- 부품명:": "- Part name:",
  "- 제조사 부품번호:": "- Manufacturer P/N:",
  "※ 첨부파일:": "※ Attachment:",

  // ── 데모 데이터 (표시 전용) ──────────────────────────────────────────
  구로반도체: "Guro Semicon",
  CN유통: "CN Distribution",
  중앙INT: "Jungang INT",
  광명전자: "Gwangmyeong Electronics",
  부천세미: "Bucheon Semicon",
  비전칩스: "Vision Chips",
  온라인구매: "Online Purchase",
  "애로우일렉트로닉스 유한회사": "Arrow Electronics Korea Ltd.",
  "씨엔유통 주식회사": "CN Distribution Co., Ltd.",
  "에스티코리아 유한회사": "ST Korea Ltd.",
  "에스티 코리아 유한회사": "ST Korea Ltd.",
  "광명전자산업 주식회사": "Gwangmyeong Electronics Co., Ltd.",
  "구로반도체 주식회사": "Guro Semicon Co., Ltd.",
  구로동반도체: "Gurodong Semicon",
  "부천세미컨덕터 주식회사": "Bucheon Semiconductor Co., Ltd.",
  "비전칩스코리아 유한회사": "Vision Chips Korea Ltd.",
  "주식회사 중앙인터내셔널": "Jungang International Inc.",
  "중앙인터내셔널 주식회사": "Jungang International Inc.",
  "김민재 부장": "M. Kim, General Manager",
  "정우영 부장": "W. Jung, General Manager",
  "손흥민 이사": "H. Son, Director",
  "황희찬 과장": "H. Hwang, Manager",
  "이강인 팀장": "K. Lee, Team Lead",
  "조규성 대리": "G. Cho, Assistant Manager",
  "오현규 이사": "H. Oh, Director",
  "배준호 팀장": "J. Bae, Team Lead",
  "서울 강남구 테헤란로 152, GFC 15F":
    "15F GFC, 152 Teheran-ro, Gangnam-gu, Seoul",
  "서울 금천구 가산디지털1로 189, 8F":
    "8F, 189 Gasan Digital 1-ro, Geumcheon-gu, Seoul",
  "서울 강남구 논현로 13, 10-12F": "10-12F, 13 Nonhyeon-ro, Gangnam-gu, Seoul",
  "경기 광명시 오리로 987, 광명IT타워 8F":
    "8F Gwangmyeong IT Tower, 987 Ori-ro, Gwangmyeong, Gyeonggi",
  "서울 구로구 디지털로 26길 111, 3F":
    "3F, 111 Digital-ro 26-gil, Guro-gu, Seoul",
  "경기 부천시 원미구 부일로 200": "200 Buil-ro, Wonmi-gu, Bucheon, Gyeonggi",
  "서울 서초구 서초대로 396, 강남빌딩 12F":
    "12F Gangnam Bldg, 396 Seocho-daero, Seocho-gu, Seoul",
  "서울 영등포구 여의대로 24, 전경련회관 20F":
    "20F FKI Tower, 24 Yeoui-daero, Yeongdeungpo-gu, Seoul",
};

// 창고 마커 라벨(가1 · 나1 …) → A1 · B1 …
const MARKER_ROW = { 가: "A", 나: "B", 다: "C", 라: "D", 마: "E", 바: "F" };

// ── 2) 동적 문장 규칙 (위에서부터 순서대로 적용) ─────────────────────────
const RULES = [
  // 감사 로그 등에서 따옴표로 감싼 값: "구로반도체" → "Guro Semicon"
  [/^"(.+)"$/, (m, inner) => `"${tr(inner)}"`],
  [/^'(.+)'$/, (m, inner) => `'${tr(inner)}'`],

  // 창고 마커 라벨
  [
    /^([가-바])(\d+)$/,
    (m, row, num) => (MARKER_ROW[row] ? MARKER_ROW[row] + num : m),
  ],

  // 문서 제목: "재고관리 · BOM 자재관리 에이전트"
  [
    /^(.+) · BOM 자재관리 에이전트$/,
    (m, p1) => `${tr(p1)} · BOM Material Management Agent`,
  ],

  // 목록 카운트
  [/^총\s*([\d,]+)\s*건$/, "$1 total"],
  [/^총\s*([\d,]+)\s*개 공급사$/, "$1 suppliers"],
  [/^제품\s*([\d,]+)건\s*·\s*양산월\s*([\d,]+)건$/, "$1 products · $2 months"],
  [/^저장\s*\((\d+)\)$/, "Save ($1)"],

  // 공지사항
  [/^최근\s*(\d+)일\s*변동$/, "Changes · last $1 days"],
  [/^최근\s*(\d+)건$/, "$1 recent"],
  [/^(\d+)일$/, "$1d"],
  [/^대체 필요 — (.+)$/, "Substitute needed — $1"],
  [
    /^납기\s*(\d+)주\s*·\s*6개월 후 재고\s*(-?[\d,]+)\s*—.*$/,
    "Lead time $1 weeks · 6M stock $2 — ordering early cannot cover it, find a substitute",
  ],
  [
    /^발주 필요 — (.+?) \((\d+)건\)$/,
    (m, a, b) => `Order needed — ${tr(a)} (${b})`,
  ],
  [
    /^(.+?) — 발주 필요\s*(\d+)건\s*\(위험\s*(\d+)·주의\s*(\d+)\),\s*추천 발주 합계\s*([\d,]+)$/,
    (m, sup, n, red, yel, sum) =>
      `${tr(sup)} — ${n} to order (critical ${red} · watch ${yel}), suggested total ${sum}`,
  ],

  // 공지사항 상세 문구
  [
    /^(.+?)\s*의 공급사 정보가 최근 변경되었습니다$/,
    (m, name) => `Supplier information for ${tr(name)} changed recently`,
  ],

  // 대시보드 / 공지 액션
  [/^(.+) 대체품 확인 요청$/, "Request substitute for $1"],
  [/^(.+) — 대체품 문의 초안$/, "$1 — substitute inquiry draft"],
  // 대체품 메일 본문 (라벨 + 값)
  [/^-\s*부품명:\s*(.+)$/, "- Part name: $1"],
  [/^-\s*제조사 부품번호:\s*(.+)$/, "- Manufacturer P/N: $1"],
  [
    /^※\s*첨부파일:\s*(.+?)\s*\(해당 부품 데이터시트\)$/,
    "※ Attachment: $1 (datasheet for this part)",
  ],
  [/^기준일\s*(.+)$/, "As of $1"],

  // 발주서 (라벨 + 값이 한 노드에 붙어 있는 경우)
  [/^주소:\s*(.+)$/, (m, v) => `Address: ${tr(v)}`],
  [/^담당자:\s*(.+)$/, (m, v) => `Contact: ${tr(v)}`],
  [/^사업자\s*등록번호:\s*(.+)$/, "Business Reg. No: $1"],
  [/^대표이사\s*(.+)$/, (m, v) => `CEO ${tr(v)}`],
  [/^발주일자:\s*(.+)$/, "PO Date: $1"],
  // 발주서 12줄 입력칸의 aria-label: "3번 품목명" → "Row 3 item"
  [/^(\d+)번\s+(.+)$/, (m, i, rest) => `Row ${i} ${tr(rest)}`],

  // 양산계획
  [/^(.+) 삭제$/, (m, p1) => `Delete ${tr(p1)}`],
  [/^예:\s*(.+)$/, "e.g. $1"],
  [/^예\)\s*(.+)$/, "e.g. $1"],

  // BOM 모달
  [/^라인\s*([\d,]+)$/, "$1 lines"],
  [/^([\d,]+)\s*라인$/, "$1 lines"],
  [/^BOM 편집 — (.+)$/, "Edit BOM — $1"],
  [/^BOM 편집 \((.+)\)$/, "Edit BOM ($1)"],
  [/^부품 편집 — (.+)$/, "Edit Part — $1"],
  [/^보관위치 확인 \((.+)\)$/, (m, p1) => `Storage location (${tr(p1)})`],

  // 입고 이력 확인 다이얼로그 (메시지가 두 줄로 나뉘어 렌더링된다)
  [
    /^해당 입고 건을 취소하면 재고가\s*([\d,]+)\s*만큼 차감됩니다\.?\s*계속하시겠습니까\?$/,
    "Cancelling this receipt reduces stock by $1. Continue?",
  ],
  [
    /^해당 입고 건을 취소하면 재고가\s*([\d,]+)\s*만큼 차감됩니다\.?$/,
    "Cancelling this receipt reduces stock by $1.",
  ],

  // 요청 실패
  [/^요청 실패 \(HTTP\s*(\d+)\)$/, "Request failed (HTTP $1)"],
];

// ── 3) 낱말 안전망 (긴 것부터) ──────────────────────────────────────────
const WORDS = [
  ["BOM 자재관리 에이전트", "BOM Material Management Agent"],
  ["대체품 확인 요청", "substitute request"],
  ["추천 발주 합계", "suggested order total"],
  ["삭제 예약을 취소했습니다", "deletion cancelled"],
  ["삭제 예약을 취소하시겠습니까?", "Undo the queued deletion?"],
  ["을 삭제하시겠습니까?", " — delete it?"],
  ["삭제되었습니다", "deleted"],
  ["삭제했습니다", "deleted"],
  ["추가했습니다", "added"],
  ["변경했습니다", "changed"],
  ["저장되었습니다", "saved"],
  ["저장했습니다", "saved"],
  ["취소했습니다", "cancelled"],
  ["실패했습니다", "failed"],
  ["못했습니다", "failed"],
  ["없습니다", "none"],
  ["대기 중이던 편집", "pending edits"],
  ["지난 월이므로 표에 표시되지 않습니다", "is in the past and is not shown"],
  [
    "이 제품의 BOM / 양산계획 셀이 함께 사라집니다.",
    "The product's BOM and plan cells are removed as well.",
  ],
  ["보관위치", "location"],
  ["매입단가", "unit cost"],
  ["입고일자", "received"],
  ["취소여부", "status"],
  ["자체PN", "Internal P/N"],
  ["공급받는자", "Buyer"],
  ["사업자등록번호", "Business Reg. No"],
  ["대표이사", "CEO"],
  ["공급가액", "amount"],
  ["품목명", "item"],
  ["발주일자", "PO date"],
  ["양산월", "month"],
  ["제품명", "product name"],
  ["공급사", "supplier"],
  ["제조사", "manufacturer"],
  ["담당자", "contact"],
  ["부품", "part"],
  ["제품", "product"],
  ["재고", "stock"],
  ["단가", "unit price"],
  ["수량", "qty"],
  ["분류", "category"],
  ["위험도", "risk"],
  ["대체", "substitute"],
  ["위험", "critical"],
  ["주의", "watch"],
  ["정상", "OK"],
  ["저장", "save"],
  ["삭제", "delete"],
  ["취소", "cancel"],
  ["추가", "add"],
  ["수정", "edit"],
  ["확인", "confirm"],
  ["완료", "done"],
  ["닫기", "close"],
  ["건", ""],
  ["개", ""],
];

function applyRules(s) {
  for (const [re, rep] of RULES) {
    if (re.test(s)) {
      return typeof rep === "function" ? s.replace(re, rep) : s.replace(re, rep);
    }
  }
  return null;
}

function applyWords(s) {
  let out = s;
  for (const [ko, en] of WORDS) out = out.split(ko).join(en);
  return out.replace(/\s{2,}/g, " ").trim();
}

/**
 * 한국어 문자열 하나를 영어로 바꾼다.
 *
 * ``noFallback`` 이면 낱말 단위 안전망(WORDS)을 적용하지 않는다.  LLM 이
 * 생성한 챗봇 답변처럼 자유 문장에 부분 치환을 하면 오히려 어색해지므로
 * 사전에 정확히 있는 문장만 바꾸고 나머지는 원문을 유지한다.
 */
function tr(raw, noFallback) {
  const s = String(raw);
  const t = s.trim();
  if (!t || !HANGUL.test(t)) return s;
  if (EXACT[t]) return s.replace(t, EXACT[t]);
  const ruled = applyRules(t);
  if (ruled !== null) return s.replace(t, ruled);
  if (noFallback) return s;
  return s.replace(t, applyWords(t));
}

// ── 현재 언어 상태 + 원문 복원 기록 ──────────────────────────────────────
let lang = "ko";
// EN 으로 바꾸면서 실제로 고친 항목의 원문.  KR 로 되돌릴 때 그대로 복원한다.
let undo = [];

function recordText(node, orig) {
  undo.push({ kind: "text", node, orig });
}
function recordAttr(el, attr, orig) {
  undo.push({ kind: "attr", el, attr, orig });
}
function recordValue(el, orig) {
  undo.push({ kind: "value", el, orig });
}

// ── DOM 적용 ────────────────────────────────────────────────────────────
const ATTRS = ["placeholder", "title", "aria-label", "alt"];
const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "NOSCRIPT"]);

function translateTextNode(node) {
  const v = node.nodeValue;
  if (!v || !HANGUL.test(v)) return;
  if (node.parentNode && SKIP_TAGS.has(node.parentNode.nodeName)) return;
  // 챗봇 말풍선(LLM 자유 문장)은 사전에 정확히 있는 문장만 바꾼다.
  const inBubble = !!(
    node.parentElement && node.parentElement.closest(".chat-bubble")
  );
  // 확인 다이얼로그처럼 여러 줄인 경우 줄 단위로 사전을 적용한다.
  const next =
    v.indexOf("\n") === -1
      ? tr(v, inBubble)
      : v
          .split("\n")
          .map((line) => tr(line, inBubble))
          .join("\n");
  if (next !== v) {
    recordText(node, v);
    node.nodeValue = next;
  }
}

function translateElement(el) {
  if (el.classList && el.classList.contains("lang-toggle__btn")) return;
  ATTRS.forEach((a) => {
    const v = el.getAttribute && el.getAttribute(a);
    if (v && HANGUL.test(v)) {
      const next = tr(v);
      if (next !== v) {
        recordAttr(el, a, v);
        el.setAttribute(a, next);
      }
    }
  });
  // 읽기 전용 입력칸의 값(예: 대체품 메일의 고정 제목).  사용자가 고칠 수
  // 없는 값이므로 표시만 영어로 바꿔도 입력을 방해하지 않는다.
  if (
    el.tagName === "INPUT" &&
    (el.readOnly || el.disabled) &&
    /^(text|search|email|tel|url|)$/i.test(el.type || "") &&
    el !== document.activeElement &&
    el.value &&
    HANGUL.test(el.value)
  ) {
    const next = tr(el.value);
    if (next !== el.value) {
      recordValue(el, el.value);
      el.value = next;
    }
  }
  // 버튼류 value / 포커스 없는 textarea 본문
  if (el.tagName === "INPUT" && /^(button|submit|reset)$/i.test(el.type || "")) {
    if (el.value && HANGUL.test(el.value)) {
      const next = tr(el.value);
      if (next !== el.value) {
        recordValue(el, el.value);
        el.value = next;
      }
    }
  }
  if (el.tagName === "TEXTAREA" && el !== document.activeElement) {
    if (el.value && HANGUL.test(el.value)) {
      const next = el.value
        .split("\n")
        .map((line) => tr(line))
        .join("\n");
      if (next !== el.value) {
        recordValue(el, el.value);
        el.value = next;
      }
    }
  }
}

function translateTree(root) {
  if (!root) return;
  if (root.nodeType === Node.TEXT_NODE) {
    translateTextNode(root);
    return;
  }
  if (root.nodeType !== Node.ELEMENT_NODE && root.nodeType !== Node.DOCUMENT_NODE)
    return;
  if (root.nodeType === Node.ELEMENT_NODE) translateElement(root);
  const walker = document.createTreeWalker(
    root,
    NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
  );
  let n;
  while ((n = walker.nextNode())) {
    if (n.nodeType === Node.TEXT_NODE) translateTextNode(n);
    else translateElement(n);
  }
}

let titleOriginal = null;

function translateTitle() {
  if (document.title && HANGUL.test(document.title)) {
    titleOriginal = document.title;
    document.title = tr(document.title);
  }
}

// 같은 한국어 문자열이 버튼과 모달 제목에 함께 쓰이는 경우, 제목 쪽만
// 문장형으로 늘려 준다(버튼은 짧게 유지).
const CONTEXT_FIXES = [[".modal__title", { Edit: "Edit Supplier" }]];

function applyContextFixes() {
  for (const [sel, map] of CONTEXT_FIXES) {
    document.querySelectorAll(sel).forEach((el) => {
      const t = (el.textContent || "").trim();
      if (map[t]) el.textContent = map[t];
    });
  }
}

// 관찰을 끊지 않는다.  끊었다 다시 붙이는 사이에 앱이 만든 변경(예: BOM
// 모달의 상태 줄)이 통째로 누락되기 때문이다.  치환 결과에는 한글이 남지
// 않으므로 자기 자신이 만든 변경으로 무한 루프에 빠지지 않는다(값이 같으면
// 아예 쓰지 않는다).
const observer = new MutationObserver((records) => {
  if (lang !== "en") return;
  for (const r of records) {
    if (r.type === "characterData") translateTextNode(r.target);
    else if (r.type === "attributes") translateElement(r.target);
    else r.addedNodes.forEach((n) => translateTree(n));
  }
  translateTitle();
  applyContextFixes();
});

function observe() {
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: ATTRS,
  });
}

function translateAll() {
  translateTree(document.body);
  translateTitle();
  applyContextFixes();
}

// 셸(index.html)에 고정된 한국어 라벨.  sidebar.js 가 링크를 cloneNode 로
// 교체하기 때문에 기록해 둔 원본 텍스트 노드가 DOM 에서 떨어져 나갈 수 있다.
// 그런 경우에도 확실히 되돌리도록 정답을 따로 갖고 있는다.
const SHELL_KO = {
  "#/notices": "공지사항",
  "#/inventory": "재고관리",
  "#/supplier-management": "공급관리",
  "#/production-plan": "양산계획",
  "#/dashboard": "대시보드",
};

function restoreShell() {
  document.querySelectorAll(".sidebar__link").forEach((link) => {
    const ko = SHELL_KO[link.dataset.route || link.getAttribute("href")];
    if (ko && link.textContent.trim() !== ko) link.textContent = ko;
  });
  const aside = document.querySelector(".sidebar");
  if (aside && aside.getAttribute("aria-label") !== "주 메뉴") {
    aside.setAttribute("aria-label", "주 메뉴");
  }
}

function restoreAll() {
  for (let i = undo.length - 1; i >= 0; i -= 1) {
    const rec = undo[i];
    try {
      if (rec.kind === "text") rec.node.nodeValue = rec.orig;
      else if (rec.kind === "attr") rec.el.setAttribute(rec.attr, rec.orig);
      else if (rec.kind === "value") rec.el.value = rec.orig;
    } catch (_e) {
      /* 이미 제거된 노드는 무시 */
    }
  }
  undo = [];
  titleOriginal = null;
  restoreShell();
  // 페이지 본문과 문서 제목은 라우터가 다시 그리게 한다.  중간에 노드가
  // 교체된 경우까지 확실히 한국어로 되돌리기 위한 안전장치다.
  window.dispatchEvent(new HashChangeEvent("hashchange"));
}

// ── 토글 ────────────────────────────────────────────────────────────────
function syncToggle() {
  document.querySelectorAll(".lang-toggle__btn").forEach((btn) => {
    const on = btn.dataset.lang === lang;
    btn.classList.toggle("is-active", on);
    btn.setAttribute("aria-pressed", on ? "true" : "false");
  });
  document.documentElement.setAttribute("lang", lang);
}

function setLang(next) {
  if (next !== "ko" && next !== "en") return;
  if (next === lang) {
    syncToggle();
    return;
  }
  lang = next;
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch (_e) {
    /* 저장 불가여도 동작에는 지장 없음 */
  }
  if (lang === "en") translateAll();
  else restoreAll();
  syncToggle();
}

function wireToggle() {
  document.querySelectorAll(".lang-toggle__btn").forEach((btn) => {
    btn.addEventListener("click", () => setLang(btn.dataset.lang));
  });
}

// 대체품 메일의 [메일 앱으로 열기] 는 화면의 입력칸이 아니라 코드 상수로
// mailto: 제목을 만든다.  영문 표시 중이면 메일 앱에도 영문 제목이 가도록
// 클릭이 처리되기 직전(capture 단계)에 href 의 subject 를 바꿔 끼운다.
function wireMailtoSubject() {
  document.addEventListener(
    "click",
    (event) => {
      if (lang !== "en") return;
      const target = event.target;
      const anchor =
        target && target.closest ? target.closest('a[href^="mailto:"]') : null;
      if (!anchor) return;
      try {
        const url = new URL(anchor.href);
        const subject = url.searchParams.get("subject");
        if (subject && HANGUL.test(subject)) {
          url.searchParams.set("subject", tr(subject));
          anchor.href = url.toString();
        }
      } catch (_e) {
        /* 파싱 실패 시 원본 링크 그대로 사용 */
      }
    },
    true,
  );
}

function boot() {
  let saved = null;
  try {
    saved = localStorage.getItem(STORAGE_KEY);
  } catch (_e) {
    saved = null;
  }
  wireToggle();
  wireMailtoSubject();
  observe();
  lang = "ko";
  syncToggle();
  if (saved === "en") setLang("en");
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}

// 화면에 남아 있는 한국어를 확인하는 개발용 헬퍼 (콘솔에서 __i18nScan()).
window.__i18nScan = function () {
  const left = new Set();
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let n;
  while ((n = w.nextNode())) {
    const t = n.nodeValue.trim();
    if (t && HANGUL.test(t)) left.add(t);
  }
  document
    .querySelectorAll("[placeholder],[title],[aria-label],[alt]")
    .forEach((el) => {
      ATTRS.forEach((a) => {
        const v = el.getAttribute(a);
        if (v && HANGUL.test(v.trim())) left.add(v.trim());
      });
    });
  return Array.from(left);
};
window.__setLang = setLang;
window.__getLang = () => lang;
// 복원 기록 상태 확인용 (콘솔에서 __i18nDebug()).  dead 가 많다는 것은
// 앱이 그 노드를 교체했다는 뜻이므로, 되돌리기가 어긋나면 여기부터 본다.
window.__i18nDebug = () => ({
  lang,
  recorded: undo.length,
  dead: undo.filter((r) =>
    r.kind === "text" ? !r.node.isConnected : !r.el.isConnected,
  ).length,
});

// 영문 표시 중에는 챗봇도 영어로 답하도록 /api/chat 요청에 lang 을 덧붙인다.
const originalFetch = window.fetch.bind(window);
window.fetch = function (input, init) {
  try {
    const url = typeof input === "string" ? input : input && input.url;
    if (
      lang === "en" &&
      url &&
      url.indexOf("/api/chat") !== -1 &&
      init &&
      typeof init.body === "string"
    ) {
      const body = JSON.parse(init.body);
      body.lang = "en";
      init = Object.assign({}, init, { body: JSON.stringify(body) });
    }
  } catch (_e) {
    /* 파싱 실패 시 원본 그대로 전송 */
  }
  return originalFetch(input, init);
};
