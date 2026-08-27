"use client";

import { useEffect, useState } from "react";

const STEPS = [
  {
    k: "1",
    t: "Look",
    d: "Two photos of the same place. Left is older. Right is newer. Drag the gold circle — the picture will teach you.",
  },
  {
    k: "2",
    t: "Show change",
    d: "Tap “Show change”. Orange is the computer’s guess. You do not need to understand the math.",
  },
  {
    k: "3",
    t: "You decide",
    d: "Save it, then say Yes (real change) or No (cloud, dry season, junk). That is the whole job.",
  },
];

export function Coach() {
  const [open, setOpen] = useState<boolean | null>(null);
  const [i, setI] = useState(0);

  useEffect(() => {
    setOpen(!localStorage.getItem("terra_tour_v3"));
  }, []);

  if (open === null) return null;

  function close() {
    localStorage.setItem("terra_tour_v3", "1");
    setOpen(false);
  }

  if (!open) {
    return (
      <button
        type="button"
        className="terra-bob fixed bottom-5 right-5 z-40 rounded-full bg-pine px-4 py-2 text-sm text-cream shadow-lg"
        onClick={() => {
          setI(0);
          setOpen(true);
        }}
      >
        How does this work?
      </button>
    );
  }

  const step = STEPS[i];

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-night/75 p-6 backdrop-blur-sm">
      <div className="terra-fade w-full max-w-lg overflow-hidden border border-brass/40 bg-cream shadow-2xl">
        <div className="h-2 w-full bg-sand">
          <div className="h-full bg-pine transition-all duration-500" style={{ width: `${((i + 1) / STEPS.length) * 100}%` }} />
        </div>
        <div className="p-8">
          <p className="text-sm text-pine">A 20-second tour · step {step.k} of 3</p>
          <div className="mt-4 flex gap-2">
            {STEPS.map((s, idx) => (
              <div
                key={s.k}
                className={`flex-1 rounded-md px-2 py-2 text-center text-xs ${idx === i ? "bg-ink text-cream" : "bg-paper text-mute"}`}
              >
                {s.k}. {s.t}
              </div>
            ))}
          </div>
          <h2 className="mt-6 font-serif text-4xl">{step.t}</h2>
          <p className="mt-3 text-base leading-relaxed text-mute">{step.d}</p>
          <div className="mt-8 flex items-center justify-between">
            <button type="button" className="text-sm text-mute hover:text-ink" onClick={close}>
              Skip — I’ll click around
            </button>
            <button
              type="button"
              className="bg-pine px-6 py-2.5 text-sm text-cream"
              onClick={() => {
                if (i >= STEPS.length - 1) close();
                else setI((n) => n + 1);
              }}
            >
              {i >= STEPS.length - 1 ? "Let’s try it" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
