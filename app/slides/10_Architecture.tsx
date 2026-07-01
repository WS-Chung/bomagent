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
          배포 위상
        </p>
        <BlockFlow
          items={[
            {
              num: "L1",
              title: "브라우저 · SPA",
              sub: "순수 JS · 해시 라우터",
            },
            {
              num: "L2",
              title: "FastAPI · Uvicorn",
              sub: "자기 PC 주소에만 바인딩",
            },
            {
              num: "L3",
              title: "서비스 · Forecast Engine",
              sub: "즉시 트랜잭션 확보 방식",
            },
            {
              num: "L4",
              title: "SQLite · WAL 모드",
              sub: "단일 DB 파일",
            },
          ]}
        />
      </div>

      <CardGrid cols={3}>
        <Card title="프론트엔드 계층" accent="brand" badge="번들러 없음">
          <ul className="list-disc pl-4 space-y-1">
            <li>ES2022 모듈 · 브라우저 네이티브 로딩</li>
            <li>디자인 토큰 · tokens.css · 색상 하드코딩 금지</li>
            <li>페이지 간 갱신: 브라우저 CustomEvent 브로드캐스트</li>
            <li>fetch 같은 출처 · 자기 PC 전용</li>
          </ul>
        </Card>
        <Card title="API 계층" accent="brand" badge="FastAPI">
          <ul className="list-disc pl-4 space-y-1">
            <li>34개 엔드포인트 / 13개 라우터</li>
            <li>Pydantic v2 · 알 수 없는 필드는 기본적으로 거부</li>
            <li>표준 오류 응답 봉투: <b>code · message · details</b></li>
            <li>도메인 예외 클래스 · 전역 핸들러 정규화</li>
          </ul>
        </Card>
        <Card title="영속 계층" accent="brand" badge="SQLite">
          <ul className="list-disc pl-4 space-y-1">
            <li>12개 도메인 테이블 + <b>감사 로그 · 쓰기 전용</b></li>
            <li>모든 쓰기 = 변경 + 감사 기록의 원자 커밋</li>
            <li>외래키 정책: 제한 · 연쇄 · 널 설정 명시적 설계</li>
            <li>스키마 부트스트랩은 재실행 안전</li>
          </ul>
        </Card>
      </CardGrid>

      <div className="rounded-2xl glass p-4 sm:p-5 space-y-3">
        <p className="text-[12px] uppercase tracking-[0.18em] text-brand-300 font-semibold">
          신뢰 경계 · 보안 방어선
        </p>
        <BlockFlow
          items={[
            {
              num: "T1",
              title: "네트워크",
              sub: "자기 PC 주소에만 바인딩",
            },
            {
              num: "T2",
              title: "임포트 차단",
              sub: "외부 HTTP 라이브러리 금지",
            },
            {
              num: "T3",
              title: "테스트 보증",
              sub: "외부 통신 없음 자동 검증",
            },
            {
              num: "T4",
              title: "감사 로그",
              sub: "수정·삭제 요청 405 거부",
            },
          ]}
          compact
        />
      </div>

      <Callout variant="info" title="배포 · 백업 전략">
        서버 기동은 명령어 한 줄이다. 백업은 <b>서버 정지 후 DB 파일 복사</b>가
        가장 안전하다. 용량 정리는 서버가 정지된 상태에서 실행해야 한다.
      </Callout>
    </SlideShell>
  );
}
