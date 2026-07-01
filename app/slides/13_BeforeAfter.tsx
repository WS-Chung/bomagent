import SlideShell from "@/app/components/SlideShell";
import BlockFlow from "@/app/components/BlockFlow";
import FlowDiagram from "@/app/components/FlowDiagram";
import Callout from "@/app/components/Callout";

export default function BeforeAfter() {
  return (
    <SlideShell
      number="13"
      eyebrow="Impact · Workflow Comparison"
      title="Before / After · 단계별 워크플로우 비교"
      description="동일한 시나리오 — 엔지니어로부터 신규 BOM을 받아 재고를 대조하고 발주까지 완료하는 과정 — 을 레거시 방식과 BOM Agent 방식으로 나란히 비교한다."
    >
      <div className="rounded-2xl glass p-4 sm:p-5 space-y-3">
        <p className="text-[12px] uppercase tracking-[0.18em] text-slate-400 font-semibold">
          🔴 현행 · 레거시 흐름 · 다수 인력, 반복 회의
        </p>
        <FlowDiagram
          steps={[
            {
              title: "STEP 1 · 엔지니어가 BOM을 이메일·메신저로 전달",
              body: "구매 담당자는 첨부 파일을 열어 신규 부품과 기존 등록 부품을 수기로 대조한다. 시트 열 순서·헤더가 프로젝트마다 달라 사전 정리에만 30분 이상 소요.",
            },
            {
              title: "STEP 2 · 각 부품의 재고·단가·리드타임·MOQ를 조회",
              body: "ERP 화면과 견적 파일을 오가며 부품별로 확인. 담당자마다 사용하는 조회 화면과 계산 방식이 달라 결과가 미묘하게 어긋난다.",
            },
            {
              title: "STEP 3 · 생산팀과 회의를 통해 월별 양산 수량 확인",
              body: "생산 스케줄이 매주 롤링되므로, 회의 시점 기준의 수량이 이틀 뒤에는 이미 다른 값이 되어 있다. 회의록과 스프레드시트를 다시 맞춘다.",
            },
            {
              title: "STEP 4 · 부품별 부족량을 매크로·수식으로 계산",
              body: "복잡한 조회 함수 체인이 여러 시트를 오간다. 시트 하나가 이름을 바꾸면 참조가 깨진다. 실무자는 매번 링크 무결성을 확인한다.",
            },
            {
              title: "STEP 5 · 위험도 판단은 담당자의 감으로",
              body: "리드타임이 12주인 부품과 4주인 부품의 우선순위가 개인 판단에 좌우된다. 담당자 교체 시 판단 기준이 함께 바뀐다.",
            },
            {
              title: "STEP 6 · 공급사별로 수기로 발주서 작성",
              body: "엑셀 발주서 서식을 복사해 부품 리스트를 붙여 넣고 담당자·연락처·사업자번호를 다시 입력한다. 오타·누락·잘못된 공급사 지정이 발생.",
            },
            {
              title: "STEP 7 · 각 부서에 문서 재공유·재확인",
              body: "회계·생산·품질에 최신본을 다시 전달한다. 다음 주 회의에서 또 어긋난 숫자가 발견되어 처음 단계로 돌아간다.",
            },
          ]}
        />
      </div>

      <div className="rounded-2xl glass p-4 sm:p-5 space-y-3">
        <p className="text-[12px] uppercase tracking-[0.18em] text-emerald-300 font-semibold">
          🟢 개선 후 · BOM Agent 흐름 · 한 명, 30분
        </p>
        <FlowDiagram
          steps={[
            {
              title: "STEP 1 · 재고관리 페이지에서 신규 부품 등록",
              body: "접두어만 선택하면 자체 부품번호가 자동으로 채번된다. 분류·제조사·공급사는 드롭다운에서 [+ 신규 추가]로 인라인 생성. 입고 즉시 재고에 반영.",
            },
            {
              title: "STEP 2 · 양산계획 매트릭스에 월별 수량 입력",
              body: "제품 × 월 매트릭스에 수량을 채우고 [저장] 한 번. 트랜잭션 락 경쟁 없이 원자적으로 반영되며, 지난 월은 자동 숨김.",
            },
            {
              title: "STEP 3 · BOM 편집 모달에서 라인 구성",
              body: "제품 행의 [BOM] 링크 클릭 → 부품 선택·투입 수량·참조 번호 입력. 자유 텍스트 입력은 금지되어 있어 미등록 부품이 흘러들 수 없다.",
            },
            {
              title: "STEP 4 · 대시보드에서 자동 계산 결과 확인",
              body: "저장과 동시에 Forecast Engine이 재계산되어 2·6개월 예측 재고, 위험도, 추천 발주량이 즉시 갱신된다. 결과는 위험도와 6개월 예측 재고 순으로 정렬.",
            },
            {
              title: "STEP 5 · 위험도·공급사 필터로 발주 후보 좁히기",
              body: "위험만 필터하면 즉시 발주 필요 부품, 주의를 함께 보면 계획적 발주 후보. 특정 공급사 선택 시 우상단 [발주서 자동작성] 버튼이 활성화된다.",
            },
            {
              title: "STEP 6 · 공급사별 발주서 초안 자동 생성",
              body: "A4 세로 발주서에 공급사 상세정보(정식명·담당자·이메일·사업자 등록번호), 부품 리스트, 추천 수량, 단가가 자동으로 채워진다. [인쇄]로 PDF 저장.",
            },
            {
              title: "STEP 7 · 감사 로그로 모든 변경 이력이 자동 축적",
              body: "누가 언제 어떤 값을 어떻게 바꿨는지 컬럼당 1건씩 기록된다. 회의·재공유·문서 대조 없이 시스템이 단일 진실 공급원을 유지한다.",
            },
          ]}
        />
      </div>

      <Callout variant="success" title="핵심 차이">
        레거시 흐름의 STEP 3~7은 <b>사람이 계산하고, 사람이 판단하고, 사람이
        문서를 맞추는</b> 단계다. Agent 흐름에서는 이 단계들이 데이터 저장과
        동시에 자동으로 완결된다. 남는 것은 <b>발주 승인이라는 사람의 판단</b>
        뿐이다.
      </Callout>

      <div className="rounded-2xl glass p-4 sm:p-5 space-y-3">
        <p className="text-[12px] uppercase tracking-[0.18em] text-brand-300 font-semibold">
          정량 비교 · 동일 시나리오, 신규 BOM 1건·부품 60종 기준 추정
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-[14px]">
            <thead>
              <tr className="text-slate-400 uppercase tracking-wider text-[12px] border-b border-slate-700/60">
                <th className="text-left py-2.5 px-3.5">지표</th>
                <th className="text-left py-2.5 px-3.5">🔴 Legacy</th>
                <th className="text-left py-2.5 px-3.5">🟢 BOM Agent</th>
                <th className="text-left py-2.5 px-3.5">개선</th>
              </tr>
            </thead>
            <tbody className="text-slate-200">
              <tr className="border-b border-slate-800/60">
                <td className="py-2.5 px-3.5">투입 인력</td>
                <td className="py-2.5 px-3.5 text-rose-300">3~4명</td>
                <td className="py-2.5 px-3.5 text-emerald-300">1명</td>
                <td className="py-2.5 px-3.5">~75% ↓</td>
              </tr>
              <tr className="border-b border-slate-800/60">
                <td className="py-2.5 px-3.5">소요 시간</td>
                <td className="py-2.5 px-3.5 text-rose-300">1~2일</td>
                <td className="py-2.5 px-3.5 text-emerald-300">30분~1시간</td>
                <td className="py-2.5 px-3.5">~90% ↓</td>
              </tr>
              <tr className="border-b border-slate-800/60">
                <td className="py-2.5 px-3.5">동기화 회의 횟수</td>
                <td className="py-2.5 px-3.5 text-rose-300">주 3~5회</td>
                <td className="py-2.5 px-3.5 text-emerald-300">주 0~1회</td>
                <td className="py-2.5 px-3.5">~80% ↓</td>
              </tr>
              <tr className="border-b border-slate-800/60">
                <td className="py-2.5 px-3.5">휴먼 에러 발생률</td>
                <td className="py-2.5 px-3.5 text-rose-300">중~고</td>
                <td className="py-2.5 px-3.5 text-emerald-300">시스템 검증</td>
                <td className="py-2.5 px-3.5">구조적 억제</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3.5">감사 · 추적성</td>
                <td className="py-2.5 px-3.5 text-rose-300">문서 산재</td>
                <td className="py-2.5 px-3.5 text-emerald-300">감사 로그 100%</td>
                <td className="py-2.5 px-3.5">완전 추적</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-[12px] text-slate-400">
          위 수치는 60~80종 부품·4개 제품 규모의 중소 제조 업체를 가정한
          추정치이며, 실제 도입 시 <b>시범 프로젝트로 정량화</b>가 필요하다.
        </p>
      </div>
    </SlideShell>
  );
}
