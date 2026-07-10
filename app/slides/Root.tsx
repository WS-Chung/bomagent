import SlideShell from "@/app/components/SlideShell";
import FlowDiagram from "@/app/components/FlowDiagram";
import Callout from "@/app/components/Callout";

export default function Root() {
  return (
    <SlideShell
      number="03"
      eyebrow="ROOT CAUSE"
      title="왜 같은 문제가 반복되나"
      description="하나의 근본 원인이 커뮤니케이션 비용과 휴먼에러로 증폭된다."
    >
      <div className="rounded-2xl glass p-4 sm:p-6 space-y-3">
        <p className="text-[12px] uppercase tracking-[0.18em] text-brand-300 font-semibold">
          증폭 경로
        </p>
        <FlowDiagram
          steps={[
            {
              title: "단일 진실원천(SSoT) 부재",
              body: "'진짜 최신'이 어디에도 확정되어 있지 않다.",
            },
            {
              title: "부서별 엑셀 사본이 늘어난다",
              body: "각자 자기 버전을 들고 일한다.",
            },
            {
              title: "사람이 수동으로 대사(對査)한다",
              body: "맞추는 데 시간이 들고, 맞추는 순간 또 바뀐다.",
            },
            {
              title: "커뮤니케이션 비용이 폭증한다",
              body: "확인·재확인 미팅과 메일이 업무의 절반을 차지.",
            },
            {
              title: "그래도 휴먼에러가 남는다",
              body: "누락·오탈·시점 차이 — 성실함으로 못 막는 영역.",
            },
          ]}
          compact
        />
      </div>

      <Callout variant="info" title="그래서 방향은 명확하다">
        사람을 더 갈아 넣는 게 아니라, <b>흩어진 정보를 하나로 모으고</b> 반복
        확인을 <b>시스템이 대신</b>하게 한다.
      </Callout>
    </SlideShell>
  );
}
