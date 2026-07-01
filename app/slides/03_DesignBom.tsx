import SlideShell from "@/app/components/SlideShell";
import BlockFlow from "@/app/components/BlockFlow";
import FlowDiagram from "@/app/components/FlowDiagram";
import Callout from "@/app/components/Callout";
import { Card, CardGrid } from "@/app/components/Card";

export default function DesignBom() {
  return (
    <SlideShell
      number="03"
      eyebrow="Problem · Design Handoff"
      title="설계·부품 선정 단계: BOM의 사장(死藏)"
      description="EDA 툴이 자동 추출하는 BOM은 강력한 자산이지만, 대부분 엔지니어 개인 로컬에 머무르며 후공정으로 흘러들지 못한다. 결과적으로 조직 지식이 아니라 개인 지식으로 축소된다."
    >
      <div className="rounded-2xl glass p-4 sm:p-5 space-y-3">
        <p className="text-[12px] uppercase tracking-[0.18em] text-brand-300 font-semibold">
          Design-Side Data Flow (현행)
        </p>
        <BlockFlow
          items={[
            { num: "01", title: "EDA 회로 설계", sub: "OrCAD · Altium · KiCad" },
            { num: "02", title: "CAD BOM 자동 추출", sub: "Part Ref · MPN · Value" },
            { num: "03", title: "엔지니어 개인 관리", sub: "Excel · 개인 드라이브" },
            { num: "04", title: "PLM/ERP 미연동", sub: "구매·자재 팀 미도달" },
          ]}
        />
      </div>

      <CardGrid cols={2}>
        <Card title="개인 자산화된 BOM" accent="rose" badge="Anti-pattern">
          <ul className="list-disc pl-4 space-y-1">
            <li>엔지니어 편의를 위한 <b>사본(私本)</b>으로 종결</li>
            <li>Rev A / Rev B / Rev C가 개인 파일명에만 존재</li>
            <li>담당자 이직 시 조직 지식이 함께 소실</li>
          </ul>
        </Card>
        <Card title="후공정이 얻지 못하는 정보" accent="rose" badge="Downstream Gap">
          <ul className="list-disc pl-4 space-y-1">
            <li>대체품(Alt Part) 우선순위 · 승인 상태</li>
            <li>L/T(Lead Time) · MOQ · 최근 견적</li>
            <li>선호 벤더 · 승인 벤더 리스트(AVL)</li>
          </ul>
        </Card>
      </CardGrid>

      <div className="rounded-2xl glass p-4 sm:p-5 space-y-3">
        <p className="text-[12px] uppercase tracking-[0.18em] text-brand-300 font-semibold">
          Master BOM으로의 승격이 필요한 이유
        </p>
        <FlowDiagram
          steps={[
            {
              title: "CAD BOM은 회로적 정확성만 보장한다",
              body: "부품 정격, 풋프린트, 회로 참조(Reference Designator)에 최적화되어 있으며 소싱 관점 필드는 부재하다.",
            },
            {
              title: "Master BOM은 소싱·양산 관점을 흡수해야 한다",
              body: "자체 채번(Self PN), 승인 벤더(Supplier), L/T, MOQ, 대체품 리스트, 위험도 태그를 결합해 SSOT로 격상된다.",
            },
            {
              title: "SSOT가 되면 다운스트림이 자율적으로 판단 가능해진다",
              body: "구매팀은 리드타임 기반 발주 시점을, 자재팀은 창고 로케이션을, 회계는 재고 자산을 동일한 데이터로 조회한다.",
            },
          ]}
        />
      </div>

      <Callout variant="warn" title="현장 관찰 · 반복되는 실패 패턴">
        신규 프로젝트마다 동일한 이슈가 재발한다. 이유는 단순하다.{" "}
        <b>BOM이 조직에 등록되지 않았기 때문에</b> 지난 프로젝트의 소싱 학습이
        축적되지 않고, 다음 엔지니어가 처음부터 다시 시행착오를 반복한다.
      </Callout>
    </SlideShell>
  );
}
