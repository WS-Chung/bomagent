import SlideShell from "@/app/components/SlideShell";
import { Card, CardGrid } from "@/app/components/Card";
import Callout from "@/app/components/Callout";

export default function Deliverables() {
  return (
    <SlideShell
      number="07"
      eyebrow="DELIVERABLES"
      title="기획의 맹점을, 산출물이 메우다"
      description="계획서의 '해결하겠다'가 이제 '동작하는 화면'이 되었다."
    >
      <CardGrid cols={3}>
        <Card title="대시보드" badge="핵심" accent="brand" icon="📊">
          2~6개월 잔여재고 예측 + 위험도(<b className="text-slate-100">대체·위험·주의·정상</b>) + 추천 발주량
        </Card>
        <Card title="공지사항" accent="brand" icon="📢">
          부서별(양산·공급·자재) 실시간 변동 + 발주 필요 <b className="text-slate-100">공급사 자동 그룹핑</b>
        </Card>
        <Card title="AI 챗봇" accent="brand" icon="💬">
          자연어로 즉시 조회 — "지금 위험한 부품 몇 개?"에 실시간 응답
        </Card>
        <Card title="BOM 편집" accent="brand" icon="🧾">
          부품 추가/삭제 시 <b className="text-slate-100">BOM 총액 실시간</b> 반영
        </Card>
        <Card title="발주 자동화" accent="brand" icon="📮">
          공급사별 발주서 원클릭 · 대체품 확인 메일 초안 자동
        </Card>
        <Card title="신뢰 · 로컬" accent="brand" icon="🔒">
          모든 변경 <b className="text-slate-100">100% 감사 추적</b> · 완전 사내(로컬) 동작
        </Card>
      </CardGrid>

      <Callout variant="info" title="맹점 → 개선">
        기획 당시의 맹점이었던 <b>사후 발견</b>·<b>정보 단절</b>·<b>높은 커뮤니케이션 비용</b>이,
        각각 <b>사전 예측</b>·<b>단일 화면</b>·<b>실시간 공유</b>로 대체되었다.
      </Callout>
    </SlideShell>
  );
}
