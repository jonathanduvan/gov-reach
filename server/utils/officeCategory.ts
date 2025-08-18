// server/utils/officeCategory.ts
export const OFFICE_CATEGORY = [
  "mayor",
  "city-council",
  "county-commission",
  "school-board",
  "sheriff",
  "state-house",
  "state-senate",
  "governor",
  "state-agency",
  "us-house",
  "us-senate",
  "federal-agency",
  "tribal-council",
  "chair",
] as const;

export type OfficeCategory = typeof OFFICE_CATEGORY[number];

const ALIASES: Record<string, OfficeCategory> = {
  // municipal
  "mayor": "mayor",
  "city council": "city-council",
  "council": "city-council",
  "councilmember": "city-council",
  "council member": "city-council",
  "councilor": "city-council",
  "commissioner (city)": "city-council",

  // county
  "county commission": "county-commission",
  "board of supervisors": "county-commission",
  "supervisor": "county-commission",
  "county supervisor": "county-commission",
  "county commissioner": "county-commission",

  // school
  "school board": "school-board",
  "school committee": "school-board",
  "school trustee": "school-board",

  // sheriff
  "sheriff": "sheriff",

  // state
  "state representative": "state-house",
  "state rep": "state-house",
  "state assembly": "state-house",
  "assembly member": "state-house",
  "assemblymember": "state-house",
  "state delegate": "state-house",
  "state senator": "state-senate",
  "state senate": "state-senate",
  "governor": "governor",
  "secretary of state": "state-agency",
  "attorney general": "state-agency",

  // federal
  "u.s. representative": "us-house",
  "us representative": "us-house",
  "representative": "us-house",
  "house": "us-house",
  "u.s. senator": "us-senate",
  "us senator": "us-senate",
  "senator": "us-senate",
  "department": "federal-agency",
  "administrator": "federal-agency",

  // tribal
  "tribal council": "tribal-council",
  "tribe council": "tribal-council",

  // generic chairs
  "chair": "chair",
  "chairperson": "chair",
};

function canon(s?: string): string {
  return (s || "")
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/\s+member\b/, "") // "council member" -> "council"
    .trim();
}

// Try direct mapping first; if unknown, infer from role text.
export function normalizeOfficeCategory(
  input?: string,
  roleHint?: string
): OfficeCategory | null {
  const a = ALIASES[canon(input)];
  if (a) return a;

  const r = canon(roleHint);
  // quick heuristics from role
  if (/mayor/.test(r)) return "mayor";
  if (/(council|alder|selectboard)/.test(r)) return "city-council";
  if (/(county|supervisor|commission)/.test(r)) return "county-commission";
  if (/(school|trustee)/.test(r)) return "school-board";
  if (/sheriff/.test(r)) return "sheriff";
  if (/(assembly|delegate|representative(?!,?\s*u\.?s\.?))/.test(r)) return "state-house";
  if (/state.*senat/.test(r)) return "state-senate";
  if (/governor/.test(r)) return "governor";
  if (/(attorney general|secretary of state)/.test(r)) return "state-agency";
  if (/(u\.?s\.?\s+)?rep|house of representatives/.test(r)) return "us-house";
  if (/(u\.?s\.?\s+)?senat/.test(r)) return "us-senate";
  if (/(department|administrator|agency)/.test(r)) return "federal-agency";
  if (/tribal/.test(r)) return "tribal-council";
  if (/chair/.test(r)) return "chair";
  return null;
}
