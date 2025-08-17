// Returns {subject?, body} and supports subjectTemplate.
// Keeps tone/length/channel knobs. Safe for both Send and Compose pages.

import type { Official } from "../../../shared/types/official";

export type VariationOptions = {
  subjectTemplate?: string;
  template: string;
  user: { name: string; email: string; city?: string; zip?: string };
  issue?: string;
  officials: Official[];
  tone?: "respectful" | "direct" | "urgent" | "neutral";
  length?: "short" | "medium" | "long";
  channel?: "email" | "call";
  callToAction?: string;
  deadline?: string;
  personalImpact?: string;
  orgName?: string;
};

// --- tiny utils ---
const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));
const lastName = (full = "") => (full.trim().split(/\s+/).pop() || "").replace(/[^\p{L}\-']/gu, "");
const titleFromRole = (role = "") => {
  const r = role.toLowerCase();
  if (r.includes("mayor")) return "Mayor";
  if (r.includes("council")) return "Councilmember";
  if (r.includes("commission")) return "Commissioner";
  if (r.includes("representative")) return "Representative";
  if (r.includes("senator")) return "Senator";
  if (r.includes("supervisor")) return "Supervisor";
  if (r.includes("governor")) return "Governor";
  return "Official";
};
const uniq = <T,>(xs: T[]) => [...new Set(xs)];
const joinNonEmpty = (xs: Array<string | undefined>) => xs.filter(Boolean).join(" ");

// basic synonym pools (deterministic “shuffle” by index)
const greetings = ["Dear", "Hello", "Good day", "Greetings"];
const transitions = [
  "I appreciate your attention to this matter",
  "Thank you for considering this request",
  "Thanks for your public service",
  "I’m grateful for your time"
];
const closings = ["Sincerely", "Respectfully", "With appreciation", "Best regards"];

function pick<T>(arr: T[], i: number) {
  return arr[(i + arr.length) % arr.length];
}

function applyTone(text: string, tone: VariationOptions["tone"]) {
  switch (tone) {
    case "respectful":  return text.replace(/\burgent\b/gi, "important").replace(/\bmust\b/gi, "should");
    case "direct":      return text.replace(/\bI believe\b/gi, "I ask").replace(/\bconsider\b/gi, "take");
    case "urgent":      return text.replace(/\bI (ask|urge)\b/gi, "I urge").replace(/\bshould\b/gi, "must");
    default:            return text;
  }
}

function trimToLength(body: string, length: VariationOptions["length"], channel: VariationOptions["channel"]) {
  const limit = channel === "call"
    ? (length === "short" ? 70 : length === "long" ? 160 : 110)
    : (length === "short" ? 110 : length === "long" ? 240 : 170);

  const parts = body.split(/(?<=[.!?])\s+/);
  let out: string[] = [];
  for (const p of parts) {
    const words = out.join(" ").split(/\s+/).length + p.split(/\s+/).length;
    if (words > limit) break;
    out.push(p);
  }
  return out.join(" ").trim();
}

function fillPlaceholders(tmpl: string, ctx: Record<string, string>) {
  return tmpl.replace(/\{\{\s*([A-Z_]+)\s*\}\}/g, (_, key) => ctx[key] ?? "");
}

export function generateMessageVariations(opts: VariationOptions): Array<{ subject?: string; body: string }> {
  const {
    subjectTemplate,
    template,
    user,
    issue,
    officials,
    tone = "respectful",
    length = "medium",
    channel = "email",
    callToAction,
    deadline,
    personalImpact,
    orgName,
  } = opts;

  const baseAsk = callToAction
    ? `${tone === "direct" ? "Please" : "I ask that you"} ${callToAction}${deadline ? ` by ${deadline}` : ""}.`
    : "";

  const personal = personalImpact ? personalImpact.trim() : "";

  return officials.map((o, i) => {
    const title = titleFromRole(o.role);
    const lname = lastName(o.fullName);
    const greeting = `${pick(greetings, i)} ${title} ${lname || o.fullName},`;

    const ctx = {
      ISSUE: issue || "",
      OFFICIAL_NAME: o.fullName || "",
      OFFICIAL_TITLE: title,
      OFFICIAL_CITY: o.jurisdiction?.city || "",
      STATE: o.state || "",
      SENDER_NAME: user.name || "",
      SENDER_CITY: user.city || "",
      CALL_TO_ACTION: callToAction || "",
      DEADLINE: deadline || "",
      ORG_NAME: orgName || "",
      PERSONAL_NOTE: personal || "",
    };

    // subject
    const subject = channel === "email" && subjectTemplate
      ? fillPlaceholders(subjectTemplate, ctx).trim()
      : undefined;

    // body
    let body = fillPlaceholders(template || "", ctx).trim();

    if (!body || body.length < 30) {
      const why = personal
        ? personal
        : issue
        ? `This is directly relevant to ${user.city ? `${user.city}` : "our community"} because of ongoing concerns about ${issue.toLowerCase()}.`
        : `This is important to our community.`;
      const ask = baseAsk || `I ask you to review this matter and respond with your position.`;
      body = [
        `I’m a constituent${user.city ? ` in ${user.city}` : ""}.`,
        why,
        ask
      ].join(" ");
    }

    // Add CTA if not present
    if (callToAction && !body.toLowerCase().includes(callToAction.toLowerCase())) {
      body += ` ${baseAsk}`;
    }

    body = applyTone(body, tone);
    body = trimToLength(body, length, channel);

    const transition = pick(transitions, i);
    const closing = pick(closings, i);

    if (channel === "call") {
      const bullets: string[] = [];
      if (issue) bullets.push(`I’m calling about ${issue.toLowerCase()}.`);
      if (personal) bullets.push(personal);
      if (!bullets.length) bullets.push(`I’m a local resident${user.city ? ` in ${user.city}` : ""}.`);

      const script = [
        `${greeting}`,
        `• ${bullets[0] || ""}`,
        bullets[1] ? `• ${bullets[1]}` : "",
        baseAsk || "• What is your current position on this?",
        `${transition}.`,
        `${closing}, ${user.name}${orgName ? `\n${orgName}` : ""}`
      ].filter(Boolean).join("\n");
      return { body: script.trim() };
    }

    // email
    const email = [
      greeting,
      "",
      body,
      "",
      `${transition}.`,
      "",
      `${closing},`,
      user.name + (orgName ? `\n${orgName}` : ""),
      user.city ? `${user.city}` : "",
    ].join("\n");

    return { subject, body: email.trim() };
  });
}
