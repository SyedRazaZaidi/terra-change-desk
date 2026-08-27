"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import type { BlobBox } from "@/lib/api";
import { fmtLat, fmtLng } from "@/lib/format";

export type Mode = "swipe" | "split" | "blink";
export type Layer = "dates" | "paint" | "heat" | "mask";

const BOX_COLOR: Record<string, string> = {
  veg_loss: "#e07a4a",
  water: "#3d7ea6",
  built: "#c8c2b4",
  other: "#c4a574",
};

const MODE_LABEL: Record<Mode, string> = {
  swipe: "Drag",
  split: "Split",
  blink: "Blink",
};

export function Stage({
  before,
  after,
  beforeLabel,
  afterLabel,
  overlay,
  heat,
  mask,
  layer,
  mode,
  onMode,
  blobs = [],
  showBoxes = true,
  lat,
  lng,
  areaKm2,
  country,
  hint,
}: {
  before: string;
  after: string;
  beforeLabel: string;
  afterLabel: string;
  overlay?: string;
  heat?: string;
  mask?: string;
  layer: Layer;
  mode: Mode;
  onMode?: (m: Mode) => void;
  blobs?: BlobBox[];
  showBoxes?: boolean;
  lat?: number;
  lng?: number;
  areaKm2?: number;
  country?: string;
  hint?: string;
}) {
  const [pct, setPct] = useState(46);
  const [blink, setBlink] = useState(false);
  const [hover, setHover] = useState<{ lat: number; lng: number } | null>(null);
  const [natural, setNatural] = useState({ w: 960, h: 540 });
  const [touched, setTouched] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const drag = useRef(false);
  const dir = useRef(1);

  useEffect(() => {
    if (mode !== "blink") return;
    const id = window.setInterval(() => setBlink((v) => !v), 520);
    return () => window.clearInterval(id);
  }, [mode]);

  useEffect(() => {
    if (touched || mode !== "swipe") return;
    const id = window.setInterval(() => {
      setPct((p) => {
        let n = p + dir.current * 0.45;
        if (n >= 72) {
          dir.current = -1;
          n = 72;
        }
        if (n <= 28) {
          dir.current = 1;
          n = 28;
        }
        return n;
      });
    }, 28);
    return () => window.clearInterval(id);
  }, [touched, mode]);

  function pos(clientX: number) {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setPct(Math.min(96, Math.max(4, ((clientX - r.left) / r.width) * 100)));
  }

  function onMove(e: MouseEvent) {
    if (lat == null || lng == null || areaKm2 == null) return;
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const span = Math.max(0.18, Math.sqrt(areaKm2) / 111);
    const nx = (e.clientX - r.left) / r.width;
    const ny = (e.clientY - r.top) / r.height;
    setHover({
      lng: lng - span / 2 + nx * span,
      lat: lat + span / 2 - ny * span,
    });
  }

  const showAfter = mode === "blink" ? blink : true;
  const analysis =
    layer === "paint" && overlay ? overlay : layer === "heat" && heat ? heat : layer === "mask" && mask ? mask : null;
  const km = areaKm2 ? Math.sqrt(areaKm2) : 0;

  return (
    <div className="relative h-full min-h-[280px] w-full bg-night">
      {mode === "split" ? (
        <div ref={ref} className="grid h-full grid-cols-2" onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
          <Frame src={before} label={`Then · ${beforeLabel}`} side="left" onLoad={setNatural} />
          <Frame src={after} label={`Now · ${afterLabel}`} side="right" onLoad={setNatural} />
        </div>
      ) : mode === "blink" ? (
        <div ref={ref} className="relative h-full" onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
          <Frame
            src={showAfter ? after : before}
            label={showAfter ? `Now · ${afterLabel}` : `Then · ${beforeLabel}`}
            onLoad={setNatural}
            fill
          />
        </div>
      ) : (
        <div
          ref={ref}
          className="relative h-full cursor-ew-resize select-none"
          onPointerDown={(e) => {
            drag.current = true;
            setTouched(true);
            (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
            pos(e.clientX);
          }}
          onPointerMove={(e) => {
            if (drag.current) pos(e.clientX);
          }}
          onPointerUp={() => {
            drag.current = false;
          }}
          onMouseMove={onMove}
          onMouseLeave={() => setHover(null)}
        >
          <Frame src={after} label={`Now · ${afterLabel}`} side="right" onLoad={setNatural} fill />
          <div className="absolute inset-0 z-[1]" style={{ clipPath: `inset(0 ${100 - pct}% 0 0)` }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={before} alt="Then" className="h-full w-full object-cover" draggable={false} />
          </div>
          <div className="pointer-events-none absolute inset-y-0 z-20 w-0.5 bg-brass" style={{ left: `${pct}%` }}>
            <div
              className={`absolute top-1/2 left-1/2 grid h-12 w-12 place-items-center rounded-full border-2 border-brass bg-night/85 text-brass ${
                touched ? "" : "terra-pulse"
              }`}
            >
              ↔
            </div>
            {!touched ? (
              <span className="terra-bob absolute top-[calc(50%+36px)] left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-brass px-3 py-1 text-[11px] font-medium tracking-wide text-night">
                Drag me
              </span>
            ) : null}
          </div>
          <span className="pointer-events-none absolute left-3 top-14 z-20 bg-night/70 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.22em] text-brass">
            Then · {beforeLabel}
          </span>
        </div>
      )}

      {analysis ? (
        <div className={`pointer-events-none absolute inset-0 z-10 terra-fade ${layer === "mask" ? "opacity-55" : "opacity-70"}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={analysis} alt="" className="h-full w-full object-cover" />
        </div>
      ) : null}

      {showBoxes && blobs.length > 0 && layer !== "dates" ? (
        <svg className="pointer-events-none absolute inset-0 z-20 h-full w-full" viewBox={`0 0 ${natural.w} ${natural.h}`} preserveAspectRatio="xMidYMid slice">
          {blobs.map((b) => (
            <g key={b.id}>
              <rect x={b.x} y={b.y} width={b.w} height={b.h} fill="none" stroke={BOX_COLOR[b.kind] || "#c4a574"} strokeWidth="2" />
              <text x={b.x + 4} y={Math.max(14, b.y - 6)} fill={BOX_COLOR[b.kind] || "#c4a574"} fontSize="13" fontFamily="ui-monospace, monospace">
                {b.kind.replace("_", " ")}
              </text>
            </g>
          ))}
        </svg>
      ) : null}

      <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-start justify-between p-3">
        <div className="pointer-events-auto flex gap-1 rounded-full border border-white/10 bg-night/70 p-1 backdrop-blur">
          {(["swipe", "split", "blink"] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => onMode?.(m)}
              className={`rounded-full px-3 py-1 text-[11px] ${
                mode === m ? "bg-brass text-night" : "text-cream/75 hover:text-cream"
              }`}
            >
              {MODE_LABEL[m]}
            </button>
          ))}
        </div>
        <p className="max-w-[48%] text-right text-[12px] leading-relaxed text-cream/85">{hint}</p>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 flex items-end justify-between p-3">
        <div className="border border-brass/40 bg-night/75 px-3 py-2 text-[11px] text-brass backdrop-blur">
          <div>
            {country || "This place"} · {fmtLat(hover?.lat ?? lat ?? 0)} {fmtLng(hover?.lng ?? lng ?? 0)}
          </div>
          {km ? (
            <div className="mt-2 flex items-center gap-2 text-cream/70">
              <span className="inline-block h-px w-16 bg-brass" />
              about {km.toFixed(0)} km across
            </div>
          ) : null}
        </div>
        <div className="text-[11px] tracking-[0.2em] text-brass/80">N ↑</div>
      </div>
    </div>
  );
}

function Frame({
  src,
  label,
  side,
  fill,
  onLoad,
}: {
  src: string;
  label: string;
  side?: "left" | "right";
  fill?: boolean;
  onLoad?: (s: { w: number; h: number }) => void;
}) {
  return (
    <figure className={`relative overflow-hidden ${fill ? "h-full w-full" : "h-full"}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={label}
        className="h-full w-full object-cover"
        draggable={false}
        onLoad={(e) => onLoad?.({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
      />
      <figcaption
        className={`absolute top-14 z-20 bg-night/70 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-brass ${
          side === "right" ? "right-3" : "left-3"
        }`}
      >
        {label}
      </figcaption>
    </figure>
  );
}
