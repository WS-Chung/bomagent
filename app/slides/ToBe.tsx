import SlideShell from "@/app/components/SlideShell";
import BlockFlow from "@/app/components/BlockFlow";
import { Card, CardGrid } from "@/app/components/Card";
import Callout from "@/app/components/Callout";

export default function ToBe() {
  return (
    <SlideShell
      number="04"
      eyebrow="TO-BE"
      title="흩어진 엑셀 → 하나의 실시간 시스템"
      description="BOM · 재고 · 양산계획 · 납기를 한 곳에 모으면, 모든 부서가 같은 화면을 본다."
    >
      <div className="rounded-2xl glass p-4 sm:p-6">
        <p className="text-[12px] uppercase tracking-[0.18em] text-brand-300 font-semibold mb-4">
          통합 구조
        </p>
        <BlockFlow
          items={[
            { num: "01", title: "BOM · 재고 · 양산계획 · 납기", sub: "입력은 한 번" },
            { num: "02", title: "단일 진실원천 (SSoT)", sub: "하나의 실시간 데이터" },
            { num: "03", title: "모든 부서 · 동일 화면", sub: "동시에, 정확하게" },
          ]}
        />
      </div>

      <CardGrid cols={4}>
        <Card title="단일 진실원천" accent="emerald" icon="🎯">
          사본이 아니라 <b className="text-emerald-200">하나의 원천</b>
        </Card>
        <Card title="실시간" accent="emerald" icon="⚡">
          바뀌는 즉시 모두에게 반영
        </Card>
        <Card title="자동 예측·위험도" accent="emerald" icon="📈">
          2~6개월 후를 미리, 자동으로
        </Card>
        <Card title="부서 공유" accent="emerald" icon="🤝">
          개발·구매·자재가 같은 숫자
        </Card>
      </CardGrid>

      <Callout variant="success" title="한 문장으로">
        입력은 <b>한 번</b>, 정보는 <b>모두에게 동시에</b>. 확인하러 모이지 않고,
        각자 화면에서 바로 본다.
      </Callout>
    </SlideShell>
  );
}
