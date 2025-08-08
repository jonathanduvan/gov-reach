import React, { useMemo, useRef, useState } from "react";
import Papa from "papaparse";
import { API_BASE_URL } from "../config";

/**
 * MVP scope:
 * - CSV + JSON only (Excel/Sheets disabled for now)
 * - CSV: preview first 20 rows, normalize headers, then upload original file
 * - After upload: show counters + per-row errors (row#, messages)
 * - "Download error CSV" containing only bad rows + error column
 * - JSON: pretty format, validate array, then POST
 */

// ----- types -----
type UploadResponse = {
  processedCreates?: number;
  convertedToEdits?: number;
  conflicts?: number;
  duplicates?: number; // optional if backend returns
  errors?: Array<{ rowIndex: number; errors: string[] }>;
};

type NormalizedRow = {
  // canonical fields the backend expects (MVP)
  fullName?: string;
  role?: string;
  email?: string;
  state?: string;
  category?: string;
  level?: string;
  city?: string;
  county?: string;
  issues?: string; // comma/semicolon separated; server splits in validator
  sourceNote?: string;

  // new phone support
  phone?: string;
  phone1?: string;
  phoneLabel1?: string;
  phone2?: string;
  phoneLabel2?: string;
};

// ----- header normalization -----
const HEADER_ALIASES: Record<string, keyof NormalizedRow> = {
  // names -> canonical keys
  fullname: "fullName",
  "full name": "fullName",
  name: "fullName",
  role: "role",
  title: "role",
  email: "email",
  state: "state",
  category: "category",
  level: "level",
  city: "city",
  town: "city",
  municipality: "city",
  county: "county",
  issues: "issues",
  "issue(s)": "issues",
  tags: "issues",
  sourcenote: "sourceNote",
  "source note": "sourceNote",
  // phones
  phone: "phone",
  phone1: "phone1",
  "phone 1": "phone1",
  phonelabel1: "phoneLabel1",
  "phone label 1": "phoneLabel1",
  phone2: "phone2",
  "phone 2": "phone2",
  phonelabel2: "phoneLabel2",
  "phone label 2": "phoneLabel2",
};

function normalizeHeader(h: string): keyof NormalizedRow | undefined {
  const key = (h || "").trim().toLowerCase();
  return HEADER_ALIASES[key] || (key as keyof NormalizedRow);
}

function normalizeRow(raw: Record<string, any>): NormalizedRow {
  const out: any = {};
  for (const [k, v] of Object.entries(raw)) {
    const nk = normalizeHeader(k);
    if (!nk) continue;
    out[nk] = typeof v === "string" ? v.trim() : v;
  }
  return out as NormalizedRow;
}

// ----- CSV helpers -----
function downloadCsv(filename: string, rows: any[]) {
  const csv = Papa.unparse(rows, { quotes: true });
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 0);
}

// ----- Component -----
enum Tab { CSV = "CSV", JSON = "JSON" } // Excel/Sheets disabled

