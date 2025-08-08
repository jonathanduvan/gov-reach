import { API_BASE_URL } from "../config";

export async function fetchOfficialById(id: string) {
  const r = await fetch(`${API_BASE_URL}/api/officials/${id}`, { credentials: "include" });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function fetchOfficialByEmail(email: string) {
  const r = await fetch(`${API_BASE_URL}/api/officials?email=${encodeURIComponent(email)}`, { credentials: "include" });
  if (!r.ok) throw new Error(await r.text());
  const arr = await r.json();
  return Array.isArray(arr) && arr.length ? arr[0] : null;
}

export async function searchOfficials(params: {
  city?: string;
  county?: string;
  state?: string;
  levels?: string[];     // ["municipal","county","regional","state","federal"]
  issue?: string;        // id or name you’ll map later
  q?: string;
  limit?: number;
}) {
  const qs = new URLSearchParams();
  if (params.city) qs.set("city", params.city);
  if (params.county) qs.set("county", params.county);
  if (params.state) qs.set("state", params.state);
  if (params.levels?.length) qs.set("levels", params.levels.join(","));
  if (params.issue) qs.set("issue", params.issue);
  if (params.q) qs.set("q", params.q);
  if (params.limit) qs.set("limit", String(params.limit));
  const res = await fetch(`${API_BASE_URL}/api/officials/search?${qs.toString()}`, {
    credentials: "include",
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    console.error("Search error", res.status, txt);
    throw new Error(`Search failed: ${res.status}`);
  };
  return res.json() as Promise<{ results: any[] }>;
}