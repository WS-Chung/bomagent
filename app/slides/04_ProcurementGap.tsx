import SlideShell from "@/app/components/SlideShell";
import BlockFlow from "@/app/components/BlockFlow";
import { Card, CardGrid } from "@/app/components/Card";
import Callout from "@/app/components/Callout";

export default function ProcurementGap() {
  return (
    <SlideShell
      number="04"
      eyebrow="Problem · Sourcing"
      title="구매·소싱 단계: 오퍼레이터화된 구매의 한계"
      description="구매팀은 단순 발주 처리자가 아니라 전략적 소싱 파트너여야 한다. 그러나 현장에서는 엔지니어 지정 부품을 그대로 발주하는 오퍼레이터 수준의 업무로 축소되는 경우가 많다."
    >
      <div className="rounded-2xl glass p-4 sm:p-5 space-y-3">
        <p className="text-[12px] uppercase tracking-[0.18em] text-brand-300 font-semibold">
          구매팀이 실제로 해야 하는 판단 · 이상적 흐름
        </p>
        <BlockFlow
          items={[
            { num: "01", title: "동일 사양 대체품 탐색", sub: "원가 절감 소싱" },
            { num: "02", title: "선호 공급사 확인", sub: "공급망(SCM) · 승인 벤더" },
            { num: "03", title: "리드타임·MOQ 재확인", sub: "발주 시점 결정" },
            { num: "04", title: "발주 · 납기 추적", sub: "발주서 발행 · 팔로업" },
          ]}
        />
      </div>

      <CardGrid cols={3}>
        <Card title="가격 이외의 결정 변수" accent="brand">
          <ul className="list-disc pl-4 space-y-1">
            <li>설계 용이성 · 도입 편의</li>
            <li>공급사 기술 지원</li>
            <li>호환성 · Rev 관리 · 단종 리스크</li>
            <li>세관 · 결제 · 유해 물질 규제 인증</li>
          </ul>
        </Card>
        <Card title="부품 종류별 이질성" accent="amber">
          <ul className="list-disc pl-4 space-y-1">
            <li><b>수동 소자</b>: 릴 단위 MOQ, 낮은 단가</li>
            <li><b>능동 소자</b>: 대리점 유통, 배분·할당</li>
            <li><b>기구·커넥터</b>: 맞춤 제작 · 도면 검증</li>
          </ul>
        </Card>
        <Card title="벤더 다변화의 부작용" accent="brand">
          부품마다 취급 업체가 다르고, 결제 조건과 납기가 다르다. 구매 담당자는{" "}
          <b>수십 개의 서로 다른 소싱 경로</b>를 동시에 관리해야 한다.
        </Card>
      </CardGrid>

      <div className="rounded-2xl glass p-4 sm:p-5 space-y-3">
        <p className="text-[12px] uppercase tracking-[0.18em] text-brand-300 font-semibold">
          현장에서 실제 관찰되는 패턴 · 현행
        </p>
        <BlockFlow
          items={[
            {
              num: "A",
              title: "엔지니어 지정 그대로 발주",
              sub: "대체품 검토 생략",
            },
            {
              num: "B",
              title: "휴먼 에러 발생",
              sub: "부품번호 오타 · 수량 오기",
            },
            {
              num: "C",
              title: "더블 체크용 인력 과투입",
              sub: "중소 사업장의 만성 부담",
            },
            {
              num: "D",
              title: "리스크 부품 반복 채택",
              sub: "학습 미축적",
            },
          ]}
          compact
        />
      </div>

      <Callout variant="danger" title="중소 사업장의 구조적 딜레마">
        구매·자재 업무는 <b>휴먼 에러가 필연적으로 발생</b>하는 영역이다.
        사업주 관점에서는 더블 체크를 위해 인력을 과잉 투입할 수밖에 없고, 이는
        만성 원가 부담이 된다. 시스템이 이를 대신하지 않으면 규모의 경제가
        실현되지 않는다.
      </Callout>
    </SlideShell>
  );
}
