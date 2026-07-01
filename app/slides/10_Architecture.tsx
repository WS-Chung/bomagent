import SlideShell from "@/app/components/SlideShell";
import BlockFlow from "@/app/components/BlockFlow";
import { Card, CardGrid } from "@/app/components/Card";
import Callout from "@/app/components/Callout";

export default function Architecture() {
  return (
    <SlideShell
      number="10"
      eyebrow="Solution · System Architecture"
      title="시스템 아키텍처"
      description="Vanilla JS SPA + FastAPI + SQLite. 프로세스 하나, 파일 하나. 사내망 격리와 감사 신뢰성에 최적화된 로컬 단일 배포 구조."
    >
      <div className="rounded-2xl glass p-4 sm:p-5 space-y-3">
        <p className="text-[12px] uppercase tracking-[0.18em] text-brand-300 font-semibold">
          Deployment Topology · 배포 위상
        </p>
        <BlockFlow
          items={[
            {
              num: "L1",
              title: "Browser (SPA)",
              sub: "Vanilla JS · Hash Router",
            },
            {
              num: "L2",
              title: "FastAPI + Uvicorn",
              sub: "127.0.0.1:8000 (loopback)",
            },
            {
              num: "L3",
              title: "Services · Forecast Engine",
              sub: "BEGIN IMMEDIATE 트랜잭션",
            },
            {
              num: "L4",
              title: "SQLite (WAL)",
              sub: "bom_agent.db · 단일 파일",
            },
          ]}
        />
      </div>

      <CardGrid cols={3}>
        <Card title="Frontend Layer" accent="brand" badge="No Bundler">
          <ul className="list-disc pl-4 space-y-1">
            <li>ES2022 modules · <code className="text-brand-300">&lt;script type=&quot;module&quot;&gt;</code></li>
            <li>Design Token · tokens.css · hex 리터럴 금지</li>
            <li>페이지 간 갱신: window CustomEvent 브로드캐스트</li>
            <li>fetch same-origin · loopback only</li>
          </ul>
        </Card>
        <Card title="API Layer" accent="brand" badge="FastAPI 0.110">
          <ul className="list-disc pl-4 space-y-1">
            <li>34개 엔드포인트 / 13개 라우터</li>
            <li>Pydantic v2 · extra=forbid 기본</li>
            <li>4xx envelope: <code>{"{code, message, details}"}</code></li>
            <li>DomainError 서브클래스 · 전역 핸들러 정규화</li>
          </ul>
        </Card>
        <Card title="Persistence Layer" accent="brand" badge="SQLite WAL">
          <ul className="list-disc pl-4 space-y-1">
            <li>12개 도메인 테이블 + <b>audit_log (write-only)</b></li>
            <li>모든 write = mutation + audit_write 원자 커밋</li>
            <li>FK 정책: RESTRICT/CASCADE/SET NULL 명시적 설계</li>
            <li>스키마 부트스트랩 idempotent · IF NOT EXISTS</li>
          </ul>
        </Card>
      </CardGrid>

      <div className="rounded-2xl glass p-4 sm:p-5 space-y-3">
        <p className="text-[12px] uppercase tracking-[0.18em] text-brand-300 font-semibold">
          Trust Boundary · 신뢰 경계
        </p>
        <BlockFlow
          items={[
            {
              num: "T1",
              title: "Network",
              sub: "127.0.0.1 강제 바인딩",
            },
            {
              num: "T2",
              title: "Import Guard",
              sub: "ruff TID251 · requests/httpx 차단",
            },
            {
              num: "T3",
              title: "Test Assurance",
              sub: "test_no_outbound.py 검증",
            },
            {
              num: "T4",
              title: "Audit",
              sub: "PUT/DELETE audit_log 405",
            },
          ]}
          compact
        />
      </div>

      <Callout variant="info" title="배포 · 백업 전략">
        서버 기동은 <code className="text-brand-300">python app.py</code> 한
        줄이다. 백업은 <b>서버 정지 후 bom_agent.db 파일 복사</b>가 가장
        안전하다. VACUUM은 SQLite CLI로 실행하며 서버가 정지된 상태여야 한다.
      </Callout>
    </SlideShell>
  );
}
