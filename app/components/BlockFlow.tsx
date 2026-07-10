import { Fragment } from "react";
import type { ReactNode } from "react";

export type BlockFlowItem = {
  num?: string;
  title: string;
  sub?: string;
  icon?: ReactNode;
};

export default function BlockFlow({
  items,
  compact = false,
}: {
  items: BlockFlowItem[];
  compact?: boolean;
}) {
  return (
    <div className="w-full">
      <div className="flex flex-col sm:flex-row items-stretch gap-1.5 sm:gap-0">
        {items.map((it, i) => (
          <Fragment key={i}>
            <div
              className={`block-flow-card sm:flex-[4] sm:min-w-0 ${
                compact ? "py-2" : ""
              }`}
            >
              {it.num && <span className="num">STEP {it.num}</span>}
              <div className="flex items-center gap-1.5 min-w-0">
                {it.icon && (
                  <span
                    className="text-base text-brand-300 shrink-0"
                    aria-hidden
                  >
                    {it.icon}
                  </span>
                )}
                <span className="title">{it.title}</span>
              </div>
              {it.sub && <p className="sub">{it.sub}</p>}
            </div>
            {i < items.length - 1 && <Connector />}
          </Fragment>
        ))}
      </div>
    </div>
  );
}

function Connector() {
  return (
    <>
      <svg
        width="18"
        height="20"
        viewBox="0 0 18 20"
        className="sm:hidden mx-auto text-slate-500"
        aria-hidden
      >
        <line
          x1="9"
          y1="0"
          x2="9"
          y2="12"
          stroke="currentColor"
          strokeWidth="2"
          className="flow-line-anim"
        />
        <polygon points="9,19 3,11 15,11" fill="currentColor" />
      </svg>
      <div
        className="hidden sm:flex sm:flex-[1] sm:min-w-[24px] items-center self-center text-slate-500"
        aria-hidden
      >
        <svg
          viewBox="0 0 100 14"
          preserveAspectRatio="none"
          className="flex-1 h-3.5 min-w-0"
        >
          <line
            x1="0"
            y1="7"
            x2="100"
            y2="7"
            stroke="currentColor"
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
            className="flow-line-anim-h"
          />
        </svg>
        <svg
          width="11"
          height="14"
          viewBox="0 0 11 14"
          className="shrink-0"
          aria-hidden
        >
          <polygon points="11,7 0,1 0,13" fill="currentColor" />
        </svg>
      </div>
    </>
  );
}
