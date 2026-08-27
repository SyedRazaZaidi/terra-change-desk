export type User = { id: string; email: string; name: string; role: string };

export type Region = {
  id: string;
  slug: string;
  name: string;
  biome: string;
  country: string;
  lat: number;
  lng: number;
  area_km2: number;
  status: string;
  summary: string;
  before_rel: string;
  after_rel: string;
  before_date: string;
  after_date: string;
  change_pct: number;
  loss_km2: number;
  kind: string;
  open_findings: number;
};

export type Finding = {
  id: string;
  region_id: string;
  region_name: string;
  kind: string;
  severity: string;
  status: string;
  title: string;
  detail: string;
  change_pct: number;
  confidence: number;
  reviewed_by: string;
  review_note: string;
  created_at: string;
  reviewed_at: string | null;
  before_rel: string;
  after_rel: string;
  before_date: string;
  after_date: string;
  country: string;
  lat: number;
  lng: number;
};

export type Overview = {
  regions_watched: number;
  open_findings: number;
  pending_review: number;
  confirmed_week: number;
  mean_change_pct: number;
  series: { date: string; findings: number; confirmed: number }[];
  hotspots: Region[];
  recent: Finding[];
};

export type BlobBox = {
  id: number;
  x: number;
  y: number;
  w: number;
  h: number;
  area_px: number;
  kind: string;
};

export type DetectResult = {
  change_pct: number;
  loss_km2: number;
  mask_jpeg_b64: string;
  overlay_jpeg_b64: string;
  heat_jpeg_b64: string;
  labeled_jpeg_b64: string;
  histogram: number[];
  blobs: number;
  blob_boxes: BlobBox[];
  largest_px: number;
  threshold: number;
  greenness_before: number;
  greenness_after: number;
  composition: { veg_loss: number; water: number; built: number; other: number };
  briefing: string;
  finding: Finding | null;
};

export type AuditEvent = {
  id: string;
  actor: string;
  action: string;
  entity_type: string;
  entity_id: string;
  detail: string;
  created_at: string;
};

export const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("terra_token");
}

export function getUser(): User | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("terra_user");
  return raw ? (JSON.parse(raw) as User) : null;
}

export function setSession(token: string, user: User) {
  localStorage.setItem("terra_token", token);
  localStorage.setItem("terra_user", JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem("terra_token");
  localStorage.removeItem("terra_user");
}

export function tileUrl(rel: string) {
  return `${API}/tiles/${rel}`;
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const res = await fetch(`${API}${path}`, { ...init, headers });
  if (res.status === 401) {
    clearSession();
    if (typeof window !== "undefined") window.location.href = "/login";
    throw new Error("Not signed in");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { detail?: string }).detail || res.statusText);
  return data as T;
}

export async function login(email: string, password: string) {
  const data = await api<{ token: string; user: User }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  setSession(data.token, data.user);
  return data.user;
}
