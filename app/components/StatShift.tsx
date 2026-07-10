import type { ReactNode } from "react";

export function StatShiftGrid({
  cols = 3,
  children,
}: {
  cols?: 2 | 3;
  children: ReactNode;
}) {
  const grid = cols === 2 ? "sm:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-3";
  return <div className={`grid grid-cols-1 ${grid} gap-3.5`}>{children}</div>;
}

/**
 * AS-IS → To-Be 정량 전환 카드.
 * from(엑셀·미팅 시절, 톤다운) → 화살표 → to(시스템, 그라디언트 강조).
 */
export function StatShift({
  label,
  from,
  to,
  note,
}: {
  label: string;
  from: ReactNode;
  to: ReactNode;
  note?: string;
}) {
  return (
    <div className="relative rounded-2xl glass p-4 sm:p-5 overflow-hidden">
      <div className="pointer-events-none absolute -top-10 -right-10 h-28 w-28 rounded-full bg-brand-500/15 blur-2xl" />
      <div className="relative">
        <p className="text-[11px] uppercase tracking-[0.14em] text-slate-400 font-semibold">
          {label}
        </p>
        <div className="mt-3 flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] uppercase tracking-wider text-rose-300/80 mb-0.5">
              AS-IS
            </p>
            <p className="text-[15px] font-medium text-slate-400 leading-snug line-through decoration-rose-400/40 decoration-1">
              {from}
            </p>
          </div>
          <span
            className="shrink-0 text-brand-300 text-lg leading-none"
            aria-hidden
          >
            →
          </span>
          <div className="min-w-0 flex-1 text-right">
            <p className="text-[10px] uppercase tracking-wider text-emerald-300/90 mb-0.5">
              TO-BE
            </p>
            <p className="text-xl sm:text-2xl font-extrabold gradient-text leading-tight">
              {to}
            </p>
          </div>
        </div>
        {note && (
          <p className="mt-3 pt-3 border-t border-slate-700/50 text-[12.5px] text-slate-400 leading-relaxed">
            {note}
          </p>
        )}
      </div>
    </div>
  );
}
