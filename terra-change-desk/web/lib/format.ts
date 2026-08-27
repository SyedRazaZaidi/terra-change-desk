export function when(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso.endsWith("Z") ? iso : `${iso}Z`);
  return d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function kindLabel(k: string) {
  return k.replaceAll("_", " ");
}

export function fmtLat(lat: number) {
  return `${Math.abs(lat).toFixed(2)}°${lat >= 0 ? "N" : "S"}`;
}

export function fmtLng(lng: number) {
  return `${Math.abs(lng).toFixed(2)}°${lng >= 0 ? "E" : "W"}`;
}

export function project(lat: number, lng: number, w = 640, h = 320) {
  const x = ((lng + 180) / 360) * w;
  const y = ((90 - lat) / 180) * h;
  return { x, y };
}
