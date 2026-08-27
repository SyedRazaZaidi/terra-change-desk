"use client";

import { project } from "@/lib/format";
import type { Region } from "@/lib/api";

export function World({ regions, onPick }: { regions: Region[]; onPick?: (id: string) => void }) {
  const w = 720;
  const h = 320;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-auto w-full">
      <rect width={w} height={h} fill="#0d1218" />
      {Array.from({ length: 14 }).map((_, i) => (
        <line key={`v${i}`} x1={(i * w) / 14} y1={0} x2={(i * w) / 14} y2={h} stroke="#243042" strokeWidth="0.5" />
      ))}
      {Array.from({ length: 7 }).map((_, i) => (
        <line key={`h${i}`} x1={0} y1={(i * h) / 7} x2={w} y2={(i * h) / 7} stroke="#243042" strokeWidth="0.5" />
      ))}
      <ellipse cx={w / 2} cy={h / 2} rx={w * 0.4} ry={h * 0.4} fill="none" stroke="#7dcea0" strokeOpacity="0.2" />
      {regions.map((r) => {
        const { x, y } = project(r.lat, r.lng, w, h);
        const hot = r.status === "alert";
        return (
          <g
            key={r.id}
            className="cursor-pointer"
            onClick={() => onPick?.(r.id)}
          >
            <circle cx={x} cy={y} r={hot ? 8 : 5.5} fill={hot ? "#e07a5f" : "#7dcea0"} />
            <text x={x + 12} y={y + 4} fill="#e8eef4" fontSize="12">
              {r.country} · {r.change_pct.toFixed(1)}%
            </text>
          </g>
        );
      })}
    </svg>
  );
}
