// src/lib/matchOfficial.ts
// Heuristics to classify whether two officials are the same person.

export type OfficialLike = {
  fullName?: string;
  role?: string;
  email?: string;
  state?: string;
  level?: "municipal"|"county"|"regional"|"state"|"federal"|"tribal"|string;
  jurisdiction?: { city?: string; county?: string } | null;
  phoneNumbers?: Array<{ number?: string | null }> | null;
};

export type MatchClass = "LIKELY_SAME" | "POSSIBLE" | "OTHER_GEO" | "DIFFERENT";

export type MatchResult = {
  cls: MatchClass;
  score: number;         // 0..1, used for ordering within buckets
  reason: string;        // human-readable explanation
};

const norm = (s?: string) => (s || "").trim().toLowerCase();
const onlyLetters = (s: string) => s.normalize("NFKD").replace(/[^\p{L}\s'-]/gu, "");
const tokenSet = (s?: string) => new Set(onlyLetters(norm(s)).split(/\s+/).filter(Boolean));
const jaccard = (a: Set<string>, b: Set<string>) => {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
};

const lastName = (full?: string) => {
  const parts = onlyLetters(norm(full)).split(/\s+/).filter(Boolean);
  return parts[parts.length - 1] || "";
};

const emailLocal = (e?: string) => norm(e).split("@")[0] || "";
const emailDomain = (e?: string) => norm(e).split("@")[1] || "";

// Any overlap in phone digits is a strong signal
const digits = (s?: string) => (s || "").replace(/\D+/g, "");
const phonesOverlap = (a?: {number?: string|null}[]|null, b?: {number?: string|null}[]|null) => {
  if (!Array.isArray(a) || !Array.isArray(b)) return false;
  const A = new Set(a.map(x => digits(x?.number)).filter(x => x.length >= 7));
  const B = new Set(b.map(x => digits(x?.number)).filter(x => x.length >= 7));
  for (const v of A) if (B.has(v)) return true;
  return false;
};

const sameState = (a?: string, b?: string) => !!a && !!b && norm(a) === norm(b);

// For municipal/regional/county, insist on same locality (city or county)
function geoCompatible(a: OfficialLike, b: OfficialLike) {
  if (!sameState(a.state, b.state)) return { ok: false, reason: "different states" };
  const lv = (norm(a.level) || "");
  const localLv = lv.includes("municipal") || lv.includes("regional") || lv.includes("county");
  if (localLv) {
    const ca = norm(a?.jurisdiction?.city) || "";
    const cb = norm(b?.jurisdiction?.city) || "";
    const ka = norm(a?.jurisdiction?.county) || "";
    const kb = norm(b?.jurisdiction?.county) || "";
    if (ca && cb && ca !== cb) return { ok: false, reason: "different cities" };
    if (!ca && !cb && ka && kb && ka !== kb) return { ok: false, reason: "different counties" };
  }
  return { ok: true, reason: "" };
}

function roleSimilarity(a?: string, b?: string) {
  const A = tokenSet(a);
  const B = tokenSet(b);
  return jaccard(A, B);
}

export function classifyMatch(a: OfficialLike, b: OfficialLike): MatchResult {
  // Hard geo gate
  const geo = geoCompatible(a, b);
  if (!geo.ok) {
    return { cls: "OTHER_GEO", score: 0.1, reason: geo.reason };
  }
  if (!sameState(a.state, b.state)) {
    return { cls: "OTHER_GEO", score: 0.1, reason: "different states" };
  }

  // Strong identifiers
  if (norm(a.email) && norm(a.email) === norm(b.email)) {
    return { cls: "LIKELY_SAME", score: 1.0, reason: "same email" };
  }
  if (phonesOverlap(a.phoneNumbers || [], b.phoneNumbers || [])) {
    return { cls: "LIKELY_SAME", score: 0.95, reason: "shared phone" };
  }

  // Name & role
  const nameJ = jaccard(tokenSet(a.fullName), tokenSet(b.fullName));
  const lastSame = !!lastName(a.fullName) && lastName(a.fullName) === lastName(b.fullName);
  const roleJ = roleSimilarity(a.role, b.role);

  // Email domain tie-breaker (same domain for official addresses helps)
  const sameDomain = !!emailDomain(a.email) && emailDomain(a.email) === emailDomain(b.email);

  // Composite score (weights tuned for conservative matching)
  let score = 0;
  score += nameJ * 0.55;
  score += (lastSame ? 0.15 : 0);
  score += roleJ * 0.20;
  score += (sameDomain ? 0.05 : 0);
  // small bump for same city at local levels
  if (norm(a.jurisdiction?.city) && norm(a.jurisdiction?.city) === norm(b.jurisdiction?.city)) score += 0.05;

  // Clamp 0..1
  score = Math.max(0, Math.min(1, score));

  if (score >= 0.80) return { cls: "LIKELY_SAME", score, reason: `name/role match (${(score*100)|0}%)` };
  if (score >= 0.55) return { cls: "POSSIBLE", score, reason: `possible match (${(score*100)|0}%)` };
  return { cls: "DIFFERENT", score, reason: "weak similarity" };
}
