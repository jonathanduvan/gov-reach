import React, { useEffect, useRef, useState } from "react";
import Papa from "papaparse";
import { startImport, fetchImportJob } from "../services/importJobs";

// Minimal CSV header mapping -> proposed shape
// Accepts rows without email
const DEFAULT_MAP: Record<string,string> = {
  fullName: "Name",
  role: "Role",
  state: "State",
  level: "Level",
  category: "Category",
  email: "Email",
  "jurisdiction.city": "City",
  "jurisdiction.county": "County",
  "jurisdiction.congressionalDistrict": "District",
  phone: "Phone",
  committees: "Committees", // pipe or ; separated
};

type Props = {
  open: boolean;
  onClose: () => void;
  onDone: () => void; // refresh parent
};

const POLL_MS = 1200;

export default function BulkUploadModal({ open, onClose, onDone }: Props) {
  const [rows, setRows] = useState<any[]>([]);
  const [jobId, setJobId] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ total: number; processed: number; succeeded: number; failed: number; status: string; lastError?: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<number | null>(null);

  useEffect(() => {
    if (!open) {
      setRows([]); setJobId(null); setProgress(null); setError(null); setLoading(false);
      if (pollRef.current) window.clearInterval(pollRef.current);
    }
  }, [open]);

  useEffect(() => {
    if (!jobId) return;
    // poll progress
    pollRef.current = window.setInterval(async () => {
      try {
        const j = await fetchImportJob(jobId);
        setProgress({ total: j.total, processed: j.processed, succeeded: j.succeeded, failed: j.failed, status: j.status, lastError: j.lastError });
        if (j.status === "succeeded" || j.status === "failed") {
          if (pollRef.current) window.clearInterval(pollRef.current);
        }
      } catch (e: any) {
        setError(e?.message || "Failed to fetch job");
        if (pollRef.current) window.clearInterval(pollRef.current);
      }
    }, POLL_MS) as any;
    return () => { if (pollRef.current) window.clearInterval(pollRef.current); };
  }, [jobId]);

  function mapRow(r: any) {
    // map CSV columns → proposed
    const get = (k: string) => r[DEFAULT_MAP[k]] || "";
    const proposed: any = {
      fullName: get("fullName"),
      role: get("role"),
      state: String(get("state") || "").toUpperCase(),
      category: get("category"),
      level: String(get("level") || "").toLowerCase(), // federal/state/county/municipal/...
      email: (get("email") || "").toLowerCase() || undefined,
      jurisdiction: {
        city: get("jurisdiction.city") || undefined,
        county: get("jurisdiction.county") || undefined,
        congressionalDistrict: get("jurisdiction.congressionalDistrict") || undefined,
      },
      phoneNumbers: [],
      committees: [],
    };

    const phone = r[DEFAULT_MAP["phone"]];
    if (phone) {
      proposed.phoneNumbers = [{ number: String(phone).trim(), label: "office", priority: 100, verified: false }];
    }

    const committees = r[DEFAULT_MAP["committees"]];
    if (committees) {
      const parts = String(committees).split(/[;|]/).map(s => s.trim()).filter(Boolean);
      proposed.committees = parts.map((name: string) => ({ name, chamber: "house", role: "Member" }));
    }

    return proposed;
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setError(null);
    Papa.parse(f, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const arr = (result.data as any[]).map(mapRow).filter((r) => r.fullName && r.role && r.state && r.level && r.category);
        setRows(arr);
      },
      error: (err) => setError(err?.message || "Parse failed"),
    });
  }

  async function start() {
    if (!rows.length) return;
    setLoading(true);
    setError(null);
    try {
      const { jobId, total } = await startImport(rows, { source: "csv-upload" });
      setJobId(jobId);
      setProgress({ total, processed: 0, succeeded: 0, failed: 0, status: "queued" });
    } catch (e: any) {
      setError(e?.message || "Failed to start import");
    } finally {
      setLoading(false);
    }
  }

  const pct = progress ? Math.round(((progress.processed || 0) / Math.max(1, progress.total || 1)) * 100) : 0;

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-3xl rounded shadow-lg overflow-hidden">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <div className="font-semibold">Bulk Upload — Officials</div>
          <button className="text-sm px-2 py-1 border rounded" onClick={onClose}>Close</button>
        </div>

        <div className="p-4 space-y-4">
          {!jobId && (
            <>
              <input type="file" accept=".csv" onChange={onFile} />
              {error && <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</div>}
              <div className="text-sm text-gray-600">
                Expected headers (case-insensitive OK): <code>Name, Role, State, Level, Category, Email, City, County, District, Phone, Committees</code>
              </div>
              {rows.length > 0 && (
                <div className="text-sm text-gray-800">
                  Parsed <b>{rows.length}</b> rows.{" "}
                  <button className="ml-2 px-3 py-1 border rounded" disabled={loading} onClick={start}>
                    Start import
                  </button>
                </div>
              )}
            </>
          )}

          {jobId && progress && (
            <div className="space-y-2">
              <div className="text-sm">Job: <code>{jobId}</code> · Status: <b>{progress.status}</b></div>
              <div className="w-full bg-gray-100 rounded h-3 overflow-hidden">
                <div className="bg-green-500 h-3" style={{ width: `${pct}%` }} />
              </div>
              <div className="text-xs text-gray-700">
                Processed {progress.processed}/{progress.total} · Succeeded {progress.succeeded} · Failed {progress.failed}
                {progress.lastError ? <span className="ml-2 text-red-700">Last error: {progress.lastError}</span> : null}
              </div>
              {(progress.status === "succeeded" || progress.status === "failed") && (
                <div className="flex gap-2">
                  <button
                    className="px-3 py-1 border rounded"
                    onClick={() => { onDone(); onClose(); }}
                  >
                    Done & refresh
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
