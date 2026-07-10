import SlideShell from "@/app/components/SlideShell";
import { Card, CardGrid } from "@/app/components/Card";
import Callout from "@/app/components/Callout";

export default function Questions() {
  return (
    <SlideShell
      number="08"
      eyebrow="OPEN QUESTIONS"
      title="이런 툴을 쓰면, 다음 화두는?"
      description="도구는 방식을 바꾼다. 그러나 '무엇을' 함께 풀어야 하는가는 우리 몫이다."
    >
      <CardGrid cols={2}>
        <Card title="데이터는 누가 정확히 입력하나?" accent="amber" icon="⌨️">
          실시간 시스템의 힘은 <b className="text-amber-100">입력의 규율</b>에서 나온다 — 자동화가 늘수록 '처음 한 번'의 정확도가 중요해진다.
        </Card>
        <Card title="모두가 그 숫자를 '믿게' 하려면?" accent="amber" icon="🤝">
          단일 원천이 생겨도, 신뢰가 쌓이기 전엔 각자 <b className="text-amber-100">엑셀 사본</b>으로 되돌아간다.
        </Card>
        <Card title="AI 답변은 어디까지 신뢰?" accent="amber" icon="🧠">
          빠른 답과 <b className="text-amber-100">사람의 판단</b> 사이의 경계 — 무엇을 자동에 맡기고 무엇을 검증할 것인가.
        </Card>
        <Card title="정보가 많아질수록 덜 보는 역설?" accent="amber" icon="🔔">
          모두에게 모든 정보를 주면, 정작 <b className="text-amber-100">지금 볼 것</b>은 무엇인가.
        </Card>
        <Card title="부서 KPI가 다를 때는?" accent="amber" icon="⚖️">
          같은 화면을 봐도 <b className="text-amber-100">해석과 우선순위</b>는 부서마다 다르다 — 통합은 합의를 요구한다.
        </Card>
        <Card title="효율화의 목적은?" accent="amber" icon="🎯">
          아낀 시간을 <b className="text-amber-100">어디에 쓸 것인가</b> — 사람을 줄이는 게 아니라 더 나은 일에 쓰기 위한 것.
        </Card>
      </CardGrid>

      <Callout variant="warn" title="세미나 토론거리">
        오늘 이 자리에서 답을 정하기보다, <b>우리 조직에서 가장 먼저 마주칠 화두</b>가
        무엇일지 함께 이야기해봤으면 합니다.
      </Callout>
    </SlideShell>
  );
}
