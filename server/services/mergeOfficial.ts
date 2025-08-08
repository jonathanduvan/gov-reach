// server/services/mergeOfficial.ts
import type { HydratedDocument } from "mongoose";
import OfficialModel from "../models/Official.js";

const ALLOWED_FIELDS = [
  "fullName", "role", "email", "state", "category", "level",
  "jurisdiction", "issues", "phoneNumbers", "partners", "verified",
] as const;
type Allowed = (typeof ALLOWED_FIELDS)[number];

export function buildMergedOfficial(
  current: any | null,
  proposed: Record<string, any>,
  fieldOverrides?: Partial<Record<Allowed, any>>
) {
  const base = current ? { ...current } : {};
  const incoming: Partial<Record<Allowed, any>> = {};
  for (const k of ALLOWED_FIELDS) {
    if (proposed[k] !== undefined) (incoming as any)[k] = proposed[k];
  }
  const overrides = fieldOverrides || {};
  const merged = { ...base, ...incoming, ...overrides };

  // safety: normalize some fields
  if (merged.email) merged.email = String(merged.email).toLowerCase().trim();
  if (merged.state) merged.state = String(merged.state).toUpperCase().trim();
  if (!Array.isArray(merged.partners)) merged.partners = merged.partners ? [merged.partners] : [];
  if (!Array.isArray(merged.phoneNumbers)) merged.phoneNumbers = merged.phoneNumbers ? [merged.phoneNumbers] : [];
  if (!Array.isArray(merged.issues)) merged.issues = merged.issues ? [merged.issues] : [];

  return merged;
}

/** Upsert or update and return the Official doc */
export async function saveOfficialFromMerge(
  type: "create" | "edit",
  targetOfficialId: string | null,
  merged: Record<string, any>
) {
  if (type === "edit" && targetOfficialId) {
    return OfficialModel.findByIdAndUpdate(targetOfficialId, merged, { new: true });
  }
  // create (or edit with missing target): upsert by email if present to be safe
  if (merged.email) {
    const existing = await OfficialModel.findOne({ email: merged.email });
    if (existing) {
      return OfficialModel.findByIdAndUpdate(existing._id, merged, { new: true });
    }
  }
  const doc = new OfficialModel(merged);
  await doc.save();
  return doc;
}
