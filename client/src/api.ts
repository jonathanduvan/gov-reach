// src/api.ts
const API_BASE_URL = "http://localhost:4000";

export async function fetchUser() {
    const res = await fetch(`${API_BASE_URL}/user`, { credentials: "include" });
    if (!res.ok) throw new Error("Not authenticated");
    return res.json();
}

export async function fetchContactGroups() {
    const res = await fetch(`${API_BASE_URL}/api/contact-groups`, { credentials: "include" });
    return res.json();
}

export async function sendEmail(provider: "gmail" | "outlook", payload: {
    to: string;
    subject: string;
    text: string;
}) {
    const res = await fetch(`${API_BASE_URL}/send-email/${provider}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload)
    });
    return res.json();
}

export async function reverseGeocode(lat: number, lng: number, signal?: AbortSignal) {
  const url = `${API_BASE_URL}/api/geo/reverse?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}`;
  const res = await fetch(url, { headers: { Accept: "application/json" }, credentials: "include", signal });
  if (!res.ok) throw new Error(`reverse geocode failed ${res.status}`);
  return res.json() as Promise<{ city: string; county: string; state: string; stateAbbr: string; raw: any }>;
}