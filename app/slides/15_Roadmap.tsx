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
          단계별 로드맵
        </p>
        <BlockFlow
          items={[
            { num: "P1", title: "다중 사용자·인증", sub: "SSO · 권한 관리" },
            { num: "P2", title: "저장소 업그레이드", sub: "SQLite → PostgreSQL" },
            { num: "P3", title: "실시간 동기화", sub: "웹소켓 브로드캐스트" },
            { num: "P4", title: "외부 시스템 연동", sub: "ERP · MES · 공급사" },
            { num: "P5", title: "분석·AI", sub: "예측 정확도 회귀" },
          ]}
        />
      </div>

      <CardGrid cols={2}>
        <Card title="① 인증·권한·감사 강화" accent="brand" badge="1단계">
          <ul className="list-disc pl-4 space-y-1">
            <li>사내 SSO 연동 · 세션 또는 토큰 기반 인증</li>
            <li>역할 기반 권한: 엔지니어·구매·자재·회계·관리자</li>
            <li>감사 로그의 사용자 필드를 <b>실사용자로 대체</b></li>
            <li>감사 로그 분할 저장 · 보관 정책</li>
          </ul>
        </Card>
        <Card title="② 저장소 업그레이드" accent="brand" badge="2단계">
          <ul className="list-disc pl-4 space-y-1">
            <li>PostgreSQL 이관 · 저장소 계층이 이미 분리되어 있음</li>
            <li>마이그레이션 도구 도입 · 스키마 변경 이력 관리</li>
            <li>행 단위 접근 제어 · 부서별 뷰</li>
            <li>백업: 시점 기반 복구 지원</li>
          </ul>
        </Card>
        <Card title="③ 실시간 동기화" accent="brand" badge="3단계">
          <ul className="list-disc pl-4 space-y-1">
            <li>웹소켓 기반 편집 이벤트 브로드캐스트</li>
            <li>여러 탭·여러 사용자 편집 충돌 시각화</li>
            <li>낙관적 UI · 서버 푸시 이벤트</li>
            <li>대시보드 자동 새로고침 없이 실시간 갱신</li>
          </ul>
        </Card>
        <Card title="④ 외부 시스템 연동" accent="brand" badge="4단계">
          <ul className="list-disc pl-4 space-y-1">
            <li>ERP 마스터 데이터 양방향 동기화</li>
            <li>MES 실적 데이터 수신 → 재고 자동 차감</li>
            <li>공급사 견적 API 자동 수집</li>
            <li>세관·결제·물류 추적 통합</li>
          </ul>
        </Card>
        <Card title="⑤ 분석·AI" accent="emerald" badge="5단계">
          <ul className="list-disc pl-4 space-y-1">
            <li>예측 오차 회귀 분석 · 리드타임 실측 학습</li>
            <li>대체품 자동 추천 · 사양 유사도 기반</li>
            <li>공급사 리스크 스코어링</li>
            <li>안전 재고·경제적 발주량 자동 튜닝</li>
          </ul>
        </Card>
        <Card title="⑥ 배포·운영 성숙도" accent="emerald" badge="운영">
          <ul className="list-disc pl-4 space-y-1">
            <li>컨테이너 기반 배포 옵션 확대</li>
            <li>서버 사이드 PDF 렌더링으로 인쇄 품질 향상</li>
            <li>지표·추적 관측성 도구 도입</li>
            <li>다국어 지원</li>
          </ul>
        </Card>
      </CardGrid>

      <div className="rounded-2xl glass p-4 sm:p-5 space-y-3">
        <p className="text-[12px] uppercase tracking-[0.18em] text-brand-300 font-semibold">
          단기 · 3개월 우선 후보 · MVP 위에서 즉시 착수 가능
        </p>
        <BlockFlow
          items={[
            { num: "S1", title: "발주서 저장", sub: "발주 테이블·이력" },
            { num: "S2", title: "엑셀·CSV 내보내기", sub: "대시보드 다운로드" },
            { num: "S3", title: "부품 삭제 흐름", sub: "참조 확인 UX" },
            { num: "S4", title: "감사 로그 필터 확장", sub: "액션별 필터" },
          ]}
          compact
        />
      </div>

      <Callout variant="success" title="마무리 · 정확성이 첫 번째 자산">
        MVP의 가장 큰 자산은 화려한 기능이 아니라 <b>모든 쓰기가 원자적이고,
        모든 계산이 결정론적이며, 모든 변경이 감사된다</b>는 사실이다. 이 기반
        위에서만 위의 확장들이 안정적으로 얹힐 수 있다. 시니어 백엔드가
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
