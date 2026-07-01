import SlideShell from "@/app/components/SlideShell";
import BlockFlow from "@/app/components/BlockFlow";
import FlowDiagram from "@/app/components/FlowDiagram";
import { Card, CardGrid } from "@/app/components/Card";
import Callout from "@/app/components/Callout";

export default function ForecastEngine() {
  return (
    <SlideShell
      number="12"
      eyebrow="Solution · Forecast Engine"
      title="Forecast Engine · 결정론적 예측 코어"
      description="BOM · MPS · 재고를 결합하여 2개월/6개월 후 잔여 재고, L/T 가중 위험도, MOQ 반영 추천 발주량을 산출한다. 정수 산술만 사용해 완전 결정론적으로 동작한다."
    >
      <div className="rounded-2xl glass p-4 sm:p-5 space-y-3">
        <p className="text-[12px] uppercase tracking-[0.18em] text-brand-300 font-semibold">
          4-Query Strategy · 계산 파이프라인
        </p>
        <BlockFlow
          items={[
            { num: "Q1", title: "parts + suppliers", sub: "재고 · 단가 · 공급사" },
            { num: "Q2", title: "bom_items + boms", sub: "(part_id, product_id, pt)" },
            { num: "Q3", title: "production_plan", sub: "(product_id, month, qty)" },
            { num: "Q4", title: "plan_months", sub: "라벨 → (year, month) 파싱" },
          ]}
        />
      </div>

      <div className="rounded-2xl glass p-4 sm:p-5 space-y-3">
        <p className="text-[12px] uppercase tracking-[0.18em] text-brand-300 font-semibold">
          핵심 산식 (Deterministic Math)
        </p>
        <FlowDiagram
          steps={[
            {
              title: "미래 소요량 = Σ (pt × 월별 양산 수량)",
              body: (
                <div>
                  BOM의 각 라인은 <b>pt (points)</b>를 갖는다. pt는 제품 1대 생산 시
                  투입 수량이며, 이를 해당 월의 양산 수량과 곱하고 부품 단위로
                  전 제품에 대해 합산한다.
                </div>
              ),
            },
            {
              title: "2M-FCST = 현재 재고 − Σ 2M 소요량",
              body: (
                <div>
                  &quot;다음 달 1일부터 2개월&quot; 구간의 소요량을 뺀 값. 음수면
                  해당 구간 내 부족이 예상된다.
                </div>
              ),
            },
            {
              title: "6M-FCST = 현재 재고 − Σ 6M 소요량",
              body: (
                <div>
                  중기(6개월) 리스크 지표. 발주 리드타임과 안전 재고를 함께
                  고려할 때 사용된다.
                </div>
              ),
            },
          ]}
        />
      </div>

      <div className="rounded-2xl glass p-4 sm:p-5 space-y-3">
        <p className="text-[12px] uppercase tracking-[0.18em] text-brand-300 font-semibold">
          Risk Classification · 3-Tier
        </p>
        <CardGrid cols={3}>
          <Card title="🔴 RED · 위험" accent="rose" badge="Immediate">
            <p><b>재고 − LT 기간 소비량 &lt; 0</b></p>
            <p className="mt-1 text-slate-400 text-[12px]">
              L/T 도래 이전에 이미 재고가 소진된다. 지금 즉시 발주 필요.
            </p>
          </Card>
          <Card title="🟡 YELLOW · 주의" accent="amber" badge="Watch">
            <p><b>6M-FCST &lt; 0</b> (그러나 L/T 내 소진은 아님)</p>
            <p className="mt-1 text-slate-400 text-[12px]">
              중기 부족이 예상된다. 조만간 발주해야 하지만 오늘 당장은 아니다.
            </p>
          </Card>
          <Card title="🟢 GREEN · 정상" accent="emerald" badge="OK">
            <p><b>6M-FCST ≥ 0</b></p>
            <p className="mt-1 text-slate-400 text-[12px]">
              6개월 시야 내 부족이 예상되지 않는다. 정기 모니터링만 유지.
            </p>
          </Card>
        </CardGrid>
        <p className="text-[12px] text-slate-400">
          L/T 환산: <code className="text-brand-300">weeks = lt_weeks or 4</code>{" "}
          → <code className="text-brand-300">months = max(1, ceil(weeks / 4))</code>.
          L/T 미지정 시 기본 4주로 간주한다.
        </p>
      </div>

      <div className="rounded-2xl glass p-4 sm:p-5 space-y-3">
        <p className="text-[12px] uppercase tracking-[0.18em] text-brand-300 font-semibold">
          Recommended Order Quantity · MOQ 반영
        </p>
        <div className="code-block">
{`shortage      = max(0, sum_6m_consumption − inventory)
moq_effective = moq if moq > 0 else 1
recommended   = 0 if shortage == 0
                else ceil(shortage / moq_effective) * moq_effective`}
        </div>
        <p className="text-[12px] text-slate-400">
          MOQ가 null이거나 0인 경우 1로 간주한다. 부족분을 MOQ 단위로 올림해
          실제 발주 가능한 수량을 반환한다.
        </p>
      </div>

      <Callout variant="success" title="Sort Order · 완전 결정론성">
        결과는 항상 <b>(risk 우선순위 → 6M-FCST 오름차순 → part_id)</b>로
        정렬된다. part_id를 tertiary key로 두어 총순서를 확보했고, 프로퍼티
        기반 테스트로 재현성을 검증했다. 100 parts × 6 months 조합에서 계산
        시간은 50ms 미만.
      </Callout>
    </SlideShell>
  );
}
