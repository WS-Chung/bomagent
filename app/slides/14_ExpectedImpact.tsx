import SlideShell from "@/app/components/SlideShell";
import BlockFlow from "@/app/components/BlockFlow";
import { Card, CardGrid } from "@/app/components/Card";
import Callout from "@/app/components/Callout";

export default function ExpectedImpact() {
  return (
    <SlideShell
      number="14"
      eyebrow="Impact · Expected Outcome"
      title="기대 효과 · 정량 · 정성"
      description="BOM Agent 도입이 조직에 가져오는 변화를 4가지 축으로 정리한다. 각 축은 진단 단계에서 다뤘던 문제들과 1:1로 대응된다."
    >
      <div className="rounded-2xl glass p-4 sm:p-5 space-y-3">
        <p className="text-[12px] uppercase tracking-[0.18em] text-brand-300 font-semibold">
          4-Axis Impact Framework
        </p>
        <BlockFlow
          items={[
            { num: "AX1", title: "운영 효율 (Ops)", sub: "시간·인력·회의 감축" },
            { num: "AX2", title: "재무 (Finance)", sub: "재고·긴급구매 절감" },
            { num: "AX3", title: "품질 (Quality)", sub: "휴먼 에러 억제" },
            { num: "AX4", title: "거버넌스 (Governance)", sub: "감사·추적성" },
          ]}
        />
      </div>

      <CardGrid cols={2}>
        <Card title="AX1 · 운영 효율" accent="brand" badge="Ops">
          <ul className="list-disc pl-4 space-y-1">
            <li>동일 시나리오 소요 시간 <b>~90% 단축</b> (2일 → 1시간대)</li>
            <li>동기화 회의 <b>주 3~5회 → 0~1회</b></li>
            <li>구매팀 실무 부하 감소로 <b>전략 소싱·대체품 검증에 집중</b>할 여유 확보</li>
            <li>담당자 부재·이직 시에도 <b>업무 연속성 유지</b> (SSOT 기반)</li>
          </ul>
        </Card>
        <Card title="AX2 · 재무 개선" accent="emerald" badge="Finance">
          <ul className="list-disc pl-4 space-y-1">
            <li><b>과잉 재고</b> 감소로 운전자본 회수</li>
            <li><b>납기 사고 감소</b>로 항공특송·스팟 프리미엄 회피</li>
            <li>중복 발주·무효 발주 실무 제거 → <b>취소 페널티 감소</b></li>
            <li>실사 시점의 재고 손실 회수 (창고 로케이션 정합성)</li>
          </ul>
        </Card>
        <Card title="AX3 · 품질" accent="brand" badge="Quality">
          <ul className="list-disc pl-4 space-y-1">
            <li>미등록 부품 흘러들 여지 <b>구조적 봉쇄</b> (Free-text 금지)</li>
            <li>Self PN 자동 채번으로 <b>번호 충돌 · 오타 제거</b></li>
            <li>수량·매입단가 상한·하한을 서버 측에서 검증</li>
            <li>결정론적 Forecast로 <b>담당자별 판단 편차 제거</b></li>
          </ul>
        </Card>
        <Card title="AX4 · 거버넌스" accent="emerald" badge="Governance">
          <ul className="list-disc pl-4 space-y-1">
            <li>모든 write는 <b>Audit Log 컬럼당 1건</b> 자동 기록</li>
            <li>audit_log <b>불변성</b>: PUT/DELETE 미허용</li>
            <li>사내망 격리 + Outbound 차단으로 <b>보안 감사 통과성 강화</b></li>
            <li>단일 DB 파일 기반 <b>백업·복구 절차 표준화</b></li>
          </ul>
        </Card>
      </CardGrid>

      <div className="rounded-2xl glass p-4 sm:p-5 space-y-3">
        <p className="text-[12px] uppercase tracking-[0.18em] text-brand-300 font-semibold">
          정성적 효과 (Qualitative)
        </p>
        <BlockFlow
          items={[
            { num: "Q1", title: "부서 간 신뢰 회복", sub: "동일 데이터 참조" },
            { num: "Q2", title: "학습 축적", sub: "프로젝트 간 지식 이관" },
            { num: "Q3", title: "판단 표준화", sub: "위험도 로직 명문화" },
            { num: "Q4", title: "경영진 가시성", sub: "실시간 KPI 조회" },
          ]}
          compact
        />
      </div>

      <Callout variant="info" title="파일럿 도입 권장">
        조직마다 부품 종수 · 제품 종수 · 월 발주 건수 · 문화가 다르므로 위
        수치는 참고용이다. 실제 도입 효과는 <b>2~4주 파일럿</b>을 통해 정량화
        하기를 권장한다. 파일럿 KPI 예: 대시보드 응답 시간, 주간 회의 횟수,
        발주서 작성 소요 시간, 재고 실사 오차율.
      </Callout>
    </SlideShell>
  );
}
