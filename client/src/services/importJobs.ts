// client/src/services/importJobs.ts
import { API_BASE_URL } from "../config";

export async function startImport(records: any[], meta?: any) {
  const res = await fetch(`${API_BASE_URL}/api/import-jobs`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ records, meta }),
  });
  if (!res.ok) throw new Error(`Import start failed: ${res.status}`);
  return res.json(); // { jobId, total }
}

export async function fetchImportJob(jobId: string) {
  const res = await fetch(`${API_BASE_URL}/api/import-jobs/${jobId}`, { credentials: "include" });
  if (!res.ok) throw new Error(`Import job fetch failed: ${res.status}`);
  return res.json();
}
