const TONE: Record<string, string> = {
  alert: "text-rust bg-rust/10",
  watch: "text-gold bg-gold/10",
  open: "text-gold bg-gold/10",
  pending_review: "text-moss bg-moss/10",
  confirmed: "text-moss bg-moss/10",
  dismissed: "text-mist bg-white/5",
  high: "text-rust bg-rust/10",
  medium: "text-gold bg-gold/10",
  low: "text-mist bg-white/5",
  deforest: "text-rust bg-rust/10",
  flood: "text-sky-300 bg-sky-400/10",
  urban: "text-gold bg-gold/10",
};

export function Pill({ children, tone = "" }: { children: React.ReactNode; tone?: string }) {
  return (
    <span className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${TONE[tone] || "text-mist bg-white/5"}`}>
      {children}
    </span>
  );
}

export function Kicker({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] uppercase tracking-wide2 text-moss/80">{children}</p>;
}
