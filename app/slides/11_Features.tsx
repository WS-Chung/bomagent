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
            { num: "01", title: "재고관리", sub: "Inventory Ops" },
            { num: "02", title: "공급관리", sub: "Supplier Master" },
            { num: "03", title: "양산계획", sub: "MPS Matrix" },
            { num: "04", title: "대시보드", sub: "Forecast & Risk" },
          ]}
        />
      </div>

      <CardGrid cols={2}>
        <Card title="① 재고관리 · Inventory Page" accent="brand" badge="Master Data">
          <ul className="list-disc pl-4 space-y-1">
            <li>부품 마스터 조회 · 검색 · 인라인 편집</li>
            <li><b>+ 입고 모달</b> — Prefix 기반 Self PN 자동 채번</li>
            <li>입고 이력 조회 · <b>취소 시 원자적 재고 환원</b></li>
            <li>클래스별 <b>창고 로케이션</b> 시각화 (Warehouse Modal)</li>
            <li>재고 필드는 <b>Read-only</b> · 입고/취소로만 변경</li>
          </ul>
        </Card>
        <Card title="② 공급관리 · Supplier Page" accent="brand" badge="Vendor Detail">
          <ul className="list-disc pl-4 space-y-1">
            <li>공급사 상세 필드: 정식명 · 담당자 · 연락처 · 이메일</li>
            <li>사업자등록번호 · 소재지</li>
            <li>발주서 자동 작성 시 필드 재사용</li>
            <li>변경 이력은 컬럼당 1건씩 감사 로그 기록</li>
          </ul>
        </Card>
        <Card title="③ 양산계획 · Production Plan" accent="brand" badge="MPS Matrix">
          <ul className="list-disc pl-4 space-y-1">
            <li>제품 × 월 매트릭스 · 엑셀 스타일 렌더링</li>
            <li>셀 편집 · 제품명 · 월 라벨 = <b>Pending → Save</b> 정책</li>
            <li>제품 추가 · 월 추가 · 삭제는 즉시 반영</li>
            <li>지난 월 자동 숨김 · 좌측 첫 컬럼은 항상 &quot;다음달&quot;</li>
            <li>제품 행 [BOM] 링크 → BOM 편집 모달</li>
          </ul>
        </Card>
        <Card title="④ 대시보드 · Forecast Dashboard" accent="brand" badge="Decision View">
          <ul className="list-disc pl-4 space-y-1">
            <li>2M-FCST / 6M-FCST 예측 재고</li>
            <li><b>Risk Chip</b>: RED (즉시 발주) · YELLOW (조만간) · GREEN (정상)</li>
            <li>MOQ 반영 <b>추천 발주량</b></li>
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
          <Card title="입고 이력 · Receiving History" accent="slate">
            <p>최신순 정렬 · 취소 확인 다이얼로그 · 취소 시 재고 원자적 환원 · 물리 삭제하지 않음.</p>
          </Card>
          <Card title="감사 로그 · Audit Log" accent="slate">
            <p>대상 테이블 · 대상 행 ID · 시간 범위 필터. PUT/DELETE 405로 <b>불변성</b> 보장.</p>
          </Card>
        </CardGrid>
      </div>

      <Callout variant="info" title="UX 원칙 · Fewer Clicks">
        일상 업무의 가장 빈번한 액션이 <b>가장 적은 클릭</b>으로 완결되도록
        설계했다. 예: 입고 모달은 Prefix 선택 시 Self PN을 자동 채번하고,
        분류·제조사·공급사 드롭다운은 &quot;+ 신규 추가&quot;를 인라인으로
        지원한다.
      </Callout>
    </SlideShell>
  );
}
