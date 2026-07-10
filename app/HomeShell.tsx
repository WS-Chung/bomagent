"use client";

import { useEffect, useRef, useState } from "react";
import Sidebar from "@/app/components/Sidebar";
import { slides, defaultSlideId, slideIds } from "@/app/slides";

export default function HomeShell() {
  const [activeId, setActiveId] = useState<string>(defaultSlideId);
  const mainRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const sync = () => {
      const h = window.location.hash.replace("#", "");
      if (h && slideIds.includes(h)) setActiveId(h);
    };
    sync();
    window.addEventListener("hashchange", sync);
    window.addEventListener("popstate", sync);
    return () => {
      window.removeEventListener("hashchange", sync);
      window.removeEventListener("popstate", sync);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.hash !== `#${activeId}`) {
      try {
        history.replaceState(null, "", `#${activeId}`);
      } catch {}
    }
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0 });
      mainRef.current?.scrollTo?.({ top: 0 });
    });
  }, [activeId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (
        t &&
        (t.tagName === "INPUT" ||
          t.tagName === "TEXTAREA" ||
          t.isContentEditable)
      )
        return;
      const idx = slideIds.indexOf(activeId);
      if (idx === -1) return;
      if (e.key === "ArrowRight" || e.key === "PageDown") {
        const next = slideIds[Math.min(idx + 1, slideIds.length - 1)];
        if (next !== activeId) setActiveId(next);
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        const prev = slideIds[Math.max(idx - 1, 0)];
        if (prev !== activeId) setActiveId(prev);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeId]);

  const Slide = slides[activeId] ?? slides[defaultSlideId];
  const idx = slideIds.indexOf(activeId);
  const total = slideIds.length;

  return (
    <div className="min-h-screen flex">
      <Sidebar activeId={activeId} onSelect={setActiveId} />
      <main ref={mainRef} className="flex-1 min-w-0 relative">
        <div key={activeId} className="max-w-[82rem] mx-auto">
          <Slide />
        </div>

        <div className="no-print fixed bottom-5 left-1/2 -translate-x-1/2 lg:left-auto lg:right-6 lg:translate-x-0 z-30 flex items-center gap-2 rounded-full bg-ink-800/80 backdrop-blur ring-1 ring-slate-700/60 px-3 py-1.5 text-[11px] text-slate-300">
          <button
            disabled={idx <= 0}
            onClick={() => setActiveId(slideIds[Math.max(idx - 1, 0)])}
            className="px-1.5 py-0.5 rounded hover:bg-slate-700/60 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            ←
          </button>
          <span className="font-mono tabular-nums">
            {String(idx + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
          </span>
          <button
            disabled={idx >= total - 1}
            onClick={() => setActiveId(slideIds[Math.min(idx + 1, total - 1)])}
            className="px-1.5 py-0.5 rounded hover:bg-slate-700/60 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            →
          </button>
        </div>
      </main>
    </div>
  );
}
