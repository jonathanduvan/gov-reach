import React, { useState } from "react";
import { API_BASE_URL } from "../config";

enum Tab { CSV = "CSV", Excel = "Excel", JSON = "JSON", Sheets = "Google Sheets" }

const BatchUpload: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>(Tab.CSV);
  const [file, setFile] = useState<File | null>(null);
  const [jsonText, setJsonText] = useState("");
  const [sheetUrl, setSheetUrl] = useState("");
  const [status, setStatus] = useState("");

  const uploadFile = async (f: File) => {
    const form = new FormData();
    form.append("file", f);
    setStatus("Uploading...");
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/officials/submissions/batch`,
        {
          method: "POST",
          credentials: "include",
          body: form,
        }
      );
      if (!res.ok) throw new Error(await res.text());
      const { processed } = await res.json();
      setStatus(`✅ Processed ${processed} rows`);
    } catch (e: any) {
      setStatus(`❌ Error: ${e.message}`);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null;
    setFile(f);
  };

  const handleUpload = () => {
    if (file) uploadFile(file);
  };

  const handleJsonUpload = async () => {
    setStatus("Uploading JSON…");
    try {
      const arr = JSON.parse(jsonText);
      if (!Array.isArray(arr)) throw new Error("Not an array");
      const res = await fetch(
        `${API_BASE_URL}/api/officials/submissions/batch-json`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(arr),
        }
      );
      if (!res.ok) throw new Error(await res.text());
      const { processed } = await res.json();
      setStatus(`✅ Processed ${processed} rows`);
    } catch (e: any) {
      setStatus(`❌ Error: ${e.message}`);
    }
  };

  const handleSheetsFetch = async () => {
    if (!sheetUrl) return;
    setStatus("Fetching sheet…");
    try {
      const resp = await fetch(sheetUrl);
      if (!resp.ok) throw new Error("Unable to fetch sheet");
      const blob = await resp.blob();
      // assume CSV export
      const csvFile = new File([blob], "sheet.csv", { type: "text/csv" });
      await uploadFile(csvFile);
    } catch (e: any) {
      setStatus(`❌ Error: ${e.message}`);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Batch Upload Officials</h1>

      {/* Templates */}
      <div className="mb-4 text-sm text-gray-600">
        ⬇️ Download templates:{" "}
        <a href="/officials-template.csv" className="underline">
          CSV
        </a>{" "}
        |{" "}
        <a href="/officials-template.xlsx" className="underline">
          Excel
        </a>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        {(Object.values(Tab) as string[]).map((t) => (
          <button
            key={t}
            onClick={() => {
              setActiveTab(t as Tab);
              setStatus("");
              setFile(null);
              setJsonText("");
              setSheetUrl("");
            }}
            className={`px-3 py-1 rounded ${
              activeTab === t
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-800"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* CSV / Excel */}
      {(activeTab === Tab.CSV || activeTab === Tab.Excel) && (
        <div className="space-y-2 mb-4">
          <input
            type="file"
            accept={activeTab === Tab.CSV ? ".csv" : ".xlsx"}
            onChange={handleFileChange}
          />
          <button
            onClick={handleUpload}
            disabled={!file}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded disabled:opacity-50"
          >
            Upload {activeTab}
          </button>
        </div>
      )}

      {/* JSON */}
      {activeTab === Tab.JSON && (
        <div className="space-y-2 mb-4">
          <textarea
            rows={8}
            className="border rounded w-full p-2 font-mono text-sm"
            placeholder='Paste JSON array, e.g. `[{"fullName":"..."}]`'
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
          />
          <button
            onClick={handleJsonUpload}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
          >
            Upload JSON
          </button>
        </div>
      )}

      {/* Google Sheets */}
      {activeTab === Tab.Sheets && (
        <div className="space-y-2 mb-4">
          <input
            type="url"
            className="border rounded w-full p-2"
            placeholder="Google Sheets CSV export URL"
            value={sheetUrl}
            onChange={(e) => setSheetUrl(e.target.value)}
          />
          <button
            onClick={handleSheetsFetch}
            disabled={!sheetUrl}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded disabled:opacity-50"
          >
            Fetch & Upload
          </button>
        </div>
      )}

      {status && <div className="mt-4 text-sm">{status}</div>}

      <p className="mt-6 text-xs text-gray-500">
        CSV/Excel columns: <code>fullName,role,email,state,category,level,city,county,issues</code>
      </p>
    </div>
  );
};

export default BatchUpload;
