import BlockFlow from "@/app/components/BlockFlow";

export default function Overview() {
  return (
    <article className="slide-enter min-h-screen">
      <div className="px-6 sm:px-10 lg:px-14 pt-12 sm:pt-20 pb-12">
        <div className="inline-flex items-center gap-2 rounded-full border border-brand-400/30 bg-brand-500/10 px-3 py-1 text-[11px] font-semibold text-brand-200 backdrop-blur">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-brand-300 animate-pulse" />
          BOM Agent · Internal Preview · v1.0
        </div>
        <h1 className="mt-5 text-4xl sm:text-6xl font-extrabold tracking-tight leading-[1.05]">
          설계-구매-자재를
          <br />
          하나의 <span className="gradient-text">단일 진실 공급원 (SSoT)</span>로.
        </h1>
        <p className="mt-6 text-base sm:text-lg text-slate-300 leading-relaxed">
          다품종 부품을 다루는 제조 밸류체인의 균열 지점을 진단하고, BOM · 재고
          · 양산계획 · 공급망을 한 화면에서 결정 가능한 데이터로 통합하는 로컬
          자재관리 에이전트.
        </p>

        <dl className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-3xl">
          <div className="rounded-xl glass px-3.5 py-3 backdrop-blur">
            <dt className="text-[10.5px] uppercase tracking-wider text-slate-400">
              FCST Horizon
            </dt>
            <dd className="mt-1 text-2xl font-bold text-slate-50">
              2M / 6M
            </dd>
          </div>
          <div className="rounded-xl glass px-3.5 py-3 backdrop-blur">
            <dt className="text-[10.5px] uppercase tracking-wider text-slate-400">
              Risk Tier
            </dt>
            <dd className="mt-1 text-2xl font-bold text-slate-50">
              3 <span className="text-sm text-slate-400 ml-1">등급</span>
            </dd>
          </div>
          <div className="rounded-xl glass px-3.5 py-3 backdrop-blur">
            <dt className="text-[10.5px] uppercase tracking-wider text-slate-400">
              Audit Coverage
            </dt>
            <dd className="mt-1 text-2xl font-bold text-slate-50">
              100<span className="text-sm text-slate-400 ml-1">%</span>
            </dd>
          </div>
          <div className="rounded-xl glass px-3.5 py-3 backdrop-blur">
            <dt className="text-[10.5px] uppercase tracking-wider text-slate-400">
              Outbound Calls
            </dt>
            <dd className="mt-1 text-2xl font-bold text-slate-50">
              0
            </dd>
          </div>
        </dl>

        <div className="mt-12">
          <p className="text-[12px] uppercase tracking-[0.18em] text-brand-300 mb-3 font-semibold">
            프레젠테이션 흐름
          </p>
          <BlockFlow
            items={[
              { num: "01", title: "PROBLEM", sub: "밸류체인 균열 진단" },
              { num: "02", title: "SOLUTION", sub: "BOM Agent 소개" },
              { num: "03", title: "IMPACT", sub: "Before / After 비교" },
              { num: "04", title: "ROADMAP", sub: "확장 방향" },
            ]}
            compact
          />
        </div>

        <div className="mt-10 flex flex-wrap items-center gap-3 text-[12px] text-slate-400">
          <span className="tag">← / → 키로 슬라이드 이동</span>
          <span className="tag-muted tag">좌측 사이드바에서 챕터 선택</span>
        </div>
      </div>
    </article>
  );
}
