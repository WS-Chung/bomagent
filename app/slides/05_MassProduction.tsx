import SlideShell from "@/app/components/SlideShell";
import BlockFlow from "@/app/components/BlockFlow";
import { Card, CardGrid } from "@/app/components/Card";
import Callout from "@/app/components/Callout";

export default function MassProduction() {
  return (
    <SlideShell
      number="05"
      eyebrow="Problem · Mass Production"
      title="양산·발주: 납기 리스크와 과잉 재고의 딜레마"
      description="양산 진입 이후 구매팀은 롤링 스케줄과 L/T 변동을 실시간으로 반영해야 한다. 이 정보 흐름이 늦어질 때 조직은 두 가지 실패 중 하나를 반드시 겪는다."
    >
      <div className="rounded-2xl glass p-4 sm:p-5 space-y-3">
        <p className="text-[12px] uppercase tracking-[0.18em] text-brand-300 font-semibold">
          양산 진입 이후 정보 순환 사이클
        </p>
        <BlockFlow
          items={[
            { num: "01", title: "생산 스케줄 롤링", sub: "주 단위 재조정" },
            { num: "02", title: "부족 부품 식별", sub: "재고 - 소요량" },
            { num: "03", title: "L/T 역산 발주", sub: "발주 시점 결정" },
            { num: "04", title: "납기 트래킹", sub: "지연 시 백업 발주" },
          ]}
        />
      </div>

      <div className="rounded-2xl glass p-4 sm:p-5">
        <p className="text-[12px] uppercase tracking-[0.18em] text-brand-300 mb-3 font-semibold">
          현장에서 발생하는 이분법 (One-of-Two Failure)
        </p>
        <CardGrid cols={2}>
          <Card title="① 납기 사고 (Stock-out)" accent="rose">
            <ul className="list-disc pl-4 space-y-1">
              <li>구매팀이 <b>매일 스케줄을 붙잡고</b> 매크로 · 수식으로 계산</li>
              <li>휴가·병가·이관 발생 시 즉각 리스크</li>
              <li>1건의 미발주가 <b>양산 라인 전체 중단</b>으로 확산</li>
              <li>고객 페널티 · 신뢰도 손상</li>
            </ul>
          </Card>
          <Card title="② 과잉 재고 (Over-stock)" accent="amber">
            <ul className="list-disc pl-4 space-y-1">
              <li>납기 사고를 피하기 위해 <b>안전 재고를 크게</b> 설정</li>
              <li>운전자본(Working Capital) 잠식</li>
              <li>단종·모델 변경 시 <b>재고 자산 손실</b></li>
              <li>창고 공간 · 관리 인력의 추가 비용</li>
            </ul>
          </Card>
        </CardGrid>
      </div>

      <Callout variant="warn" title="본질적 원인">
        두 실패의 공통 원인은 <b>미래 소요량이 실시간으로 계산되지 않는다는 점</b>
        이다. 소요량 = Σ(BOM 점(pt) × 양산계획). 이 계산이 매주 자동으로,
        누구나 동일한 결과를 얻는 형태로 유지되어야 한다.
      </Callout>

      <div className="rounded-2xl glass p-4 sm:p-5 space-y-3">
        <p className="text-[12px] uppercase tracking-[0.18em] text-brand-300 font-semibold">
          왜 엑셀만으로는 부족한가
        </p>
        <BlockFlow
          items={[
            { num: "01", title: "다중 시트 참조", sub: "링크 깨짐 · 순환 참조" },
            { num: "02", title: "매크로 관리", sub: "속인화 · Undocumented" },
            { num: "03", title: "동시 편집 충돌", sub: "MERGE / OVERWRITE" },
            { num: "04", title: "감사 이력 부재", sub: "누가 언제 왜 바꿨나" },
          ]}
          compact
        />
      </div>
    </SlideShell>
  );
}
