import SlideShell from "@/app/components/SlideShell";
import { Card, CardGrid } from "@/app/components/Card";
import BlockFlow from "@/app/components/BlockFlow";
import Callout from "@/app/components/Callout";

export default function InvisibleIssues() {
  return (
    <SlideShell
      number="06"
      eyebrow="Problem · Invisible Cost"
      title="자산 관리 사각지대"
      description="입고 즉시 자재는 회계상 자산으로 계상된다. 하지만 실물의 위치·수량·상태 정보가 세 부서 사이에서 다르게 유지되면서 재고 실사 시점에 반드시 오차가 드러난다."
    >
      <div className="rounded-2xl glass p-4 sm:p-5 space-y-3">
        <p className="text-[12px] uppercase tracking-[0.18em] text-brand-300 font-semibold">
          엔지니어 · 구매 · 회계의 관점 차이
        </p>
        <BlockFlow
          items={[
            {
              num: "ENG",
              title: "엔지니어 관점",
              sub: "부품 사양 · Rev · 채택 여부",
            },
            {
              num: "PUR",
              title: "구매 관점",
              sub: "발주 · 납기 · 단가",
            },
            {
              num: "ACC",
              title: "회계 관점",
              sub: "취득 원가 · 재고 자산 · 감사",
            },
          ]}
        />
      </div>

      <CardGrid cols={2}>
        <Card title="자산 등재의 비대칭" accent="brand" badge="Asymmetry">
          <ul className="list-disc pl-4 space-y-1">
            <li>
              엔지니어는 <b>모델과 수량은 선정</b>하지만, 이후 실물 관리에는
              관여하지 않는다
            </li>
            <li>
              구매·회계는 <b>수량과 자산 가치를 세밀하게</b> 관리하지만, 사양
              변경의 배경은 알기 어렵다
            </li>
            <li>결과적으로 어느 부서도 실물의 전체 상태를 완전히 파악하지 못한다</li>
          </ul>
        </Card>
        <Card title="창고 로케이션 손실" accent="rose" badge="Warehouse Ops">
          <ul className="list-disc pl-4 space-y-1">
            <li>현장 입고 담당자와 사무실 입고 처리자가 다르다</li>
            <li>물건이 놓인 정확한 위치를 모른 채 전표만 입력</li>
            <li>연말 실사에서 수량 불일치 · 엉뚱한 위치에서 발견</li>
            <li>손실 처리 · 재구매 · 감사 지적으로 이어짐</li>
          </ul>
        </Card>
      </CardGrid>

      <div className="rounded-2xl glass p-4 sm:p-5 space-y-3">
        <p className="text-[12px] uppercase tracking-[0.18em] text-brand-300 font-semibold">
          연말 재고 실사 시나리오 (As-Is)
        </p>
        <BlockFlow
          items={[
            { num: "01", title: "장부 재고 확인", sub: "ERP 스냅샷" },
            { num: "02", title: "실물 카운트", sub: "창고 실사" },
            { num: "03", title: "불일치 발견", sub: "위치·수량 오차" },
            { num: "04", title: "손실 처리", sub: "감사 지적 · 재구매" },
          ]}
          compact
        />
      </div>

      <Callout variant="danger" title="구조적 원인">
        세 부서의 시야가 다른 것은 <b>정상</b>이다. 문제는 이 세 시야가{" "}
        <b>서로 다른 데이터 소스를 근거로 하고 있다</b>는 점이다. 단일 데이터
        원본(SSOT) 위에서 각 부서가 필요한 뷰만 소비하는 구조로 전환해야
        한다.
      </Callout>
    </SlideShell>
  );
}
