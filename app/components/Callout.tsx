import type { ReactNode } from "react";

type Variant = "info" | "warn" | "success" | "danger";
const styles: Record<Variant, string> = {
  info: "bg-brand-500/10 border-brand-400/30 text-brand-100",
  warn: "bg-amber-500/10 border-amber-400/30 text-amber-100",
  success: "bg-emerald-500/10 border-emerald-400/30 text-emerald-100",
  danger: "bg-rose-500/10 border-rose-400/30 text-rose-100",
};
const icons: Record<Variant, string> = {
  info: "ℹ",
  warn: "⚠",
  success: "✓",
  danger: "✕",
};

export default function Callout({
  variant = "info",
  title,
  children,
}: {
  variant?: Variant;
  title?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={`rounded-xl border backdrop-blur-md p-3.5 sm:p-4 ${styles[variant]}`}
    >
      {title && (
        <p className="font-semibold mb-1 flex items-center gap-2 text-[14px]">
          <span aria-hidden className="opacity-80">
            {icons[variant]}
          </span>
          <span>{title}</span>
        </p>
      )}
      <div className="text-[13.5px] leading-relaxed text-slate-200">
        {children}
      </div>
    </div>
  );
}
