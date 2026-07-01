import SlideShell from "@/app/components/SlideShell";
import BlockFlow from "@/app/components/BlockFlow";
import { Card, CardGrid } from "@/app/components/Card";
import Callout from "@/app/components/Callout";

export default function CommOverhead() {
  return (
    <SlideShell
      number="08"
      eyebrow="Problem · Communication Cost"
      title="커뮤니케이션 오버헤드"
      description="정보가 부서마다 다르게 존재하기 때문에, 이를 맞추기 위한 회의·문서 동기화 비용이 눈에 보이지 않게 누적된다. 그리고 결국 이 비용은 재무 손실로도 전환된다."
    >
      <div className="rounded-2xl glass p-4 sm:p-5 space-y-3">
        <p className="text-[12px] uppercase tracking-[0.18em] text-brand-300 font-semibold">
          동기화 회의 사이클 (Weekly · 실제 관찰)
        </p>
        <BlockFlow
          items={[
            { num: "01", title: "월요일 킥오프", sub: "생산 · 구매 · 자재" },
            { num: "02", title: "수시 후속 미팅", sub: "매일 스탠드업" },
            { num: "03", title: "문서 대조", sub: "엑셀 · 이메일 · 카톡" },
            { num: "04", title: "합의 후 재작성", sub: "다시 각자 문서에 반영" },
          ]}
        />
      </div>

      <CardGrid cols={3}>
        <Card title="시간 비용" accent="amber" badge="시간">
          <ul className="list-disc pl-4 space-y-1">
            <li>주 단위 미팅이 아니라 <b>거의 매일 미팅</b></li>
            <li>회의 후 문서 대조에 <b>하루 반나절</b></li>
            <li>실제 작업 시간은 크게 축소</li>
          </ul>
        </Card>
        <Card title="정합성 비용" accent="brand" badge="정합성">
          <ul className="list-disc pl-4 space-y-1">
            <li>부서마다 관리 문서 내용이 다름</li>
            <li>동기화 지연으로 <b>다른 숫자를 근거로 의사결정</b></li>
            <li>회의 종료 후에도 다음 회의까지 다시 어긋남</li>
          </ul>
        </Card>
        <Card title="재무 비용" accent="rose" badge="재무">
          <ul className="list-disc pl-4 space-y-1">
            <li><b>중복 발주</b> · 무효 발주 · 취소 위약금</li>
            <li>과잉 재고 유지 비용 · 자산 손실</li>
            <li>납기 사고 시 항공 특송 · 긴급 구매 웃돈</li>
          </ul>
        </Card>
      </CardGrid>

      <div className="rounded-2xl glass p-4 sm:p-5 space-y-3">
        <p className="text-[12px] uppercase tracking-[0.18em] text-brand-300 font-semibold">
          커뮤니케이션 비용이 재무 손실로 전환되는 경로
        </p>
        <BlockFlow
          items={[
            { num: "01", title: "정보 불일치", sub: "부서 간 문서 차이" },
            { num: "02", title: "의사결정 지연", sub: "재확인 · 재검토" },
            { num: "03", title: "잘못된 발주", sub: "중복 · 누락" },
            { num: "04", title: "실질 손실 발생", sub: "재고·긴급·페널티" },
          ]}
          compact
        />
      </div>

      <Callout variant="warn" title="비용 가시화의 어려움">
        커뮤니케이션 오버헤드는 <b>어떤 계정과목에도 계상되지 않는다</b>. 그래서
        경영진은 이 손실의 규모를 인지하기 어렵고, 개선 프로젝트의 ROI를
        산정하기도 까다롭다. 하지만 실제로 조직에서 가장 크게 소모되는 자원 중
        하나다.
      </Callout>

      <Callout variant="info" title="다음 챕터에서">
        이 자료는 문제 진단을 여기서 마무리하고, 다음 챕터부터{" "}
        <b>BOM Agent가 어떻게 이 균열들을 봉합하는지</b>를 아키텍처·기능·워크
        플로우 관점에서 설명한다.
      </Callout>
    </SlideShell>
  );
}
