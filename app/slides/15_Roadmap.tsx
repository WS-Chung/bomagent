import SlideShell from "@/app/components/SlideShell";
import BlockFlow from "@/app/components/BlockFlow";
import { Card, CardGrid } from "@/app/components/Card";
import Callout from "@/app/components/Callout";

export default function Roadmap() {
  return (
    <SlideShell
      number="15"
      eyebrow="Roadmap · Next Steps"
      title="시니어 관점 확장 로드맵"
      description="MVP는 로컬 단일 사용자 · 순수 자재관리 스코프로 완결됐다. 여기서 시니어 백엔드가 결합되면 다음과 같은 축으로 확장 가능하다. 우선순위는 조직 특성에 맞춰 조정한다."
    >
      <div className="rounded-2xl glass p-4 sm:p-5 space-y-3">
        <p className="text-[12px] uppercase tracking-[0.18em] text-brand-300 font-semibold">
          Phase Roadmap
        </p>
        <BlockFlow
          items={[
            { num: "P1", title: "Multi-User & AuthN", sub: "SSO · RBAC" },
            { num: "P2", title: "Persistence Upgrade", sub: "SQLite → Postgres" },
            { num: "P3", title: "Realtime Sync", sub: "WebSocket · Broadcast" },
            { num: "P4", title: "Integration", sub: "ERP · MES · SCM API" },
            { num: "P5", title: "Analytics", sub: "예측 정확도 회귀" },
          ]}
        />
      </div>

      <CardGrid cols={2}>
        <Card title="① 인증 · 권한 · 감사 강화" accent="brand" badge="Phase 1">
          <ul className="list-disc pl-4 space-y-1">
            <li>SSO(OIDC · SAML) 연동 · 세션·JWT</li>
            <li>RBAC: 엔지니어 · 구매 · 자재 · 회계 · 관리자</li>
            <li>audit_log.user를 <b>실사용자로 대체</b></li>
            <li>감사 로그 파티셔닝 · 아카이빙 정책</li>
          </ul>
        </Card>
        <Card title="② 저장소 업그레이드" accent="brand" badge="Phase 2">
          <ul className="list-disc pl-4 space-y-1">
            <li>Postgres 마이그레이션 (repositories 레이어 이미 준비됨)</li>
            <li>Alembic 도입 · 스키마 진화 관리</li>
            <li>Row-level security · 부서별 뷰</li>
            <li>Backup: PITR (Point-in-Time Recovery)</li>
          </ul>
        </Card>
        <Card title="③ 실시간 동기화" accent="brand" badge="Phase 3">
          <ul className="list-disc pl-4 space-y-1">
            <li>WebSocket 기반 편집 이벤트 브로드캐스트</li>
            <li>Cross-tab · Cross-user 편집 충돌 시각화</li>
            <li>Optimistic UI · Server-Sent Events</li>
            <li>대시보드 자동 폴백 없이 실시간 갱신</li>
          </ul>
        </Card>
        <Card title="④ 외부 시스템 연동" accent="brand" badge="Phase 4">
          <ul className="list-disc pl-4 space-y-1">
            <li>ERP 마스터 데이터 양방향 동기화</li>
            <li>MES 실적 데이터 수신 → 재고 자동 차감</li>
            <li>공급사 견적 API (Digi-Key · Mouser · LCSC)</li>
            <li>세관 · 결제 · 물류 트래킹 wall</li>
          </ul>
        </Card>
        <Card title="⑤ 분석 · AI" accent="emerald" badge="Phase 5">
          <ul className="list-disc pl-4 space-y-1">
            <li>예측 오차 회귀 분석 · L/T 실측 학습</li>
            <li>대체품 자동 추천 (사양 유사도)</li>
            <li>공급사 리스크 스코어링</li>
            <li>재고 최적화(EOQ · Safety Stock) 자동 튜닝</li>
          </ul>
        </Card>
        <Card title="⑥ 배포 · 운영 성숙도" accent="emerald" badge="Ops">
          <ul className="list-disc pl-4 space-y-1">
            <li>Docker · Compose · Kubernetes 배포 옵션</li>
            <li>서버 사이드 PDF 렌더링 (WeasyPrint · Playwright)</li>
            <li>Prometheus 지표 · OpenTelemetry Tracing</li>
            <li>다국어(I18n) · Fluent · i18next</li>
          </ul>
        </Card>
      </CardGrid>

      <div className="rounded-2xl glass p-4 sm:p-5 space-y-3">
        <p className="text-[12px] uppercase tracking-[0.18em] text-brand-300 font-semibold">
          단기(3개월) 우선 후보 · MVP 위에서 즉시 착수 가능
        </p>
        <BlockFlow
          items={[
            { num: "S1", title: "발주서 Persistence", sub: "PO 테이블 · 이력" },
            { num: "S2", title: "CSV/Excel Export", sub: "대시보드 다운로드" },
            { num: "S3", title: "부품 Soft Delete", sub: "참조 확인 UX" },
            { num: "S4", title: "감사 로그 필터 확장", sub: "action별 필터" },
          ]}
          compact
        />
      </div>

      <Callout variant="success" title="마무리 · Correctness가 첫 번째 자산">
        MVP의 가장 큰 자산은 화려한 기능이 아니라 <b>모든 write가 원자적이고,
        모든 계산이 결정론적이며, 모든 변경이 감사된다</b>는 사실이다. 이
        기반 위에서만 위의 확장들이 안정적으로 얹힐 수 있다. 시니어 백엔드가
        결합되면 이 자산을 지키면서 확장의 폭을 넓힐 수 있다.
      </Callout>

      <div className="rounded-2xl border border-brand-400/30 bg-gradient-to-br from-brand-500/15 via-brand-500/5 to-transparent p-5 sm:p-6 text-center">
        <p className="text-[12px] uppercase tracking-[0.18em] text-brand-300 font-semibold mb-2">
          Thank You
        </p>
        <p className="text-2xl sm:text-3xl font-extrabold gradient-text">
          Questions & Discussion
        </p>
        <p className="mt-3 text-slate-300 text-[15px]">
          진단 · 솔루션 · 로드맵 어떤 축이든 함께 논의합니다.
        </p>
      </div>
    </SlideShell>
  );
}