const BatchUpload: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>(Tab.CSV);

  // CSV state
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<NormalizedRow[]>([]);
  const [allParsedRows, setAllParsedRows] = useState<NormalizedRow[]>([]);
  const [csvInfo, setCsvInfo] = useState<{ headerMap: string[] } | null>(null);

  // JSON state
  const [jsonText, setJsonText] = useState("");

  // Results
  const [status, setStatus] = useState<string>("");
  const [counters, setCounters] = useState<UploadResponse | null>(null);
  const [errors, setErrors] = useState<UploadResponse["errors"]>([]);

  // Safety ref to cancel re-parsing
  const parsingRef = useRef<number>(0);

  const onChangeTab = (t: Tab) => {
    setActiveTab(t);
    setStatus("");
    setFile(null);
    setPreview([]);
    setAllParsedRows([]);
    setCsvInfo(null);
    setJsonText("");
    setCounters(null);
    setErrors([]);
  };

  // ---- CSV preview parse (entire file, render first 20) ----
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null;
    setFile(f);
    setPreview([]);
    setAllParsedRows([]);
    setCsvInfo(null);
    setCounters(null);
    setErrors([]);

    if (!f) return;

    const ticket = ++parsingRef.current;
    Papa.parse(f, {
      header: true,
      skipEmptyLines: "greedy",
      worker: false, // keep simple; can enable for huge files
      complete: (res) => {
        if (ticket !== parsingRef.current) return; // cancelled/outdated
        const rows = Array.isArray(res.data) ? res.data as Record<string, any>[] : [];
        const normalized = rows.map(normalizeRow);
        // compute normalized header order for preview
        const headerMap = Object.keys(rows[0] || {}).map((h) => normalizeHeader(h) || h);
        setAllParsedRows(normalized);
        setPreview(normalized.slice(0, 20));
        setCsvInfo({ headerMap: headerMap as string[] });
        setStatus(`Parsed ${normalized.length} rows. Previewing first 20.`);
      },
      error: (err) => {
        if (ticket !== parsingRef.current) return;
        setStatus(`❌ Parse error: ${err.message}`);
      }
    });
  };

  // ---- CSV upload original file ----
  const uploadCSV = async () => {
    if (!file) return;
    setStatus("Uploading CSV…");
    setCounters(null);
    setErrors([]);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`${API_BASE_URL}/api/officials/submissions/batch`, {
        method: "POST",
        credentials: "include",
        body: form,
      });
      const text = await res.text();
      if (!res.ok) throw new Error(text || "Upload failed");
      const data: UploadResponse = JSON.parse(text);
      setStatus("✅ Upload complete.");
      setCounters(data);
      setErrors(data.errors || []);
    } catch (e: any) {
      setStatus(`❌ Error: ${e.message}`);
    }
  };

  // ---- JSON upload ----
  const formatJson = () => {
    try {
      const obj = JSON.parse(jsonText);
      setJsonText(JSON.stringify(obj, null, 2));
    } catch {
      // ignore; keep raw
    }
  };

  const uploadJSON = async () => {
    setStatus("Uploading JSON…");
    setCounters(null);
    setErrors([]);
    try {
      const arr = JSON.parse(jsonText);
      if (!Array.isArray(arr)) throw new Error("JSON must be an array of objects");
      const res = await fetch(`${API_BASE_URL}/api/officials/submissions/batch-json`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(arr),
      });
      const text = await res.text();
      if (!res.ok) throw new Error(text || "Upload failed");
      const data: UploadResponse = JSON.parse(text);
      setStatus("✅ Upload complete.");
      setCounters(data);
      setErrors(data.errors || []);
    } catch (e: any) {
      setStatus(`❌ Error: ${e.message}`);
    }
  };

  // ---- Error CSV download (bad rows + error column) ----
  const downloadErrorCsv = () => {
    if (!errors?.length || !allParsedRows.length) return;
    // server uses 1-based rowIndex in your seed code; adjust if needed
    const bad = errors.map(({ rowIndex, errors }) => {
      const idx = Math.max(0, rowIndex - 1);
      const base = allParsedRows[idx] || {};
      return { ...base, __errors: errors.join("; ") };
    });
    downloadCsv("officials-errors.csv", bad);
  };

  // ---- UI helpers ----
  const headerPreview = useMemo(() => {
    if (!csvInfo?.headerMap?.length) return null;
    return (
      <div className="text-xs text-gray-600">
        Detected headers → normalized:
        <ul className="list-disc ml-5 mt-1">
          {csvInfo.headerMap.map((h, i) => (
            <li key={i}><code>{String(h)}</code></li>
          ))}
        </ul>
      </div>
    );
  }, [csvInfo]);

  const countersView = useMemo(() => {
    if (!counters) return null;
    const {
      processedCreates = 0,
      convertedToEdits = 0,
      conflicts = 0,
      duplicates = 0
    } = counters;
    return (
      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
        <div className="border rounded p-3 bg-white"><div className="text-gray-500">Creates</div><div className="text-xl font-semibold">{processedCreates}</div></div>
        <div className="border rounded p-3 bg-white"><div className="text-gray-500">Edits</div><div className="text-xl font-semibold">{convertedToEdits}</div></div>
        <div className="border rounded p-3 bg-white"><div className="text-gray-500">Conflicts</div><div className="text-xl font-semibold">{conflicts}</div></div>
        <div className="border rounded p-3 bg-white"><div className="text-gray-500">Duplicates</div><div className="text-xl font-semibold">{duplicates}</div></div>
      </div>
    );
  }, [counters]);

  const errorsView = useMemo(() => {
    if (!errors?.length) return null;
    return (
      <div className="mt-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold">Row Errors</h3>
          <button
            onClick={downloadErrorCsv}
            className="text-sm px-3 py-1 border rounded"
          >
            Download error CSV
          </button>
        </div>
        <div className="overflow-auto border rounded">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-3 py-2 border-b">Row #</th>
                <th className="text-left px-3 py-2 border-b">Messages</th>
              </tr>
            </thead>
            <tbody>
              {errors.map((e, i) => (
                <tr key={i} className="odd:bg-white even:bg-gray-50">
                  <td className="px-3 py-2 border-b">{e.rowIndex}</td>
                  <td className="px-3 py-2 border-b">{e.errors.join("; ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }, [errors]);

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-2">Batch Upload Officials</h1>
      <p className="text-sm text-gray-600 mb-4">
        Upload CSV or JSON. We’ll preview the first 20 rows and validate server-side. Excel/Google Sheets uploads are disabled for now.
      </p>

      {/* Templates */}
      <div className="mb-4 text-sm text-gray-700">
        ⬇️ Templates:&nbsp;
        <a href="/templates/officials-template.csv" className="underline">CSV</a>
        &nbsp;|&nbsp;
        <a href="https://docs.google.com/" target="_blank" rel="noreferrer" className="underline">
          Google Sheets (view template)
        </a>
        <div className="text-xs text-gray-500 mt-1">
          Columns: <code>fullName,role,email,state,category,level,city,county,issues,phone,phoneLabel1,phone1,phoneLabel2,phone2,sourceNote</code>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        {[Tab.CSV, Tab.JSON].map((t) => (
          <button
            key={t}
            onClick={() => onChangeTab(t)}
            className={`px-3 py-1 rounded ${activeTab === t ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-800"}`}
          >
            {t}
          </button>
        ))}
        <button className="px-3 py-1 rounded bg-gray-100 text-gray-400 cursor-not-allowed" title="Disabled for now">
          Excel (disabled)
        </button>
        <button className="px-3 py-1 rounded bg-gray-100 text-gray-400 cursor-not-allowed" title="Disabled for now">
          Google Sheets (disabled)
        </button>
      </div>

      {/* CSV */}
      {activeTab === Tab.CSV && (
        <>
          <div className="space-y-3 mb-4">
            <input type="file" accept=".csv,text/csv" onChange={handleFileChange} />
            {headerPreview}
            {preview.length > 0 && (
              <div className="border rounded overflow-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      {Object.keys(preview[0]).map((h) => (
                        <th key={h} className="text-left px-3 py-2 border-b">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((row, i) => (
                      <tr key={i} className="odd:bg-white even:bg-gray-50">
                        {Object.values(row).map((v, j) => (
                          <td key={j} className="px-3 py-2 border-b">
                            {String(v ?? "")}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div>
              <button
                onClick={uploadCSV}
                disabled={!file}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded disabled:opacity-50"
              >
                Upload CSV
              </button>
            </div>
          </div>
        </>
      )}

      {/* JSON */}
      {activeTab === Tab.JSON && (
        <div className="space-y-2 mb-4">
          <textarea
            rows={10}
            className="border rounded w-full p-2 font-mono text-sm"
            placeholder={`Paste JSON array, e.g.\n[\n  {\n    "fullName":"Jane Smith", "role":"Mayor", "email":"...", "state":"FL", "level":"municipal", "city":"Coral Springs", "issues":"housing; transit", "phone":"+19545550123"\n  }\n]`}
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
          />
          <div className="flex gap-2">
            <button className="px-3 py-1 border rounded" onClick={formatJson}>Format JSON</button>
            <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded" onClick={uploadJSON}>
              Upload JSON
            </button>
          </div>
        </div>
      )}

      {status && <div className="mt-2 text-sm">{status}</div>}

      {countersView}
      {errorsView}
    </div>
  );
};

export default BatchUpload;
