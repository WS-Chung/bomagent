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
          4-쿼리 계산 파이프라인
        </p>
        <BlockFlow
          items={[
            { num: "Q1", title: "부품 · 공급사 조회", sub: "재고 · 단가 · 공급사" },
            { num: "Q2", title: "BOM 라인 조회", sub: "부품 · 제품 · 투입수량" },
            { num: "Q3", title: "양산 계획 조회", sub: "제품 · 월 · 수량" },
            { num: "Q4", title: "월 라벨 파싱", sub: "라벨 → 연 · 월" },
          ]}
        />
      </div>

      <div className="rounded-2xl glass p-4 sm:p-5 space-y-3">
        <p className="text-[12px] uppercase tracking-[0.18em] text-brand-300 font-semibold">
          핵심 산식 · 결정론적 계산
        </p>
        <FlowDiagram
          steps={[
            {
              title: "미래 소요량 = Σ (투입 수량 × 월별 양산 수량)",
              body: (
                <div>
                  BOM의 각 라인은 <b>투입 수량</b>을 갖는다. 이는 제품 1대 생산 시
                  들어가는 부품 수량이며, 해당 월의 양산 수량과 곱하고 부품
                  단위로 전 제품에 대해 합산한다.
                </div>
              ),
            },
            {
              title: "2개월 예측 재고 = 현재 재고 − Σ 2개월 소요량",
              body: (
                <div>
                  <b>다음 달 1일부터 2개월</b> 구간의 소요량을 뺀 값. 음수면 해당
                  구간 내 부족이 예상된다.
                </div>
              ),
            },
            {
              title: "6개월 예측 재고 = 현재 재고 − Σ 6개월 소요량",
              body: (
                <div>
                  중기 리스크 지표. 발주 리드타임과 안전 재고를 함께 고려할 때
                  사용된다.
                </div>
              ),
            },
          ]}
        />
      </div>

      <div className="rounded-2xl glass p-4 sm:p-5 space-y-3">
        <p className="text-[12px] uppercase tracking-[0.18em] text-brand-300 font-semibold">
          위험도 3단계 분류
        </p>
        <CardGrid cols={3}>
          <Card title="🔴 위험" accent="rose" badge="즉시 발주">
            <p><b>재고 − 리드타임 기간 소비량 &lt; 0</b></p>
            <p className="mt-1 text-slate-400 text-[12px]">
              리드타임 도래 이전에 이미 재고가 소진된다. 지금 즉시 발주 필요.
            </p>
          </Card>
          <Card title="🟡 주의" accent="amber" badge="조만간">
            <p><b>6개월 예측 재고 &lt; 0</b> 이지만 리드타임 내 소진은 아님</p>
            <p className="mt-1 text-slate-400 text-[12px]">
              중기 부족이 예상된다. 조만간 발주해야 하지만 오늘 당장은 아니다.
            </p>
          </Card>
          <Card title="🟢 정상" accent="emerald" badge="여유">
            <p><b>6개월 예측 재고 ≥ 0</b></p>
            <p className="mt-1 text-slate-400 text-[12px]">
              6개월 시야 내 부족이 예상되지 않는다. 정기 모니터링만 유지.
            </p>
          </Card>
        </CardGrid>
        <p className="text-[12px] text-slate-400">
          리드타임 환산: 지정된 주 수를 4주 단위로 올림해 개월로 변환하며,
          미지정 부품은 기본 4주(1개월)로 간주한다.
        </p>
      </div>

      <div className="rounded-2xl glass p-4 sm:p-5 space-y-3">
        <p className="text-[12px] uppercase tracking-[0.18em] text-brand-300 font-semibold">
          추천 발주량 · 최소 주문 수량(MOQ) 반영
        </p>
        <div className="code-block">
{`부족분         = max(0, 6개월 소요량 합계 − 현재 재고)
유효 MOQ       = MOQ > 0 이면 MOQ, 아니면 1
추천 발주량    = 부족분 == 0 이면 0
                아니면 ceil(부족분 / 유효 MOQ) × 유효 MOQ`}
        </div>
        <p className="text-[12px] text-slate-400">
          MOQ가 없거나 0인 경우 1로 간주한다. 부족분을 MOQ 단위로 올림해 실제
          발주 가능한 수량을 반환한다.
        </p>
      </div>

      <Callout variant="success" title="정렬 순서 · 완전한 결정론성">
        결과는 항상 <b>위험도 우선순위 → 6개월 예측 재고 오름차순 → 부품
        ID</b> 순으로 정렬된다. 부품 ID를 마지막 키로 두어 항상 같은 순서를
        보장하고, 속성 기반 테스트로 재현성을 검증했다. 부품 100종·6개월 조합
        기준 계산 시간은 50ms 미만.
      </Callout>
    </SlideShell>
  );
}
