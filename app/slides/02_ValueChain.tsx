import SlideShell from "@/app/components/SlideShell";
import BlockFlow from "@/app/components/BlockFlow";
import { Card, CardGrid } from "@/app/components/Card";
import Callout from "@/app/components/Callout";

export default function ValueChain() {
  return (
    <SlideShell
      number="02"
      eyebrow="Problem · Value Chain"
      title="PCB 제조 밸류체인 순환 구조"
      description="설계(Schematic Design)에서 시작해 자재관리(Inventory Ops)까지 이어지는 5-스테이지 사이클. 각 단계 사이의 인계(hand-off) 지점에서 정보 손실과 판단 지연이 누적된다."
    >
      <div className="rounded-2xl glass p-4 sm:p-5 space-y-3">
        <p className="text-[12px] uppercase tracking-[0.18em] text-brand-300 font-semibold">
          Value Chain Loop
        </p>
        <BlockFlow
          items={[
            {
              num: "01",
              title: "설계 · Design",
              sub: "회로 설계 · CAD BOM 추출",
            },
            {
              num: "02",
              title: "부품 선정 · Component Selection",
              sub: "MPN 확정 · Datasheet 검토",
            },
            {
              num: "03",
              title: "양산 · Mass Production",
              sub: "MPS 수립 · 라인 투입",
            },
            {
              num: "04",
              title: "구매 · Procurement",
              sub: "발주 · 대체품 소싱",
            },
            {
              num: "05",
              title: "자재관리 · Inventory Ops",
              sub: "입출고 · 창고 로케이션",
            },
          ]}
        />
      </div>

      <CardGrid cols={3}>
        <Card title="설계 → 부품 선정" accent="brand" badge="Handoff #1">
          엔지니어가 EDA 툴에서 <b>CAD BOM을 자동 추출</b>한다. 이 BOM은 회로
          구조·풋프린트·정격을 담고 있으나 대체품·재고·L/T 정보는 포함되지
          않는다.
        </Card>
        <Card title="부품 선정 → 양산" accent="brand" badge="Handoff #2">
          NPI(New Product Introduction) 검토를 거쳐 <b>Master BOM이 확정</b>
          되면 MPS(Master Production Schedule)가 연결된다. 이 시점에 소싱
          가능성이 뒤늦게 이슈로 드러나는 경우가 많다.
        </Card>
        <Card title="양산 → 구매" accent="brand" badge="Handoff #3">
          생산팀의 롤링 스케줄이 매주 변동되면 <b>발주 타이밍과 수량</b>이
          함께 변한다. 이 신호가 지연되면 납기 리스크 또는 과잉 재고로 귀결된다.
        </Card>
        <Card title="구매 → 자재관리" accent="brand" badge="Handoff #4">
          입고 즉시 <b>기업 자산</b>으로 계상되며, 회계·감사 대상이 된다.
          동시에 창고 로케이션 정보가 정확해야 실제 라인 투입이 가능하다.
        </Card>
        <Card title="자재관리 → 설계" accent="brand" badge="Handoff #5 (피드백)">
          단종·롱리드·품질 이슈가 <b>차기 설계로 피드백</b>되어야 하지만, 이
          루프가 자주 끊긴다. 결과적으로 동일한 리스크 부품이 반복 채택된다.
        </Card>
        <Card title="사이클 밖 이해관계자" accent="slate">
          영업(수주 변동), 회계(자산 실사), QC(불량 격리), CS(RMA)까지 포함하면
          정보 파편화 폭은 훨씬 커진다.
        </Card>
      </CardGrid>

      <Callout variant="info" title="본 자료의 스코프 (Scope)">
        본 프로젝트가 겨냥하는 시장은 <b>전자제품(주로 PCB) 양산 업체</b>다.
        회로를 설계하는 <b>설계팀</b>과 회로 구성품을 핸들링하는{" "}
        <b>구매·자재팀</b>의 인계 구간에서 발생하는 실무 이슈를 사례로
        다룬다.
      </Callout>
    </SlideShell>
  );
}
