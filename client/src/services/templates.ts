import { API_BASE_URL } from "../config";

export type MessageTemplate = {
  _id?: string;
  name: string;
  description?: string;
  category?: string;
  channel: "email" | "call";
  subject?: string;
  body: string;
  tone?: "respectful" | "direct" | "urgent" | "neutral";
  length?: "short" | "medium" | "long";
  callToAction?: string;
  defaultDeadline?: string;
  orgName?: string;
};

export async function listTemplates(params: { q?: string; category?: string } = {}) {
  const qs = new URLSearchParams(params as any).toString();
  const res = await fetch(`${API_BASE_URL}/api/templates${qs ? `?${qs}` : ""}`, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to load templates");
  return res.json() as Promise<MessageTemplate[]>;
}
export async function createTemplate(payload: MessageTemplate) {
  const res = await fetch(`${API_BASE_URL}/api/templates`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to create template");
  return res.json() as Promise<MessageTemplate>;
}
export async function updateTemplate(id: string, payload: Partial<MessageTemplate>) {
  const res = await fetch(`${API_BASE_URL}/api/templates/${id}`, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to update template");
  return res.json() as Promise<MessageTemplate>;
}
