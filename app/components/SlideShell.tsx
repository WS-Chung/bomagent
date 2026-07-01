import type { ReactNode } from "react";

type Props = {
  number?: string;
  eyebrow?: string;
  title: string;
  description?: string;
  children: ReactNode;
  variant?: "default" | "appendix";
};

export default function SlideShell({
  number,
  eyebrow,
  title,
  description,
  children,
  variant = "default",
}: Props) {
  const isAppendix = variant === "appendix";
  return (
    <article
      className={`relative slide-enter min-h-screen ${isAppendix ? "appendix-bg" : ""}`}
    >
      <div className="px-6 sm:px-10 lg:px-14 pt-10 sm:pt-14 pb-4">
        <div className="flex items-center gap-2.5 mb-3">
          {number && (
            <span
              className={`inline-flex items-center justify-center h-7 min-w-[28px] px-2 rounded-md text-[11px] font-mono font-semibold ${
                isAppendix
                  ? "bg-slate-800 text-slate-300 ring-1 ring-slate-700"
                  : "bg-brand-500/15 text-brand-200 ring-1 ring-brand-400/30"
              }`}
            >
              {number}
            </span>
          )}
          {eyebrow && (
            <span
              className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${
                isAppendix ? "text-slate-400" : "text-brand-300"
              }`}
            >
              {eyebrow}
            </span>
          )}
        </div>
        <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-slate-50 leading-tight">
          {title}
        </h2>
        {description && (
          <p className="mt-3 text-sm sm:text-[15px] text-slate-400 leading-relaxed">
            {description}
          </p>
        )}
      </div>
      <div className="px-6 sm:px-10 lg:px-14 pb-16 space-y-5">{children}</div>
    </article>
  );
}
