"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { API, login } from "@/lib/api";
import { Stage, type Mode } from "@/components/compare";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("analyst@terra.dev");
  const [password, setPassword] = useState("terra-demo");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<Mode>("swipe");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await login(email, password);
      router.replace("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative min-h-full bg-night">
      <div className="absolute inset-0">
        <Stage
          before={`${API}/tiles/rio_tapajos_before.png`}
          after={`${API}/tiles/rio_tapajos_after.png`}
          beforeLabel="2024-06-12"
          afterLabel="2026-07-03"
          layer="dates"
          mode={mode}
          onMode={setMode}
          lat={-4.28}
          lng={-56.12}
          areaKm2={1840}
          country="Brazil"
          hint="Watch the gold circle move. Then drag it yourself."
        />
      </div>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-night/85 via-night/30 to-transparent" />
      <div className="pointer-events-none relative z-10 flex min-h-full flex-col justify-between p-8 lg:p-14">
        <div className="terra-fade max-w-xl text-cream">
          <p className="text-sm tracking-[0.28em] text-brass">TERRA · FOR BEGINNERS</p>
          <h1 className="mt-4 font-serif text-5xl leading-[1.05] sm:text-6xl">Two photos. Same place. What changed?</h1>
          <div className="mt-8 flex max-w-md flex-col gap-3 text-sm text-cream/85">
            <p>
              <span className="text-brass">1 Look</span> — drag the gold circle. Older photo, newer photo.
            </p>
            <p>
              <span className="text-brass">2 Show change</span> — orange paint is a computer guess.
            </p>
            <p>
              <span className="text-brass">3 Decide</span> — you tap Yes or No. That’s the whole product.
            </p>
          </div>
        </div>
        <form className="pointer-events-auto w-full max-w-sm border border-brass/40 bg-cream p-6 shadow-2xl terra-fade" onSubmit={onSubmit}>
          <p className="font-serif text-2xl">Welcome, Syed Raza</p>
          <p className="mt-1 text-sm text-mute">Demo desk. No signup. Just open it.</p>
          <label className="mt-6 block text-xs text-mute">
            Email
            <input
              className="mt-2 w-full border border-sand bg-paper px-3 py-2.5 text-sm outline-none focus:border-pine"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label className="mt-4 block text-xs text-mute">
            Password
            <input
              type="password"
              className="mt-2 w-full border border-sand bg-paper px-3 py-2.5 text-sm outline-none focus:border-pine"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          {error ? <p className="mt-3 text-sm text-clay">{error}</p> : null}
          <button type="submit" disabled={busy} className="mt-6 w-full bg-pine px-3 py-3 text-sm text-cream">
            {busy ? "Opening…" : "Start — it’s easy"}
          </button>
          <p className="mt-3 text-[11px] text-mute">analyst@terra.dev / terra-demo</p>
        </form>
      </div>
    </div>
  );
}
