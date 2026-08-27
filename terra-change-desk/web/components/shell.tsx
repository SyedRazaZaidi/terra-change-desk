"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api, clearSession, getToken, getUser, setSession, type Overview, type User } from "@/lib/api";

const NAV = [
  { href: "/", label: "Look", hint: "1" },
  { href: "/queue", label: "Decide", hint: "2" },
  { href: "/log", label: "History", hint: "3" },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(0);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }
    setUser(getUser());
    setReady(true);
    api<User>("/auth/me")
      .then((u) => {
        setSession(token, u);
        setUser(u);
      })
      .catch(() => undefined);
    api<Overview>("/overview")
      .then((o) => setOpen(o.open_findings))
      .catch(() => undefined);
  }, [router, pathname]);

  if (!ready) {
    return <div className="grid h-full place-items-center font-serif text-mute">Opening Terra…</div>;
  }

  return (
    <div className="flex min-h-full flex-col bg-paper">
      <header className="flex items-center justify-between border-b border-sand bg-cream/90 px-5 py-2.5 backdrop-blur">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-3">
            <span className="grid h-8 w-8 place-items-center border border-brass text-brass">⊕</span>
            <span className="font-serif text-2xl tracking-tight">Terra</span>
          </Link>
          <nav className="flex gap-1 text-sm">
            {NAV.map((item) => {
              const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-3 py-1.5 ${active ? "bg-ink text-cream" : "text-mute hover:text-ink"}`}
                >
                  <span className={`grid h-5 w-5 place-items-center text-[10px] ${active ? "bg-brass text-night" : "border border-sand"}`}>
                    {item.hint}
                  </span>
                  {item.label}
                  {item.href === "/queue" && open > 0 ? (
                    <span className="rounded-full bg-clay px-1.5 text-[10px] text-cream">{open}</span>
                  ) : null}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-4 text-sm text-mute">
          <span className="hidden sm:inline">
            Analyst <span className="text-ink">{user?.name || "Syed Raza"}</span>
          </span>
          <button
            className="hover:text-ink"
            onClick={() => {
              clearSession();
              router.replace("/login");
            }}
          >
            Sign out
          </button>
        </div>
      </header>
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  );
}
