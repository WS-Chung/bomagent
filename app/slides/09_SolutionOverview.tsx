import SlideShell from "@/app/components/SlideShell";
import BlockFlow from "@/app/components/BlockFlow";
import { Card, CardGrid } from "@/app/components/Card";
import Callout from "@/app/components/Callout";

export default function SolutionOverview() {
  return (
    <SlideShell
      number="09"
      eyebrow="Solution · BOM Agent"
      title="BOM 자재관리 에이전트 · 무엇을 해결하는가"
      description="엔지니어로부터 받은 BOM을 현재 재고와 대조하고, 양산계획을 실시간으로 반영해 부족·임박 부품을 자동으로 정리하고 발주서 초안까지 생성하는 로컬 자재관리 에이전트."
    >
      <div className="rounded-2xl glass p-4 sm:p-5 space-y-3">
        <p className="text-[12px] uppercase tracking-[0.18em] text-brand-300 font-semibold">
          Agent Value Loop
        </p>
        <BlockFlow
          items={[
            {
              num: "01",
              title: "BOM Ingestion",
              sub: "엔지니어 BOM · 재고 대조",
            },
            {
              num: "02",
              title: "MPS Sync",
              sub: "양산계획 실시간 반영",
            },
            {
              num: "03",
              title: "Forecast & Risk",
              sub: "2M / 6M · 위험도 산출",
            },
            {
              num: "04",
              title: "Recommended Order",
              sub: "MOQ 반영 발주량",
            },
            {
              num: "05",
              title: "PO Draft",
              sub: "공급사별 발주서 초안",
            },
          ]}
        />
      </div>

      <CardGrid cols={2}>
        <Card title="설계 철학" accent="brand" badge="로컬 우선">
          <ul className="list-disc pl-4 space-y-1">
            <li>단일 머신 · 단일 DB 파일 · 외부 통신 차단</li>
            <li>인증 없음 · 사내망 격리 가정 · 자기 PC 전용</li>
            <li>모든 쓰기는 <b>감사 로그</b>에 원자적 기록</li>
            <li>결정론적 Forecast Engine · 정수 산술만 사용</li>
          </ul>
        </Card>
        <Card title="이번 버전에서 다루지 않는 것" accent="slate" badge="MVP 범위 밖">
          <ul className="list-disc pl-4 space-y-1">
            <li>다중 사용자 · 실시간 협업</li>
            <li>ERP · MES와의 직접 연동</li>
            <li>공급사 API 견적 자동 수집</li>
            <li>서버 사이드 PDF 렌더링</li>
          </ul>
          <p className="mt-2 text-slate-400 text-[12px]">
            → 이 항목들은 로드맵에서 다룬다.
          </p>
        </Card>
      </CardGrid>

      <div className="rounded-2xl glass p-4 sm:p-5 space-y-3">
        <p className="text-[12px] uppercase tracking-[0.18em] text-brand-300 font-semibold">
          에이전트가 대신하는 일
        </p>
        <BlockFlow
          items={[
            { num: "A", title: "BOM · 재고 대조", sub: "수작업 조회 대체" },
            { num: "B", title: "월별 소요량 계산", sub: "매크로·수식 대체" },
            { num: "C", title: "리드타임 가중 위험도", sub: "판단 근거 표준화" },
            { num: "D", title: "발주서 초안 생성", sub: "공급사 필터 · A4 포맷" },
          ]}
          compact
        />
      </div>

      <Callout variant="success" title="설계 원칙 · 정확성이 최우선">
        시스템의 첫 번째 목표는 <b>같은 입력이면 항상 같은 결과를 낸다는
        약속</b>이다. Forecast Engine은 부동 소수를 사용하지 않고 정수 산술만
        수행하며, 정렬 키까지 완전 순서를 갖도록 설계됐다. 속성 기반 테스트로
        검증된다.
      </Callout>
    </SlideShell>
  );
}
