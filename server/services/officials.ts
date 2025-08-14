import { API_BASE_URL } from "../config";

let inFlight: AbortController | null = null;

type SearchParams = {
  city?: string;
  state?: string;
  levels?: string[];
  q?: string;
  issue?: string;
  limit?: number;
};

export async function searchOfficials(params: SearchParams) {
  if (inFlight) inFlight.abort();               // cancel previous
  inFlight = new AbortController();

  const qs = new URLSearchParams();
  if (params.city) qs.set("city", params.city);
  if (params.state) qs.set("state", params.state);
  if (params.q) qs.set("q", params.q);
  if (params.issue) qs.set("issue", params.issue);
  if (params.levels?.length) qs.set("levels", params.levels.join(","));
  qs.set("limit", String(params.limit ?? 100));

  const res = await fetch(
    `${API_BASE_URL}/api/officials/search?${qs.toString()}`,
    {
      credentials: "include",
      signal: inFlight.signal,
      headers: { Accept: "application/json" },
    }
  );
  if (!res.ok) throw new Error(`Search failed (${res.status})`);
  return res.json() as Promise<{ results: any[] }>;
}
