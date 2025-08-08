// server/services/submissionGrouping.ts
import type { ProposedOfficial } from "../utils/validation.js";

function normalize(s: string) {
  return (s || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function fingerprintFromProposed(p: ProposedOfficial) {
  const parts = [
    p.state || "",
    p.level || "",
    p.jurisdiction?.city || "",
    p.jurisdiction?.county || "",
    normalize(p.fullName || ""),
    normalize(p.role || ""),
  ];
  return parts.join("|");
}

/**
 * Compute a stable groupKey so multiple pending subs for the same person
 * are threaded together before approval.
 */
export function computeGroupKey(
  proposed: ProposedOfficial,
  type: "create" | "edit",
  targetOfficialId?: string | null
) {
  if (type === "edit" && targetOfficialId) return `official:${targetOfficialId}`;
  if (proposed.email) return `email:${String(proposed.email).toLowerCase()}`;
  return `fp:${fingerprintFromProposed(proposed)}`;
}

/** Shallow equality for duplicate detection */
export function shallowEqualProposed(a: any, b: any) {
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return false;
  }
}
