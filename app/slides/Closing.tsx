import SlideShell from "@/app/components/SlideShell";

const pillars = [
  { k: "커뮤니케이션 오버헤드", v: "↓ 대폭" },
  { k: "반복·시간낭비 업무", v: "↓ 자동화" },
  { k: "실시간·통일 정보", v: "↑ 전 부서" },
];

export default function Closing() {
  return (
    <SlideShell
      number="09"
      eyebrow="THE POINT"
      title="핵심은 하나입니다"
    >
      <div className="rounded-2xl glass p-6 sm:p-10 relative overflow-hidden">
        <div className="pointer-events-none absolute -top-16 -right-10 h-40 w-40 rounded-full bg-brand-500/15 blur-3xl" />
        <p className="relative text-xl sm:text-3xl font-bold leading-[1.5] text-slate-100">
          AI로 <span className="gradient-text">커뮤니케이션 오버헤드</span>와{" "}
          <span className="gradient-text">반복 업무</span>를 줄이고,
          <br className="hidden sm:block" />
          모든 부서에 <span className="gradient-text">실시간·통일·정확</span>한
          정보를 공유해,
          <br className="hidden sm:block" />
          개개인이 <b className="text-white">더 많은 정보를</b>,{" "}
          <b className="text-white">불필요한 체크 없이</b>,{" "}
          <b className="text-white">똑같이 빠르게</b> 관리한다.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        {pillars.map((p) => (
          <div
            key={p.k}
            className="rounded-2xl glass p-5 text-center relative overflow-hidden"
          >
            <div className="absolute -top-8 -right-8 h-24 w-24 rounded-full bg-brand-500/15 blur-2xl" />
            <p className="relative text-2xl font-extrabold gradient-text">
              {p.v}
            </p>
            <p className="relative mt-1.5 text-[12.5px] text-slate-400">
              {p.k}
            </p>
          </div>
        ))}
      </div>

      <p className="text-center text-[13px] text-slate-500 pt-2">
        BOM Agent · 제조 자재관리 · 감사합니다.
      </p>
    </SlideShell>
  );
}
