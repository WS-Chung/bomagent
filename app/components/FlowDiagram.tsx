import type { ReactNode } from "react";

export type FlowStep = { title: string; body?: ReactNode };

export default function FlowDiagram({
  steps,
  compact = false,
}: {
  steps: FlowStep[];
  compact?: boolean;
}) {
  return (
    <ol className="list-none p-0 m-0 space-y-0">
      {steps.map((s, i) => (
        <li key={i}>
          <div className={`flow-card ${compact ? "py-2.5 px-3.5" : ""}`}>
            <div className="flow-number">{i + 1}</div>
            <div className="flow-content">
              <p className="flow-title">{s.title}</p>
              {s.body && <div className="flow-body">{s.body}</div>}
            </div>
          </div>
          {i < steps.length - 1 && <Arrow />}
        </li>
      ))}
    </ol>
  );
}

function Arrow() {
  return (
    <div className="flow-arrow py-0.5" aria-hidden>
      <svg width="20" height="32" viewBox="0 0 20 32" className="block mx-auto">
        <line
          x1="10"
          y1="0"
          x2="10"
          y2="22"
          stroke="currentColor"
          strokeWidth="2"
          className="flow-line-anim"
        />
        <polygon points="10,31 4,21 16,21" fill="currentColor" />
      </svg>
    </div>
  );
}
