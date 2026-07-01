import type { ReactNode } from "react";

export function CardGrid({
  cols = 2,
  children,
}: {
  cols?: 2 | 3 | 4;
  children: ReactNode;
}) {
  const grid =
    cols === 4
      ? "sm:grid-cols-2 lg:grid-cols-4"
      : cols === 3
      ? "sm:grid-cols-2 lg:grid-cols-3"
      : "sm:grid-cols-2";
  return <div className={`grid grid-cols-1 ${grid} gap-3.5`}>{children}</div>;
}

export function Card({
  title,
  badge,
  icon,
  accent,
  children,
}: {
  title: string;
  badge?: string;
  icon?: ReactNode;
  accent?: "brand" | "amber" | "emerald" | "rose" | "slate";
  children: ReactNode;
}) {
  const accentColor =
    accent === "amber"
      ? "from-amber-500/20"
      : accent === "emerald"
      ? "from-emerald-500/20"
      : accent === "rose"
      ? "from-rose-500/20"
      : accent === "slate"
      ? "from-slate-500/15"
      : "from-brand-500/20";
  return (
    <div className="group relative rounded-2xl glass p-4 sm:p-5 transition hover:-translate-y-0.5 hover:border-brand-400/40">
      <div
        className={`pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br ${accentColor} via-transparent to-transparent opacity-50`}
      />
      <div className="relative">
        <div className="flex items-center gap-2 mb-1.5">
          {icon && <span className="text-base text-brand-300">{icon}</span>}
          <h3 className="font-semibold text-slate-50 text-[15px] flex-1">
            {title}
          </h3>
          {badge && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-brand-500/20 text-brand-200 ring-1 ring-brand-400/30">
              {badge}
            </span>
          )}
        </div>
        <div className="text-[13.5px] leading-relaxed text-slate-300">
          {children}
        </div>
      </div>
    </div>
  );
}
