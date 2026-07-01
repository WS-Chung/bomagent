"use client";
import { useEffect, useState } from "react";
import { navItems } from "@/app/data/nav";

type Props = { activeId: string; onSelect: (id: string) => void };

export default function Sidebar({ activeId, onSelect }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false);
  useEffect(() => {
    setMobileOpen(false);
  }, [activeId]);

  const groups: { name?: string; items: typeof navItems }[] = [];
  navItems.forEach((it) => {
    const last = groups[groups.length - 1];
    if (last && last.name === it.group) last.items.push(it);
    else groups.push({ name: it.group, items: [it] });
  });

  return (
    <>
      <button
        type="button"
        onClick={() => setMobileOpen((v) => !v)}
        className="no-print fixed bottom-5 right-5 z-50 lg:hidden rounded-full bg-brand-500 hover:bg-brand-400 text-white shadow-glow px-5 py-3 text-sm font-semibold active:scale-95 transition"
        aria-label="목차 열기"
      >
        {mobileOpen ? "닫기 ✕" : "목차 ☰"}
      </button>
      {mobileOpen && (
        <div
          className="no-print fixed inset-0 z-30 bg-ink-950/70 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <aside
        className={`no-print fixed lg:sticky top-0 left-0 z-40 h-screen w-[280px] shrink-0 border-r border-slate-800/70 bg-ink-900/80 backdrop-blur-xl transition-transform duration-200 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="h-full overflow-y-auto px-4 py-6">
          <button
            type="button"
            onClick={() => onSelect("overview")}
            className="w-full flex items-center gap-2.5 mb-7 px-2"
          >
            <span className="relative inline-block">
              <span className="absolute inset-0 rounded-xl bg-brand-500 blur-md opacity-60" />
              <span className="relative inline-block h-9 w-9 rounded-xl bg-gradient-to-br from-brand-400 to-brand-700 ring-1 ring-white/20" />
            </span>
            <span className="text-left">
              <span className="block font-bold tracking-tight text-slate-50 text-[15px]">
                BOM Agent
              </span>
              <span className="block text-xs text-brand-300 font-medium tracking-wide">
                Material Ops · v1.0
              </span>
            </span>
          </button>
          <nav className="space-y-5">
            {groups.map((g, gi) => (
              <div key={gi}>
                {g.name && (
                  <p className="px-2 mb-1.5 text-[11px] uppercase tracking-[0.18em] font-semibold text-slate-500">
                    {g.name}
                  </p>
                )}
                <ul className="space-y-1">
                  {g.items.map((n) => {
                    const isActive = activeId === n.id;
                    const isAppendix = n.appendix;
                    return (
                      <li key={n.id}>
                        <button
                          type="button"
                          onClick={() => onSelect(n.id)}
                          className={`group w-full flex items-center gap-3 rounded-lg px-2.5 py-2.5 text-base transition relative ${
                            isActive
                              ? isAppendix
                                ? "bg-slate-800/80 text-white font-semibold ring-1 ring-slate-700"
                                : "bg-gradient-to-r from-brand-500/25 via-brand-500/10 to-transparent text-white font-semibold ring-1 ring-brand-400/35"
                              : "text-slate-300 hover:bg-slate-800/40 hover:text-white"
                          }`}
                        >
                          {isActive && !isAppendix && (
                            <span className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-[3px] rounded-r-full bg-brand-300 shadow-[0_0_10px_2px_rgba(27,187,204,0.7)]" />
                          )}
                          <span
                            className={`text-[12px] font-mono font-semibold tabular-nums ${
                              isActive
                                ? isAppendix
                                  ? "text-slate-300"
                                  : "text-brand-200"
                                : "text-slate-500 group-hover:text-slate-400"
                            }`}
                          >
                            {n.number}
                          </span>
                          <span className="flex-1 text-left text-[14px] sm:text-[15px] leading-tight">
                            {n.label}
                          </span>
                          {isActive && !isAppendix && (
                            <span className="h-1.5 w-1.5 rounded-full bg-brand-300 shadow-[0_0_8px_2px_rgba(27,187,204,0.7)]" />
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>
        </div>
      </aside>
    </>
  );
}
