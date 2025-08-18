// server/services/submissionIngest.ts
import fs from "fs";
import csv from "csv-parser";
import ExcelJS from "exceljs";
import OfficialSubmission from "../models/OfficialSubmission.js";
import { validateAndCleanProposed, ProposedOfficial } from "../utils/validation.js";
import { ensureIssuesByNames } from "./issueService.js";
import { matchOfficial } from "../middleware/officialMatch.js";
import { computeGroupKey, shallowEqualProposed } from "./submissionGrouping.js";
import { normalizePhoneArray } from "../utils/phone.js";

const HARD_MATCH = 0.88; // auto-edit threshold
const SOFT_MATCH = 0.75; // conflict threshold

type SessionUser = { email: string; role: string };

export type IngestSummary = {
  processedCreates: number;
  convertedToEdits: number;
  conflicts: number;
  errors: Array<{ rowIndex: number; errors: string[] }>;
};

/** ------------------ Parse helpers ------------------ **/

export async function parseUploadedFileToRows(filePath: string, originalName: string): Promise<any[]> {
  const ext = originalName.split(".").pop()!.toLowerCase();
  if (ext === "csv") return parseCsv(filePath);
  if (ext === "xlsx") return parseXlsx(filePath);
  throw new Error("Unsupported file type");
}

async function parseCsv(filePath: string): Promise<any[]> {
  const rows: any[] = [];
  await new Promise<void>((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(csv())
      .on("data", (row) => rows.push(row))
      .on("end", resolve)
      .on("error", reject);
  });
  return rows.map(normalizeRowKeys);
}

async function parseXlsx(filePath: string): Promise<any[]> {
  const rows: any[] = [];
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  const ws = workbook.worksheets[0];

  const headers: string[] = [];
  ws.getRow(1).eachCell((cell, colNumber) => {
    headers[colNumber] = (cell.value || "").toString();
  });

  ws.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const obj: Record<string, any> = {};
    row.eachCell((cell, colNumber) => {
      obj[headers[colNumber]] = cell.value?.toString() ?? "";
    });
    rows.push(obj);
  });

  return rows.map(normalizeRowKeys);
}

/** ------------------ Row normalization ------------------ **/

function setDeep(obj: any, path: string, value: any) {
  const parts = path.split(".");
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i];
    if (!(key in cur) || typeof cur[key] !== "object") cur[key] = {};
    cur = cur[key];
  }
  cur[parts[parts.length - 1]] = value;
}

