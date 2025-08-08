import { parsePhoneNumberFromString, CountryCode } from "libphonenumber-js";

/** Return E.164 like +19541234567 or null if invalid. */
export function toE164(num: string, defaultCountry:CountryCode = "US"): string | null {
  if (!num) return null;
  try {
    const p = parsePhoneNumberFromString(num, defaultCountry);
    if (p && p.isValid()) return p.number; // E.164
  } catch {}
  // last-chance: strip non-digits, allow leading +
  const cleaned = num.replace(/[^\d+]/g, "");
  return cleaned.length >= 7 ? cleaned : null;
}

export function normalizePhoneArray(items: Array<{ number?: string; label?: string; priority?: number; verified?: boolean; source?: string; notes?: string }>) {
  const out: any[] = [];
  for (const it of items || []) {
    const e164 = it.number ? toE164(it.number) : null;
    if (!e164) continue;
    out.push({
      number: e164,
      label: (it.label as any) || "office",
      priority: typeof it.priority === "number" ? it.priority : 100,
      verified: !!it.verified,
      source: it.source?.trim(),
      notes: it.notes?.trim(),
    });
  }
  return out;
}
