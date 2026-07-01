import SlideShell from "@/app/components/SlideShell";
import BlockFlow from "@/app/components/BlockFlow";
import { Card, CardGrid } from "@/app/components/Card";
import Callout from "@/app/components/Callout";

export default function Features() {
  return (
    <SlideShell
      number="11"
      eyebrow="Solution · Feature Map"
      title="핵심 기능 맵 · 사용자 여정"
      description="사이드바 4개 상위 메뉴로 업무 흐름이 자연스럽게 연결된다. [부품 → 공급사 → 계획 → 대시보드] 순으로 좌에서 우로 이동한다."
    >
      <div className="rounded-2xl glass p-4 sm:p-5 space-y-3">
        <p className="text-[12px] uppercase tracking-[0.18em] text-brand-300 font-semibold">
          Sidebar Navigation
        </p>
        <BlockFlow
          items={[
            { num: "01", title: "재고관리", sub: "부품·재고 마스터" },
            { num: "02", title: "공급관리", sub: "공급사 상세" },
            { num: "03", title: "양산계획", sub: "제품 × 월 매트릭스" },
            { num: "04", title: "대시보드", sub: "예측·위험도" },
          ]}
        />
      </div>

      <CardGrid cols={2}>
        <Card title="① 재고관리" accent="brand" badge="마스터 데이터">
          <ul className="list-disc pl-4 space-y-1">
            <li>부품 마스터 조회 · 검색 · 인라인 편집</li>
            <li><b>+ 입고 버튼</b> — 접두어 기반 자체 부품번호 자동 채번</li>
            <li>입고 이력 조회 · <b>취소 시 원자적 재고 환원</b></li>
            <li>분류별 <b>창고 위치</b> 시각화 · 창고 지도 모달</li>
            <li>재고 필드는 <b>읽기 전용</b> · 입고·취소로만 변경</li>
          </ul>
        </Card>
        <Card title="② 공급관리" accent="brand" badge="공급사 상세">
          <ul className="list-disc pl-4 space-y-1">
            <li>공급사 상세 필드: 정식명 · 담당자 · 연락처 · 이메일</li>
            <li>사업자 등록번호 · 소재지</li>
            <li>발주서 자동 작성 시 필드 재사용</li>
            <li>변경 이력은 컬럼당 1건씩 감사 로그 기록</li>
          </ul>
        </Card>
        <Card title="③ 양산계획" accent="brand" badge="계획 매트릭스">
          <ul className="list-disc pl-4 space-y-1">
            <li>제품 × 월 매트릭스 · 엑셀 스타일 렌더링</li>
            <li>셀 편집 · 제품명 · 월 라벨은 <b>임시 편집 → 일괄 저장</b> 정책</li>
            <li>제품 추가 · 월 추가 · 삭제는 즉시 반영</li>
            <li>지난 월 자동 숨김 · 좌측 첫 컬럼은 항상 <b>다음 달</b></li>
            <li>제품 행 [BOM] 링크 → BOM 편집 모달</li>
          </ul>
        </Card>
        <Card title="④ 대시보드" accent="brand" badge="의사결정 뷰">
          <ul className="list-disc pl-4 space-y-1">
            <li>2개월 / 6개월 후 예측 재고</li>
            <li><b>위험도 표시</b>: 빨강 <b>즉시 발주</b> · 주황 <b>조만간</b> · 초록 <b>정상</b></li>
            <li>최소 주문 수량 반영 <b>추천 발주량</b></li>
            <li>필터: 위험도 · 공급사</li>
            <li>공급사 필터 시 <b>[발주서 자동작성]</b> 버튼 노출</li>
          </ul>
        </Card>
      </CardGrid>

      <div className="rounded-2xl glass p-4 sm:p-5 space-y-3">
        <p className="text-[12px] uppercase tracking-[0.18em] text-brand-300 font-semibold">
          보조 · 관리자 페이지
        </p>
        <CardGrid cols={2}>
          <Card title="입고 이력" accent="slate">
            <p>최신순 정렬 · 취소 확인 다이얼로그 · 취소 시 재고 원자적 환원 · 물리 삭제하지 않음.</p>
          </Card>
          <Card title="감사 로그" accent="slate">
            <p>대상 테이블 · 대상 행 ID · 시간 범위 필터. 수정·삭제 요청 자체를 거부해 <b>불변성</b> 보장.</p>
          </Card>
        </CardGrid>
      </div>

      <Callout variant="info" title="UX 원칙 · 클릭을 줄인다">
        일상 업무의 가장 빈번한 액션이 <b>가장 적은 클릭</b>으로 완결되도록
        설계했다. 예: 입고 화면은 접두어 선택만으로 자체 부품번호를 자동으로
        채번하고, 분류·제조사·공급사 드롭다운은 <b>+ 신규 추가</b>를 인라인으로
        지원한다.
      </Callout>
    </SlideShell>
  );
}
