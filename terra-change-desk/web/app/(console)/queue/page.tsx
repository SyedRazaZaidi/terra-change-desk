"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api, tileUrl, type Finding } from "@/lib/api";
import { Stage, type Mode } from "@/components/compare";
import { when } from "@/lib/format";

export default function QueuePage() {
  const [rows, setRows] = useState<Finding[]>([]);
  const [sel, setSel] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("swipe");
  const [noOpen, setNoOpen] = useState(false);

  function load() {
    Promise.all([api<Finding[]>("/findings?status=open"), api<Finding[]>("/findings?status=pending_review")])
      .then(([a, b]) => {
        const next = [...a, ...b];
        setRows(next);
        setSel((cur) => (next.some((r) => r.id === cur) ? cur : next[0]?.id || ""));
        setNoOpen(false);
      })
      .catch((e) => setError(e.message));
  }

  useEffect(() => {
    load();
  }, []);

  const finding = useMemo(() => rows.find((r) => r.id === sel) || rows[0], [rows, sel]);

  async function decide(id: string, decision: "confirmed" | "dismissed", note: string) {
    setBusy(id);
    try {
      await api(`/findings/${id}/review`, { method: "POST", body: JSON.stringify({ decision, note }) });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(null);
    }
  }

  if (!finding) {
    return (
      <div className="grid h-[calc(100vh-52px)] place-items-center px-6 text-center">
        <div className="terra-fade">
          <p className="font-serif text-4xl">You’re done</p>
          <p className="mt-2 text-sm text-mute">Nothing left to judge. Go look at another place.</p>
          <Link href="/" className="mt-6 inline-block bg-pine px-5 py-2 text-sm text-cream">
            Back to Look
          </Link>
          {error ? <p className="mt-3 text-clay">{error}</p> : null}
        </div>
      </div>
    );
  }

  return (
    <div className="grid h-[calc(100vh-52px)] grid-cols-1 lg:grid-cols-[240px_minmax(0,1fr)_360px]">
      <aside className="min-h-0 overflow-auto border-r border-sand bg-cream">
        <p className="px-4 py-3 text-xs text-mute">Waiting for you · {rows.length}</p>
        {rows.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => {
              setSel(r.id);
              setNoOpen(false);
            }}
            className={`block w-full border-b border-sand px-4 py-3 text-left transition ${
              r.id === finding.id ? "bg-ink text-cream" : "hover:bg-paper"
            }`}
          >
            <p className="font-serif text-lg leading-tight">{r.region_name}</p>
            <p className={`mt-1 text-[11px] ${r.id === finding.id ? "text-brass" : "text-mute"}`}>
              {r.change_pct.toFixed(1)}% · {when(r.created_at)}
            </p>
          </button>
        ))}
      </aside>

      <section className="min-h-0 bg-night">
        {finding.before_rel ? (
          <Stage
            before={tileUrl(finding.before_rel)}
            after={tileUrl(finding.after_rel)}
            beforeLabel={finding.before_date}
            afterLabel={finding.after_date}
            layer="dates"
            mode={mode}
            onMode={setMode}
            lat={finding.lat}
            lng={finding.lng}
            country={finding.country}
            hint="Would you put this on a map? If you’re unsure, tap No."
          />
        ) : null}
      </section>

      <aside className="min-h-0 overflow-auto bg-cream p-6">
        <p className="text-xs text-pine">Syed Raza, your call</p>
        <h1 className="mt-2 font-serif text-3xl leading-tight">{finding.title}</h1>
        <p className="mt-3 text-sm leading-relaxed text-mute">{finding.detail}</p>
        <p className="mt-4 text-sm">Is the ground itself different — or is it just weather / cloud / a bad guess?</p>
        {error ? <p className="mt-4 text-clay">{error}</p> : null}
        <div className="mt-6 grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={busy === finding.id}
            className="bg-pine py-4 text-sm text-cream"
            onClick={() => decide(finding.id, "confirmed", "Real land-cover change")}
          >
            Yes, it’s real
          </button>
          <button
            type="button"
            disabled={busy === finding.id}
            className="border border-sand py-4 text-sm hover:border-ink"
            onClick={() => setNoOpen(true)}
          >
            No, false alarm
          </button>
        </div>
        {noOpen ? (
          <div className="terra-fade mt-4 space-y-2">
            <p className="text-xs text-mute">Why not?</p>
            {["Just cloud or haze", "Dry season — plants went brown", "Computer noise"].map((note) => (
              <button
                key={note}
                type="button"
                disabled={busy === finding.id}
                className="block w-full border border-sand px-3 py-2 text-left text-sm hover:bg-paper"
                onClick={() => decide(finding.id, "dismissed", note)}
              >
                {note}
              </button>
            ))}
          </div>
        ) : null}
      </aside>
    </div>
  );
}
