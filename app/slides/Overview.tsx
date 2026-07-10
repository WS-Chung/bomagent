import BlockFlow from "@/app/components/BlockFlow";

const stats = [
  { label: "예측 시야", value: "2~6", suffix: "개월" },
  { label: "위험도 등급", value: "4", suffix: "단계" },
  { label: "감사 추적", value: "100", suffix: "%" },
  { label: "외부 통신", value: "0", suffix: "건" },
];

export default function Overview() {
  return (
    <article className="slide-enter min-h-screen">
      <div className="px-6 sm:px-10 lg:px-14 pt-12 sm:pt-20 pb-14">
        <div className="inline-flex items-center gap-2 rounded-full border border-brand-400/30 bg-brand-500/10 px-3 py-1 text-[11px] font-semibold text-brand-200 backdrop-blur">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-brand-300 animate-pulse" />
          제조 자재관리 · AI 활용 세미나
        </div>

        <h1 className="mt-5 text-4xl sm:text-6xl font-extrabold tracking-tight leading-[1.05]">
          엑셀과 미팅으로 굴러가던 자재관리를
          <br />
          <span className="gradient-text">하나의 실시간 화면</span>으로
        </h1>

        <p className="mt-5 text-base sm:text-lg text-slate-300 leading-relaxed">
          AI로 <b className="text-slate-100">커뮤니케이션 오버헤드</b>와{" "}
          <b className="text-slate-100">반복·시간낭비 업무</b>를 줄이고, 모든
          부서가 <b className="text-slate-100">동일한 정보를 실시간</b>으로.
          <br className="hidden sm:block" />
          개개인이 더 많은 정보를, 불필요한 체크 없이, 똑같이 빠르게 관리하는 것.
        </p>

        <dl className="mt-9 grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-3xl">
          {stats.map((s) => (
            <div
              key={s.label}
              className="rounded-xl glass px-3.5 py-3 backdrop-blur"
            >
              <dt className="text-[10.5px] uppercase tracking-wider text-slate-400">
                {s.label}
              </dt>
              <dd className="mt-1 text-2xl font-bold text-slate-50">
                {s.value}
                {s.suffix && (
                  <span className="text-sm text-slate-400 ml-1">{s.suffix}</span>
                )}
              </dd>
            </div>
          ))}
        </dl>

        <div className="mt-10">
          <BlockFlow
            items={[
              { num: "01", title: "진단", sub: "AS-IS · 엑셀의 현실" },
              { num: "02", title: "전환", sub: "To-Be · 단일 진실원천" },
              { num: "03", title: "산출물", sub: "무엇을 만들었나" },
              { num: "04", title: "화두", sub: "남은 해결과제" },
            ]}
            compact
          />
        </div>

        <p className="mt-8 text-[12.5px] text-slate-500">
          ← / → 방향키 또는 좌측 목차로 이동합니다.
        </p>
      </div>
    </article>
  );
}
