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
      title="설계·부품 선정 단계에서 묻히는 BOM"
      description="설계 툴이 자동 추출하는 BOM은 강력한 자산이지만, 대부분 엔지니어 개인 로컬에 머무르며 후공정으로 흘러들지 못한다. 결과적으로 조직 지식이 아니라 개인 지식으로 축소된다."
    >
      <div className="rounded-2xl glass p-4 sm:p-5 space-y-3">
        <p className="text-[12px] uppercase tracking-[0.18em] text-brand-300 font-semibold">
          설계 측 데이터 흐름 · 현행
        </p>
        <BlockFlow
          items={[
            { num: "01", title: "설계 툴에서 작업", sub: "설계 파일 산출" },
            { num: "02", title: "BOM 자동 추출", sub: "부품 참조·MPN·값" },
            { num: "03", title: "엔지니어 개인 관리", sub: "엑셀·개인 드라이브" },
            { num: "04", title: "구매·자재 팀 미도달", sub: "조직 지식 미축적" },
          ]}
        />
      </div>

      <CardGrid cols={2}>
        <Card title="개인만의 자료로 남는 BOM" accent="rose" badge="반복되는 패턴">
          <ul className="list-disc pl-4 space-y-1">
            <li>엔지니어 편의를 위한 <b>개인 사본</b>으로 종결</li>
            <li>Rev A / Rev B / Rev C가 개인 파일명에만 존재</li>
            <li>담당자 이직 시 조직 지식이 함께 소실</li>
          </ul>
        </Card>
        <Card title="후공정이 얻지 못하는 정보" accent="rose" badge="아래로 흐르지 않음">
          <ul className="list-disc pl-4 space-y-1">
            <li>대체품 우선순위 · 승인 상태</li>
            <li>리드타임(L/T) · 최소 주문 수량(MOQ) · 최근 견적</li>
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
              title: "설계 BOM은 제품 정확성만 보장한다",
              body: "부품 정격, 참조 번호에 최적화되어 있으며 소싱 관점 필드는 부재하다.",
            },
            {
              title: "Master BOM은 소싱·양산 관점을 흡수해야 한다",
              body: "자체 부품번호(Self PN), 승인 벤더, 리드타임, 최소 주문 수량, 대체품 리스트, 위험도 태그를 결합해 단일 진실 공급원(SSoT)으로 격상된다.",
            },
            {
              title: "SSoT가 되면 후공정이 스스로 판단할 수 있다",
              body: "구매팀은 리드타임 기반 발주 시점을, 자재팀은 창고 위치를, 회계는 재고 자산을 동일한 데이터로 조회한다.",
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
