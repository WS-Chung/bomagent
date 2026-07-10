import SlideShell from "@/app/components/SlideShell";

const rows: { k: string; as: string; to: string }[] = [
  { k: "BOM 관리", as: "엑셀 파일 · 수작업", to: "단일 DB · 총액 실시간" },
  { k: "납기 파악", as: "부품별 수동 확인", to: "자동 위험도 4등급" },
  { k: "위험 감지", as: "사후 · 경험 의존", to: "2~6개월 사전 예측" },
  { k: "정보 공유", as: "메일 · 미팅 · 사본", to: "모든 부서 동일 화면" },
  { k: "발주 판단", as: "수동 취합 후 결정", to: "공급사별 자동 + 발주서" },
  { k: "커뮤니케이션", as: "확인·재확인 반복", to: "질문은 챗봇에 즉답" },
];

export default function Compare() {
  return (
    <SlideShell
      number="06"
      eyebrow="AS-IS vs TO-BE"
      title="한눈에 보는 전환"
      description="같은 업무, 완전히 다른 방식."
    >
      <div className="rounded-2xl glass overflow-hidden">
        <div className="grid grid-cols-[1fr_1.4fr_1.4fr] text-[12px] uppercase tracking-wider text-slate-400 font-semibold bg-ink-800/60 border-b border-slate-700/60">
          <div className="px-4 py-3">항목</div>
          <div className="px-4 py-3 text-rose-300/90">AS-IS · 엑셀 + 미팅</div>
          <div className="px-4 py-3 text-emerald-300/90">TO-BE · BOM Agent</div>
        </div>
        {rows.map((r, i) => (
          <div
            key={r.k}
            className={`grid grid-cols-[1fr_1.4fr_1.4fr] items-center text-[14px] ${
              i < rows.length - 1 ? "border-b border-slate-800/60" : ""
            } hover:bg-brand-500/5 transition`}
          >
            <div className="px-4 py-3.5 font-semibold text-slate-100">
              {r.k}
            </div>
            <div className="px-4 py-3.5 text-slate-400 line-through decoration-rose-400/30 decoration-1">
              {r.as}
            </div>
            <div className="px-4 py-3.5 text-slate-100 font-medium">
              <span className="text-emerald-300 mr-1.5" aria-hidden>
                ✓
              </span>
              {r.to}
            </div>
          </div>
        ))}
      </div>
    </SlideShell>
  );
}
