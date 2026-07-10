import SlideShell from "@/app/components/SlideShell";
import { Card, CardGrid } from "@/app/components/Card";
import Callout from "@/app/components/Callout";

export default function Problem() {
  return (
    <SlideShell
      number="02"
      eyebrow="AS-IS"
      title="엑셀로 굴러가는 자재관리"
      description="성실하게 일하는데도 매번 새는 곳이 있다. 사람이 아니라 방식의 문제."
    >
      <CardGrid cols={3}>
        <Card title="수작업 BOM 추출" accent="rose" icon="📄">
          제품마다 엑셀로 뽑고, 붙이고, 다시 정리
        </Card>
        <Card title="수시 업데이트" accent="rose" icon="🔁">
          바뀔 때마다 파일 재작성 → <b className="text-rose-200">버전 난립</b>
        </Card>
        <Card title="지지부진한 미팅" accent="rose" icon="🗣️">
          "그 파일 최신 맞아요?"를 확인하려 모이는 대사(對査) 미팅
        </Card>
        <Card title="반복 납기 체크" accent="rose" icon="⏱️">
          부품 하나하나 L/T·재고를 손으로 확인
        </Card>
        <Card title="사후 발견" accent="rose" icon="🚨">
          부족을 <b className="text-rose-200">터지고 나서</b> 알아차림
        </Card>
        <Card title="부서별 정보 단절" accent="rose" icon="🧩">
          개발·구매·자재가 서로 다른 화면·다른 숫자
        </Card>
      </CardGrid>

      <Callout variant="danger" title="핵심 진단">
        휴먼에러는 <b>더 성실해도</b> 사라지지 않는다. 정보가 흩어져 있고,
        사람이 그 사이를 수동으로 잇는 <b>구조</b>가 원인이다.
      </Callout>
    </SlideShell>
  );
}
