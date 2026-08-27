"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api, tileUrl, type DetectResult, type Region } from "@/lib/api";
import { Stage, type Layer, type Mode } from "@/components/compare";
import { Locator } from "@/components/locator";
import { Coach } from "@/components/coach";
import { fmtLat, fmtLng } from "@/lib/format";

const KIND_COPY: Record<string, string> = {
  deforest: "Look for brown roads and empty patches that used to be green forest.",
  flood: "Look for water that was not there before — fields turning into a lake.",
  urban: "Look for gray rectangles (buildings and lots) where plants used to be.",
  haze: "Bright white patches are usually cloud. The computer will still light them up. Say No.",
};

const KIND_MARK: Record<string, string> = {
  deforest: "Forest",
  flood: "Flood",
  urban: "Buildings",
  haze: "Cloud trick",
};

const LAYERS: { id: Layer; label: string }[] = [
  { id: "dates", label: "Photos" },
  { id: "paint", label: "Show change" },
  { id: "heat", label: "Heat" },
  { id: "mask", label: "Outline" },
];

export default function DeskPage() {
  const [regions, setRegions] = useState<Region[]>([]);
  const [id, setId] = useState("");
  const [threshold, setThreshold] = useState(28);
  const [analysis, setAnalysis] = useState<DetectResult | null>(null);
  const [layer, setLayer] = useState<Layer>("dates");
  const [mode, setMode] = useState<Mode>("swipe");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState("");
  const [error, setError] = useState("");
  const [more, setMore] = useState(false);

  const region = useMemo(() => regions.find((r) => r.id === id) || regions[0], [regions, id]);
  const step = saved ? 3 : layer !== "dates" ? 2 : 1;

  useEffect(() => {
    api<Region[]>("/regions")
      .then((rows) => {
        setRegions(rows);
        setId((cur) => cur || rows[0]?.id || "");
      })
      .catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    if (!region) return;
    setSaved("");
    const t = window.setTimeout(() => {
      api<DetectResult>(`/regions/${region.id}/analyze?threshold=${threshold}`)
        .then(setAnalysis)
        .catch(() => undefined);
    }, 220);
    return () => window.clearTimeout(t);
  }, [region?.id, threshold]);

  async function commit() {
    if (!region) return;
    setBusy(true);
    setError("");
    try {
      const res = await api<DetectResult>(`/regions/${region.id}/detect?threshold=${threshold}`, { method: "POST" });
      setAnalysis(res);
      setLayer("paint");
      setSaved("Saved. Next: say if this is real.");
      const rows = await api<Region[]>("/regions");
      setRegions(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  if (!region) {
    return <p className="p-10 text-mute">{error || "Loading…"}</p>;
  }

  const jpeg = (b64?: string) => (b64 ? `data:image/jpeg;base64,${b64}` : undefined);
  const maxHist = Math.max(...(analysis?.histogram || [1]), 1);
  const comp = analysis?.composition;

  return (
    <div className="grid h-[calc(100vh-52px)] grid-cols-1 lg:grid-cols-[200px_minmax(0,1fr)_360px]">
      <Coach />
      <aside className="hidden min-h-0 overflow-auto border-r border-sand bg-cream lg:block">
        <p className="px-3 py-3 text-xs text-mute">Pick a place</p>
        {regions.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => {
              setId(r.id);
              setLayer("dates");
              setSaved("");
            }}
            className={`block w-full border-b border-sand text-left transition ${
              r.id === region.id ? "bg-ink text-cream" : "hover:bg-paper"
            }`}
          >
            <div className="relative h-28 overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={tileUrl(r.after_rel)} alt="" className="h-full w-full object-cover transition duration-500 hover:scale-105" />
              <span className="absolute left-2 top-2 bg-night/75 px-1.5 py-0.5 text-[10px] text-brass">{KIND_MARK[r.kind] || r.kind}</span>
            </div>
            <div className="px-3 py-2">
              <p className="text-sm font-medium leading-tight">{r.name}</p>
              <p className={`mt-0.5 text-[11px] ${r.id === region.id ? "text-brass" : "text-mute"}`}>
                {r.country} · {r.change_pct.toFixed(1)}% changed
              </p>
            </div>
          </button>
        ))}
      </aside>

      <section className="flex min-h-0 flex-col bg-night">
        <div className="flex gap-2 overflow-x-auto border-b border-white/10 px-3 py-2 lg:hidden">
          {regions.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setId(r.id)}
              className={`shrink-0 px-3 py-1 text-[11px] ${r.id === region.id ? "bg-brass text-night" : "text-cream/70"}`}
            >
              {r.name}
            </button>
          ))}
        </div>
        <div className="min-h-0 flex-1">
          <Stage
            before={tileUrl(region.before_rel)}
            after={tileUrl(region.after_rel)}
            beforeLabel={region.before_date}
            afterLabel={region.after_date}
            overlay={jpeg(analysis?.overlay_jpeg_b64)}
            heat={jpeg(analysis?.heat_jpeg_b64)}
            mask={jpeg(analysis?.mask_jpeg_b64)}
            layer={layer}
            mode={mode}
            onMode={setMode}
            blobs={analysis?.blob_boxes}
            showBoxes={layer !== "dates"}
            lat={region.lat}
            lng={region.lng}
            areaKm2={region.area_km2}
            country={region.country}
            hint={
              layer === "dates"
                ? "Gold line = older on the left, newer on the right. Drag it."
                : "Orange is a guess. You still decide if it is real."
            }
          />
        </div>
      </section>

      <aside className="flex min-h-0 flex-col overflow-auto border-l border-sand bg-cream">
        <div className="border-b border-sand p-4">
          <p className="text-xs text-pine">Hi, Syed Raza — three easy steps</p>
          <div className="mt-3 grid grid-cols-3 gap-1 text-center text-[11px]">
            {[
              { n: 1, t: "Look" },
              { n: 2, t: "Show change" },
              { n: 3, t: "Save" },
            ].map((s) => (
              <div
                key={s.n}
                className={`rounded-md px-1 py-2 ${step === s.n ? "bg-ink text-cream" : step > s.n ? "bg-pine/15 text-pine" : "bg-paper text-mute"}`}
              >
                <div className="font-serif text-lg">{s.n}</div>
                {s.t}
              </div>
            ))}
          </div>
        </div>

        <div className="border-b border-sand p-5 terra-fade">
          <p className="text-xs text-mute">You are looking at</p>
          <h1 className="mt-1 font-serif text-3xl leading-tight">{region.name}</h1>
          <p className="mt-1 text-xs text-mute">
            {region.country} · {fmtLat(region.lat)} {fmtLng(region.lng)}
          </p>
          <p className="mt-3 text-sm leading-relaxed">{KIND_COPY[region.kind]}</p>
          <div className="mt-4 overflow-hidden border border-brass/30">
            <Locator regions={regions} activeId={region.id} onPick={setId} />
          </div>
        </div>

        <div className="p-5">
          <div className="flex flex-wrap gap-1">
            {LAYERS.map((l) => (
              <button
                key={l.id}
                type="button"
                onClick={() => setLayer(l.id)}
                className={`px-3 py-1.5 text-xs ${layer === l.id ? "bg-ink text-cream" : "bg-paper text-mute hover:text-ink"}`}
              >
                {l.label}
              </button>
            ))}
          </div>

          {analysis ? (
            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="bg-paper p-3">
                <p className="text-[11px] text-mute">How much moved</p>
                <p className="font-serif text-3xl text-clay">{analysis.change_pct.toFixed(1)}%</p>
              </div>
              <div className="bg-paper p-3">
                <p className="text-[11px] text-mute">Patches found</p>
                <p className="font-serif text-3xl">{analysis.blobs}</p>
              </div>
            </div>
          ) : null}

          <button
            type="button"
            onClick={() => setLayer("paint")}
            className="mt-5 w-full border border-ink py-2.5 text-sm hover:bg-ink hover:text-cream"
          >
            {layer === "dates" ? "Step 2 — Show me the change" : "Showing change"}
          </button>
          <button
            type="button"
            onClick={commit}
            disabled={busy}
            className="mt-2 w-full bg-pine py-2.5 text-sm text-cream disabled:opacity-50"
          >
            {busy ? "Saving…" : "Step 3 — Save this"}
          </button>
          {saved ? (
            <Link
              href="/queue"
              className="mt-3 block w-full bg-clay py-2.5 text-center text-sm text-cream"
            >
              Step 4 — Decide if it’s real →
            </Link>
          ) : null}
          {error ? <p className="mt-2 text-sm text-clay">{error}</p> : null}

          <button type="button" className="mt-5 text-xs text-mute underline" onClick={() => setMore((v) => !v)}>
            {more ? "Hide extra numbers" : "Show extra numbers"}
          </button>
          {more && analysis ? (
            <div className="mt-3 space-y-3 text-xs text-mute">
              <label className="block">
                Picky-ness {threshold}
                <input
                  type="range"
                  min={8}
                  max={70}
                  value={threshold}
                  onChange={(e) => setThreshold(Number(e.target.value))}
                  className="mt-1 w-full"
                />
                <span className="text-[11px]">Left = more orange. Right = only big changes.</span>
              </label>
              <p>
                Greenness {analysis.greenness_before.toFixed(2)} → {analysis.greenness_after.toFixed(2)}
              </p>
              {comp ? (
                <div className="space-y-1">
                  {(
                    [
                      ["veg_loss", "Plants gone", "bg-clay"],
                      ["water", "Water", "bg-[#3d7ea6]"],
                      ["built", "Buildings", "bg-ink/50"],
                      ["other", "Other", "bg-brass"],
                    ] as const
                  ).map(([k, label, cls]) => {
                    const maxC = Math.max(comp.veg_loss, comp.water, comp.built, comp.other, 0.01);
                    return (
                      <div key={k} className="flex items-center gap-2">
                        <span className="w-24">{label}</span>
                        <div className="h-1.5 flex-1 bg-sand">
                          <div className={`h-full ${cls}`} style={{ width: `${(comp[k] / maxC) * 100}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : null}
              <div className="flex h-8 items-end gap-px">
                {analysis.histogram.map((v, i) => (
                  <div key={i} className="flex-1 bg-pine/70" style={{ height: `${Math.max(6, (v / maxHist) * 100)}%` }} />
                ))}
              </div>
              <p className="leading-relaxed text-ink">{analysis.briefing}</p>
            </div>
          ) : null}
        </div>
      </aside>
    </div>
  );
}
