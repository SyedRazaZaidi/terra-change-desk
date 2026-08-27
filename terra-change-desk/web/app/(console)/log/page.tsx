"use client";

import { useEffect, useState } from "react";
import { api, type AuditEvent, type Finding } from "@/lib/api";
import { kindLabel, when } from "@/lib/format";

const STAMP: Record<string, string> = {
  open: "WAITING",
  pending_review: "WAITING",
  confirmed: "YES",
  dismissed: "NO",
};

export default function LogPage() {
  const [audit, setAudit] = useState<AuditEvent[]>([]);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([api<AuditEvent[]>("/audit"), api<Finding[]>("/findings")])
      .then(([a, f]) => {
        setAudit(a);
        setFindings(f);
      })
      .catch((e) => setError(e.message));
  }, []);

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <p className="text-xs tracking-[0.22em] text-pine">HISTORY</p>
      <h1 className="mt-2 font-serif text-5xl">What you decided</h1>
      <p className="mt-3 max-w-xl text-sm text-mute">
        A simple list of every save and every Yes / No. Nothing fancy — so a new person can read it.
      </p>
      {error ? <p className="mt-4 text-clay">{error}</p> : null}

      <section className="mt-10">
        <h2 className="font-serif text-2xl">Saves</h2>
        <ul className="mt-4 divide-y divide-sand border-y border-sand">
          {findings.map((f) => (
            <li key={f.id} className="grid grid-cols-[7rem_1fr_auto] items-baseline gap-4 py-4 text-sm">
              <span
                className={`font-mono text-[10px] tracking-[0.16em] ${
                  f.status === "confirmed" ? "text-pine" : f.status === "dismissed" ? "text-mute" : "text-clay"
                }`}
              >
                {STAMP[f.status] || f.status}
              </span>
              <div>
                <p className="font-serif text-lg">{f.title}</p>
                <p className="text-mute">
                  {f.region_name} · {kindLabel(f.kind)}
                  {f.review_note ? ` · ${f.review_note}` : ""}
                </p>
              </div>
              <span className="font-mono text-[11px] text-mute">{f.change_pct.toFixed(1)}%</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-12">
        <h2 className="font-serif text-2xl">Who did what</h2>
        <ul className="mt-4 space-y-0">
          {audit.map((r) => (
            <li key={r.id} className="grid grid-cols-[9rem_1fr] gap-4 border-t border-sand py-3 text-sm">
              <span className="font-mono text-[11px] text-mute">{when(r.created_at)}</span>
              <div>
                <span className="text-ink">{r.actor}</span>
                <span className="text-mute"> · {r.action}</span>
                {r.detail ? <div className="text-mute">{r.detail}</div> : null}
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