function safeJsonParse(input: any): any {
  if (input == null) return null;
  const s = String(input).trim();
  if (!s) return null;
  try {
    return JSON.parse(s);
  } catch {
    // small fixups for common CSV quirks
    try {
      const repaired = s
        .replace(/(\w+)\s*:/g, '"$1":') // unquoted keys → quoted
        .replace(/'/g, '"');            // single quotes → double
      return JSON.parse(repaired);
    } catch {
      return { __parse_error__: true, raw: s };
    }
  }
}

// Accepts loose headers; supports dotted headers and *_json payloads.
function normalizeRowKeys(row: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {};
  for (const [origK, v0] of Object.entries(row)) {
    const k = (origK || "").toString().trim();
    if (!k) continue;

    const lower = k.toLowerCase().replace(/\s+/g, "");
    const value = typeof v0 === "string" ? v0.trim() : v0;

    // JSON fields
    if (lower === "phonenumbers_json" || lower === "phonenumber_json") {
      const parsed = safeJsonParse(value);
      out.__phonesJson = parsed;
      continue;
    }
    if (lower === "committees_json" || lower === "committee_json") {
      const parsed = safeJsonParse(value);
      out.__committeesJson = parsed;
      continue;
    }
    if (lower === "committeetags" || lower === "committee_tags") {
      out.committeeTags = value;
      continue;
    }

    // Simple canonical keys
    switch (lower) {
      case "fullname":
      case "name":
        out.fullName = value;
        continue;
      case "role":
      case "title":
        out.role = value;
        continue;
      case "email":
        out.email = value;
        continue;
      case "state":
        out.state = value;
        continue;
      case "category":
        out.category = value;
        continue;
      case "level":
        out.level = value;
        continue;
      case "city":
        out.city = value;
        continue;
      case "county":
        out.county = value;
        continue;
      case "issues":
        out.issues = value;
        continue;
      case "sourcenote":
      case "note":
      case "source":
        out.sourceNote = value;
        continue;
      case "phone":
      case "phonenumber":
        out.phone = value;
        continue;
      case "phone1":
      case "phonenumber1":
        out.phone1 = value;
        continue;
      case "phone2":
      case "phonenumber2":
        out.phone2 = value;
        continue;
      case "phonelabel1":
        out.phoneLabel1 = value;
        continue;
      case "phonelabel2":
        out.phoneLabel2 = value;
        continue;
    }

    // Dotted path support (e.g., jurisdiction.congressionalDistrict)
    if (k.includes(".")) {
      setDeep(out, k, value);
    } else {
      // Preserve unknowns just in case
      out[k] = value;
    }
  }
  return out;
}

function toArrayOfStrings(x: any): string[] {
  if (!x) return [];
  if (Array.isArray(x)) return x.map(String).map((s) => s.trim()).filter(Boolean);
  const s = String(x);
  if (!s.trim()) return [];
  // Split on common delimiters
  return s.split(/[;,|]/g).map((t) => t.trim()).filter(Boolean);
}

function toProposed(row: any, rowIndex: number, errors: string[]): ProposedOfficial {
  // Merge legacy phone columns + JSON phones
  let phones: Array<any> = [];
  if (row.phone)  phones.push({ number: row.phone, label: "office" });
  if (row.phone1) phones.push({ number: row.phone1, label: row.phoneLabel1 || "office" });
  if (row.phone2) phones.push({ number: row.phone2, label: row.phoneLabel2 || "other" });

  if (row.__phonesJson) {
    if ((row.__phonesJson as any).__parse_error__) {
      errors.push(`row ${rowIndex}: invalid phoneNumbers_json`);
    } else if (Array.isArray(row.__phonesJson)) {
      for (const p of row.__phonesJson) {
        if (!p) continue;
        // Normalize shape
        const number = (p.number ?? p.phone ?? "").toString();
        const label  = (p.label ?? "office").toString().toLowerCase();
        const priority = typeof p.priority === "number" ? p.priority : (Number(p.priority) || 100);
        const verified = Boolean(p.verified);
        const source   = (p.source ?? "").toString();
        if (number) phones.push({ number, label, priority, verified, source });
      }
    } else {
      errors.push(`row ${rowIndex}: phoneNumbers_json must be an array`);
    }
  }

  // Committees
  let committees: Array<any> = [];
  if (row.__committeesJson) {
    if ((row.__committeesJson as any).__parse_error__) {
      errors.push(`row ${rowIndex}: invalid committees_json`);
    } else if (Array.isArray(row.__committeesJson)) {
      committees = row.__committeesJson.map((c: any) => ({
        name: (c?.name ?? "").toString().trim(),
        chamber: (c?.chamber ?? "other").toString().toLowerCase(),
        role: (c?.role ?? "").toString(),
        source: (c?.source ?? "").toString(),
      })).filter((c: any) => c.name);
    } else {
      errors.push(`row ${rowIndex}: committees_json must be an array`);
    }
  }

  // Committee tags: string or CSV → string[]
  const committeeTags = toArrayOfStrings(row.committeeTags);

  // Jurisdiction
  const jurisdiction: any = {
    city: row.city || undefined,
    county: row.county || undefined,
  };
  // allow dotted header mapping e.g. jurisdiction.congressionalDistrict
  if (row.jurisdiction?.congressionalDistrict) {
    jurisdiction.congressionalDistrict = row.jurisdiction.congressionalDistrict;
  }

  const proposed = {
    fullName: row.fullName,
    role: row.role,
    // Email is optional at ingest; validator should accept empty/undefined
    email: row.email || undefined,
    state: row.state,
    category: row.category,
    level: row.level,
    jurisdiction,
    issues: (row.issues ?? "").toString(), // validator will split if string
    sourceNote: row.sourceNote || undefined,
    phoneNumbers: phones,
    // extras (widen ProposedOfficial at callsite)
    committees,
    committeeTags,
  } as ProposedOfficial as any;

  return proposed;
}

/** ------------------ Core ingest ------------------ **/

export async function ingestRows(rows: any[], user: SessionUser): Promise<IngestSummary> {
  let processedCreates = 0;
  let convertedToEdits = 0;
  let conflicts = 0;
  const errors: Array<{ rowIndex: number; errors: string[] }> = [];

  for (let i = 0; i < rows.length; i++) {
    const rowErrors: string[] = [];
    const proposedRaw = toProposed(rows[i], i + 1, rowErrors);

    // validate/clean (keeps extra fields if validator allows Mixed; otherwise we’ll reattach below)
    const { errors: valErrs, proposed: cleaned0 } = validateAndCleanProposed(proposedRaw);
    if (valErrs.length) rowErrors.push(...valErrs);

    if (rowErrors.length) {
      errors.push({ rowIndex: i + 1, errors: rowErrors });
      continue;
    }

    const cleaned = cleaned0 as any;

    // normalize issues to ObjectIds, keep names for reviewer UX
    if (Array.isArray(cleaned.issues) && cleaned.issues.length) {
      const { ids, names } = await ensureIssuesByNames(cleaned.issues as string[]);
      cleaned.issueNames = names;
      cleaned.issues = ids;
    } else {
      cleaned.issues = [];
      cleaned.issueNames = [];
    }

    // Normalize phone numbers (drops invalids/dedupes by E.164)
    if (Array.isArray(cleaned.phoneNumbers)) {
      cleaned.phoneNumbers = normalizePhoneArray(cleaned.phoneNumbers);
    }

    // Committees / committeeTags: re-attach if validator stripped them
    if (!Array.isArray(cleaned.committees) && Array.isArray(proposedRaw.committees)) {
      cleaned.committees = proposedRaw.committees;
    }
    if (!Array.isArray(cleaned.committeeTags) && Array.isArray(proposedRaw.committeeTags)) {
      cleaned.committeeTags = proposedRaw.committeeTags;
    }

    // classify
    const m = await matchOfficial({
      email: cleaned.email, // may be undefined
      fullName: cleaned.fullName,
      role: cleaned.role,
      state: cleaned.state,
      level: cleaned.level,
      jurisdiction: cleaned.jurisdiction,
    });

    let type: "create" | "edit" = "create";
    let targetOfficialId: string | null = null;
    let status: "pending" | "conflict" = "pending";

    if (m.method === "email" || (m.method === "fuzzy" && m.score >= HARD_MATCH)) {
      type = "edit";
      targetOfficialId = (m as any).officialId;
    } else if (m.method === "none" && m.score >= SOFT_MATCH) {
      status = "conflict";
    }

    const groupKey = computeGroupKey(cleaned, type, targetOfficialId?.toString());

    try {
      const leader = await OfficialSubmission.findOne({
        groupKey,
        status: { $in: ["pending", "conflict"] },
      }).sort({ createdAt: 1 });

      if (!leader) {
        await OfficialSubmission.create({
          type,
          targetOfficialId,
          proposed: cleaned,
          submitterId: user.email,
          submitterEmail: user.email,
          submitterRole: user.role,
          status,
          dedupe: { method: m.method, score: m.score, candidates: m.candidates, reason: m.reason },
          groupKey,
          groupLeaderId: null,
          relatedCount: 0,
          variants: [{ cleaned, user: user.email }],
          sourceAttribution: { originalRaw: rows[i] },
        });
      } else {
        const isExactDup = shallowEqualProposed(leader.proposed, cleaned);
        await OfficialSubmission.updateOne(
          { _id: leader._id },
          { $inc: { relatedCount: 1 }, $push: { variants: { cleaned, user: user.email } } }
        );
        await OfficialSubmission.create({
          type,
          targetOfficialId,
          proposed: cleaned,
          submitterId: user.email,
          submitterEmail: user.email,
          submitterRole: user.role,
          status: isExactDup ? "duplicate" : status,
          dedupe: { method: m.method, score: m.score, candidates: (m as any).candidates, reason: m.reason },
          groupKey,
          groupLeaderId: leader._id,
          sourceAttribution: { originalRaw: rows[i] },
        });
      }

      if (type === "edit") convertedToEdits++;
      else if (status === "conflict") conflicts++;
      else processedCreates++;
    } catch (err) {
      console.error("DB insert failed:", rows[i], err);
      errors.push({ rowIndex: i + 1, errors: ["db insert failed"] });
    }
  }

  return { processedCreates, convertedToEdits, conflicts, errors };
}
