"use client";

import { project } from "@/lib/format";
import type { Region } from "@/lib/api";

export function Locator({ regions, activeId, onPick }: { regions: Region[]; activeId?: string; onPick?: (id: string) => void }) {
  const w = 280;
  const h = 140;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-auto w-full">
      <rect width={w} height={h} fill="#12100c" />
      {Array.from({ length: 13 }).map((_, i) => (
        <line key={`v${i}`} x1={(i * w) / 12} y1={0} x2={(i * w) / 12} y2={h} stroke="#c4a574" strokeOpacity="0.12" />
      ))}
      {Array.from({ length: 7 }).map((_, i) => (
        <line key={`h${i}`} x1={0} y1={(i * h) / 6} x2={w} y2={(i * h) / 6} stroke="#c4a574" strokeOpacity="0.12" />
      ))}
      <ellipse cx={w / 2} cy={h / 2} rx={w * 0.38} ry={h * 0.36} fill="none" stroke="#c4a574" strokeOpacity="0.35" />
      <ellipse cx={w / 2} cy={h / 2} rx={w * 0.22} ry={h * 0.2} fill="none" stroke="#c4a574" strokeOpacity="0.2" />
      {regions.map((r) => {
        const { x, y } = project(r.lat, r.lng, w, h);
        const on = r.id === activeId;
        return (
          <g key={r.id} className="cursor-pointer" onClick={() => onPick?.(r.id)}>
            <circle cx={x} cy={y} r={on ? 6 : 3.5} fill={on ? "#c45c3e" : "#c4a574"} />
            {on ? <circle cx={x} cy={y} r={11} fill="none" stroke="#c45c3e" strokeOpacity="0.5" /> : null}
          </g>
        );
      })}
    </svg>
  );
}
