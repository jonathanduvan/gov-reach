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

export async function resolveSubmission(id: string, payload: any) {
  const res = await fetch(`${API_BASE_URL}/api/officials/submissions/${id}/resolve`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Resolve failed");
  return res.json();
}
