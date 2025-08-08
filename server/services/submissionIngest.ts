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

type SessionUser = {
  email: string;
  role: string;
};

export type IngestSummary = {
  processedCreates: number;
  convertedToEdits: number;
  conflicts: number;
  errors: Array<{ rowIndex: number; errors: string[] }>;
};

/** -------- Parsing helpers (CSV/XLSX) -------- **/

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
  const worksheet = workbook.worksheets[0];

  const headers: string[] = [];
  worksheet.getRow(1).eachCell((cell, colNumber) => {
    headers[colNumber] = (cell.value || "").toString();
  });

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // skip header
    const obj: any = {};
    row.eachCell((cell, colNumber) => {
      obj[headers[colNumber]] = cell.value?.toString() ?? "";
    });
    rows.push(obj);
  });

  return rows.map(normalizeRowKeys);
}

/** -------- Row normalization -------- **/

// Accepts loose headers like Full Name, full_name, NAME, etc.
function normalizeRowKeys(row: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(row)) {
    const key = k.toLowerCase().replace(/\s|_/g, "");
    switch (key) {
      case "fullname":
      case "name":
        out.fullName = v; break;
      case "role":
      case "title":
        out.role = v; break;
      case "email":
        out.email = v; break;
      case "state":
        out.state = v; break;
      case "category":
        out.category = v; break;
      case "level":
        out.level = v; break;
      case "city":
        out.city = v; break;
      case "county":
        out.county = v; break;
      case "issues":
        out.issues = v; break;
      case "sourcenote":
      case "note":
      case "source":
        out.sourceNote = v; break;
      case "phone":
      case "phonenumber":
        out.phone = v; break;
      case "phone1":
      case "phonenumber1":
        out.phone1 = v; break;
      case "phone2":
      case "phonenumber2":
        out.phone2 = v; break;
      case "phonelabel1":
        out.phoneLabel1 = v; break;
      case "phonelabel2":
        out.phoneLabel2 = v; break;
      default:
        // keep unknowns around just in case
        out[k] = v;
    }
  }
  return out;
}

function toProposed(row: any): ProposedOfficial {
  const phones: any[] = [];
  if (row.phone)      phones.push({ number: row.phone, label: "office" });
  if (row.phone1)     phones.push({ number: row.phone1, label: row.phoneLabel1 || "office" });
  if (row.phone2)     phones.push({ number: row.phone2, label: row.phoneLabel2 || "other" });
  return {
    fullName: row.fullName,
    role: row.role,
    email: row.email,
    state: row.state,
    category: row.category,
    level: row.level,
    jurisdiction: { city: row.city, county: row.county },
    issues: (row.issues ?? "").toString(), // validator will split if string
    sourceNote: row.sourceNote || undefined,
    phoneNumbers: phones,
  };
}

/** -------- Core ingest (validate → normalize issues → classify → insert) -------- **/

export async function ingestRows(rows: any[], user: SessionUser): Promise<IngestSummary> {
  let processedCreates = 0;
  let convertedToEdits = 0;
  let conflicts = 0;
  const errors: Array<{ rowIndex: number; errors: string[] }> = [];

  for (let i = 0; i < rows.length; i++) {
    const proposedRaw = toProposed(rows[i]);

    // validate/clean
    const { errors: rowErrors, proposed: cleaned } = validateAndCleanProposed(proposedRaw);
    if (rowErrors.length) {
      errors.push({ rowIndex: i + 1, errors: rowErrors });
      continue;
    }

    // normalize issues to ObjectIds, keep names for reviewer UX
    if (Array.isArray(cleaned.issues) && cleaned.issues.length) {
      const { ids, names } = await ensureIssuesByNames(cleaned.issues as string[]);
      (cleaned as any).issueNames = names;
      cleaned.issues = ids;
    } else {
      cleaned.issues = [];
      (cleaned as any).issueNames = [];
    }

    // Normalize phone numbers to E.164 and drop invalids
    if (Array.isArray(cleaned.phoneNumbers)) {
      (cleaned as any).phoneNumbers = normalizePhoneArray(cleaned.phoneNumbers as any[]);
    }

    // classify (email → edit; fuzzy → maybe edit; soft → conflict)
    const m = await matchOfficial({
      email: cleaned.email,
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
        // look for an existing leader thread (pending/conflict)
        const leader = await OfficialSubmission.findOne({
        groupKey,
        status: { $in: ["pending", "conflict"] },
        }).sort({ createdAt: 1 });

        let doc;

        if (!leader) {
        // create leader
            doc = await OfficialSubmission.create({
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
            // attach to leader
            const isExactDup = shallowEqualProposed(leader.proposed, cleaned);
            await OfficialSubmission.updateOne(
                { _id: leader._id },
                {
                $inc: { relatedCount: 1 },
                $push: { variants: { cleaned, user: user.email } },
                }
            );
            doc = await OfficialSubmission.create({
                type,
                targetOfficialId,
                proposed: cleaned,
                submitterId: user.email,
                submitterEmail: user.email,
                submitterRole: user.role,
                status: isExactDup ? "duplicate" : status,
                dedupe: {
                method: m.method,
                score: m.score,
                candidates: (m as any).candidates,
                reason: m.reason,
                },
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
