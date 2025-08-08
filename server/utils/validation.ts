const EMAIL_REGEX =
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

export const LEVELS = new Set(["federal", "state", "municipal", "regional", "tribal"]);

export type ProposedOfficial = {
  fullName?: string;
  role?: string;
  email?: string;
  state?: string;
  category?: string;
  level?: string;
  phoneNumbers?: Array<{
    number?: string;
    label?: string;
    priority?: number;
    verified?: boolean;
    source?: string;
    notes?: string;
  }>;
  jurisdiction?: { city?: string; county?: string };
  issues?: string[] | string;
  sourceNote?: string;
  [k: string]: any;
};

export function validateAndCleanProposed(input: ProposedOfficial) {
  const errors: string[] = [];
  const proposed: ProposedOfficial = { ...input };

  // Trim strings
  for (const k of Object.keys(proposed)) {
    const v = (proposed as any)[k];
    if (typeof v === "string") (proposed as any)[k] = v.trim();
  }

  // Required fields
  if (!proposed.fullName) errors.push("fullName is required");
  if (!proposed.role) errors.push("role is required");
  if (!proposed.state) errors.push("state is required");
  if (!proposed.category) errors.push("category is required");
  if (!proposed.level) errors.push("level is required");

  // State
  if (proposed.state) proposed.state = proposed.state.toUpperCase();
  if (proposed.state && proposed.state.length !== 2)
    errors.push("state must be a 2-letter code");

  // Level
  if (proposed.level && !LEVELS.has(proposed.level))
    errors.push(`level must be one of: ${Array.from(LEVELS).join(", ")}`);

  // Email (optional but if present must be valid)
  if (proposed.email && !EMAIL_REGEX.test(proposed.email))
    errors.push("email is not a valid email address");

  // Jurisdiction defaults
  proposed.jurisdiction = proposed.jurisdiction || {};
  if (typeof proposed.jurisdiction.city === "string")
    proposed.jurisdiction.city = proposed.jurisdiction.city.trim();
  if (typeof proposed.jurisdiction.county === "string")
    proposed.jurisdiction.county = proposed.jurisdiction.county.trim();

  // Issues can be string or string[]
  if (typeof proposed.issues === "string") {
    proposed.issues = (proposed.issues as string)
      .split(",")
      .map(s => s.trim())
      .filter(Boolean);
  }
  if (Array.isArray(proposed.issues)) {
    proposed.issues = proposed.issues.map(s => (s || "").toString().trim()).filter(Boolean);
  }

  // Ensure phoneNumbers is a clean array of objects with string numbers
  if (proposed.phoneNumbers && !Array.isArray(proposed.phoneNumbers)) {
    errors.push("phoneNumbers must be an array");
  } else if (Array.isArray(proposed.phoneNumbers)) {
    proposed.phoneNumbers = proposed.phoneNumbers
      .map((p) => ({
        number: (p?.number || "").toString().trim(),
        label: (p?.label || "").toString().trim() || "office",
        priority: typeof p?.priority === "number" ? p?.priority : undefined,
        verified: !!p?.verified,
        source: (p?.source || "").toString().trim() || undefined,
        notes: (p?.notes || "").toString().trim() || undefined,
      }))
      .filter((p) => p.number); // keep non-empty
  }

  return { errors, proposed };
}
