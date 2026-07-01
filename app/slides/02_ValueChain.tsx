import SlideShell from "@/app/components/SlideShell";
import BlockFlow from "@/app/components/BlockFlow";
import { Card, CardGrid } from "@/app/components/Card";
import Callout from "@/app/components/Callout";

export default function ValueChain() {
  return (
    <SlideShell
      number="02"
      eyebrow="Problem · Value Chain"
      title="제조 밸류체인 순환 구조"
      description="설계에서 시작해 자재관리까지 이어지는 5단계 순환. 각 단계 사이의 인계 지점에서 정보 손실과 판단 지연이 누적된다."
    >
      <div className="rounded-2xl glass p-4 sm:p-5 space-y-3">
        <p className="text-[12px] uppercase tracking-[0.18em] text-brand-300 font-semibold">
          밸류체인 순환 구조
        </p>
        <BlockFlow
          items={[
            {
              num: "01",
              title: "설계",
              sub: "설계 작업 · BOM 추출",
            },
            {
              num: "02",
              title: "부품 선정",
              sub: "부품번호 확정 · 사양서 검토",
            },
            {
              num: "03",
              title: "양산",
              sub: "양산 계획 수립 · 라인 투입",
            },
            {
              num: "04",
              title: "구매",
              sub: "발주 · 대체품 소싱",
            },
            {
              num: "05",
              title: "자재관리",
              sub: "입출고 · 창고 위치",
            },
          ]}
        />
      </div>

      <CardGrid cols={3}>
        <Card title="설계 → 부품 선정" accent="brand" badge="Handoff #1">
          엔지니어가 설계 툴에서 <b>BOM을 자동 추출</b>한다. 이 BOM은 제품
          구조와 정격을 담고 있으나 대체품·재고·리드타임 정보는 포함되지
          않는다.
        </Card>
        <Card title="부품 선정 → 양산" accent="brand" badge="Handoff #2">
          신규 개발(NPI) 검토를 거쳐 <b>Master BOM이 확정</b>되면 양산 계획
          (MPS)이 연결된다. 이 시점에 소싱 가능성이 뒤늦게 이슈로 드러나는
          경우가 많다.
        </Card>
        <Card title="양산 → 구매" accent="brand" badge="Handoff #3">
          생산팀의 롤링 스케줄이 매주 변동되면 <b>발주 시점과 수량</b>이 함께
          변한다. 이 신호가 지연되면 납기 리스크 또는 과잉 재고로 귀결된다.
        </Card>
        <Card title="구매 → 자재관리" accent="brand" badge="Handoff #4">
          입고 즉시 <b>기업 자산</b>으로 계상되며, 회계·감사 대상이 된다.
          동시에 창고 위치 정보가 정확해야 실제 투입이 가능하다.
        </Card>
        <Card title="자재관리 → 설계" accent="brand" badge="Handoff #5 · 피드백">
          단종·롱리드·품질 이슈가 <b>차기 설계로 피드백</b>되어야 하지만, 이
          루프가 자주 끊긴다. 결과적으로 동일한 리스크 부품이 반복 채택된다.
        </Card>
        <Card title="사이클 밖 이해관계자" accent="slate">
          영업(수주 변동) · 회계(자산 실사) · 품질(불량 격리) · 고객대응(반품)
          까지 포함하면 정보 파편화 폭은 훨씬 커진다.
        </Card>
      </CardGrid>

      <Callout variant="info" title="본 자료의 대상 범위">
        본 솔루션은 <b>다품종·다량의 부품을 다루는 모든 제조 조직</b>을 대상으로
        한다. 취급 부품이 전자 부품이든 기구 부품이든, 설계와 구매·자재의
        인계 구간에서 벌어지는 실무 이슈는 공통이기 때문이다.
      </Callout>
    </SlideShell>
  );
}
