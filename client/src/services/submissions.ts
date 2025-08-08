// src/services/submissions.ts
import { API_BASE_URL } from "../config";

export async function createSubmission(payload: any) {
  const res = await fetch(`${API_BASE_URL}/api/officials/submissions`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to submit");
  return res.json();
}

export async function voteSubmission(id: string, type: "up" | "down", userId: string) {
  const res = await fetch(`${API_BASE_URL}/api/officials/submissions/${id}/vote`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type, userId }),
  });
  if (!res.ok) throw new Error("Vote failed");
  return res.json();
}

export async function listPendingSubmissions() {
  const res = await fetch(`${API_BASE_URL}/api/officials/submissions?status=pending`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to list");
  return res.json();
}

export async function resolveSubmission(submissionId: string, action: "approve" | "reject", body: any = {}) {
  const res = await fetch(`${API_BASE_URL}/api/officials/submissions/${submissionId}/resolve`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...body }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}


export async function fetchThreads(params: {
  status?: string;
  q?: string;
  skip?: number;
  limit?: number;
}) {
  const usp = new URLSearchParams();
  if (params.status) usp.set("status", params.status);
  if (params.q) usp.set("q", params.q);
  if (params.skip != null) usp.set("skip", String(params.skip));
  if (params.limit != null) usp.set("limit", String(params.limit));

  const res = await fetch(`${API_BASE_URL}/api/officials/submissions/threads?${usp}`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function fetchThreadDetail(groupKey: string) {
  const res = await fetch(`${API_BASE_URL}/api/officials/submissions/threads/${encodeURIComponent(groupKey)}`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}