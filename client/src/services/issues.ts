// src/services/issues.ts
import { API_BASE_URL } from "../config";

export async function listIssues(params: { q?: string; pending?: "true" | "false"; page?: number; limit?: number } = {}) {
  const sp = new URLSearchParams();
  if (params.q) sp.set("q", params.q);
  if (params.pending) sp.set("pending", params.pending);
  if (params.page) sp.set("page", String(params.page));
  if (params.limit) sp.set("limit", String(params.limit));
  const res = await fetch(`${API_BASE_URL}/api/issues?${sp.toString()}`, { credentials: "include" });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function updateIssue(id: string, patch: Partial<{ name: string; category: string; pending: boolean }>) {
  const res = await fetch(`${API_BASE_URL}/api/issues/${id}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function addAlias(id: string, alias: string) {
  const res = await fetch(`${API_BASE_URL}/api/issues/${id}/aliases`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ alias }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function removeAlias(id: string, alias: string) {
  const res = await fetch(`${API_BASE_URL}/api/issues/${id}/aliases/${encodeURIComponent(alias)}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function mergeIssues(sourceId: string, targetId: string, dryRun?: boolean) {
  const res = await fetch(`${API_BASE_URL}/api/issues/merge`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sourceId, targetId, dryRun }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function recountIssues() {
  const res = await fetch(`${API_BASE_URL}/api/issues/recount`, {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
