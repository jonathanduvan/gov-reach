// server/services/officialMatch.ts
import OfficialModel from "../models/Official.js";

function normalize(s: string) {
  return (s || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function jaccardTokens(a: string, b: string) {
  const A = new Set(normalize(a).split(" ").filter(Boolean));
  const B = new Set(normalize(b).split(" ").filter(Boolean));
  if (!A.size && !B.size) return 1;
  const inter = new Set([...A].filter((x) => B.has(x))).size;
  const union = new Set([...A, ...B]).size;
  return union ? inter / union : 0;
}

export type MatchResult =
  | { method: "email"; score: 1; officialId: string; candidates?: never; reason: string }
  | { method: "fuzzy"; score: number; officialId: string; candidates: Array<{ officialId: string; score: number }>; reason: string }
  | { method: "none"; score: 0; candidates?: Array<{ officialId: string; score: number }>; reason: string };

export async function matchOfficial(proposed: {
  email?: string;
  fullName?: string;
  role?: string;
  state?: string;
  level?: string;
  jurisdiction?: { city?: string; county?: string };
}) : Promise<MatchResult> {
  // 1) Strong signal: email
  const email = proposed.email?.toLowerCase();
  if (email) {
    const found = await OfficialModel.findOne({ email }).select("_id");
    if (found) {
      return { method: "email", score: 1, officialId: found._id.toString(), reason: "Exact email match" };
    }
  }

  // 2) Fuzzy: restrict candidate set by geography/level first
  const filter: any = {};
  if (proposed.state) filter.state = proposed.state.toUpperCase();
  if (proposed.level) filter.level = proposed.level;
  if (proposed.jurisdiction?.city) filter["jurisdiction.city"] = new RegExp(`^${proposed.jurisdiction.city}$`, "i");
  if (proposed.jurisdiction?.county) filter["jurisdiction.county"] = new RegExp(`^${proposed.jurisdiction.county}$`, "i");

  const candidates = await OfficialModel.find(filter).select("_id fullName role state jurisdiction").limit(200);

  // score by name + role similarity
  let scored = candidates.map((c) => {
    const nameScore = jaccardTokens(proposed.fullName || "", c.fullName || "");
    const roleScore = jaccardTokens(proposed.role || "", c.role || "");
    // weight name higher than role
    const score = 0.7 * nameScore + 0.3 * roleScore;
    return { officialId: c._id.toString(), score };
  });

  scored = scored.sort((a, b) => b.score - a.score).slice(0, 5);

  if (!scored.length || scored[0].score < 0.65) {
    return { method: "none", score: 0, candidates: scored, reason: "No sufficiently similar candidate" };
  }

  // thresholds
  const hard = 0.88;   // auto-edit
  const soft = 0.75;   // conflict for reviewer

  if (scored[0].score >= hard) {
    return {
      method: "fuzzy",
      score: scored[0].score,
      officialId: scored[0].officialId,
      candidates: scored,
      reason: `Fuzzy match >= ${hard}`,
    };
  }

  // soft match: do not auto-edit; flag conflict so reviewer decides
  return {
    method: "none",
    score: 0,
    candidates: scored,
    reason: `Potential match (soft) ${scored[0].score.toFixed(2)}`,
  };
}
