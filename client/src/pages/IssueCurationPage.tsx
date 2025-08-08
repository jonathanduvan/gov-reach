import React, { useEffect, useMemo, useState } from "react";
import { useUser } from "../context/UserContext";
import {
  listIssues, updateIssue, addAlias, removeAlias, mergeIssues, recountIssues
} from "../services/issues";
import IssueTypeahead from "../components/IssueTypeahead";

type Issue = {
  _id: string;
  name: string;
  slug: string;
  aliases: string[];
  pending: boolean;
  category?: string;
  usageCount: number;
  createdAt?: string;
  updatedAt?: string;
};

const PAGE_LIMIT = 25;

const IssueCurationPage: React.FC = () => {
  const { isAdmin } = useUser();
  const [q, setQ] = useState("");
  const [pendingFilter, setPendingFilter] = useState<"all" | "true" | "false">("all");
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<Issue[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

  // alias input state per row
  const [aliasInput, setAliasInput] = useState<Record<string, string>>({});

  // merge state
  const [mergeOpen, setMergeOpen] = useState(false);
  const [mergeSource, setMergeSource] = useState<Issue | null>(null);
  const [mergeTargetId, setMergeTargetId] = useState<string>("");
  const [mergePreview, setMergePreview] = useState<any | null>(null);
  const [mergeBusy, setMergeBusy] = useState(false);
  const [mergeTargetSel, setMergeTargetSel] = useState<{id: string; label: string} | null>(null);

  const pendingParam = useMemo(() => (pendingFilter === "all" ? undefined : pendingFilter), [pendingFilter]);

  const load = async () => {
    setLoading(true);
    try {
      const data = await listIssues({ q, pending: pendingParam, page, limit: PAGE_LIMIT });
      setItems(data.items || []);
      setTotal(data.total || 0);
    } catch (e) {
      console.error(e);
      alert("Failed to load issues");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAdmin) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, pendingParam, page, isAdmin]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT));

  if (!isAdmin) {
    return <div className="max-w-5xl mx-auto p-6 text-red-700">Admins only.</div>;
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Issue Curation</h1>
        <button
          className="text-sm px-3 py-1 border rounded"
          onClick={async () => { await recountIssues(); load(); }}
          title="Recompute usage counts from Officials"
        >
          Recount usage
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <input
          className="border rounded px-3 py-2 w-72"
          placeholder="Search name / slug / alias"
          value={q}
          onChange={(e) => { setPage(1); setQ(e.target.value); }}
        />
        <select
          className="border rounded px-2 py-2"
          value={pendingFilter}
          onChange={(e) => { setPage(1); setPendingFilter(e.target.value as any); }}
        >
          <option value="all">All</option>
          <option value="true">Pending only</option>
          <option value="false">Approved only</option>
        </select>
      </div>

      {/* Table */}
      <div className="border rounded overflow-x-auto bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 sticky top-0 z-10">
            <tr>
              <th className="text-left px-3 py-2 border-b w-6"></th>
              <th className="text-left px-3 py-2 border-b">Name</th>
              <th className="text-left px-3 py-2 border-b">Slug</th>
              <th className="text-left px-3 py-2 border-b">Aliases</th>
              <th className="text-left px-3 py-2 border-b">Pending</th>
              <th className="text-right px-3 py-2 border-b">Usage</th>
              <th className="text-right px-3 py-2 border-b">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="px-3 py-6 text-center text-gray-500">Loading…</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={7} className="px-3 py-6 text-center text-gray-500">No issues.</td></tr>
            ) : items.map((iss) => (
              <tr key={iss._id} className="odd:bg-white even:bg-gray-50 align-top">
                <td className="px-3 py-2">
                  {/* merge pick as source */}
                  <button
                    className="text-xs px-2 py-0.5 border rounded"
                    title="Merge this into another"
                    onClick={() => { setMergeSource(iss); setMergeOpen(true); setMergeTargetId(""); setMergePreview(null); }}
                  >
                    Merge
                  </button>
                </td>
                <td className="px-3 py-2">
                  <div className="font-medium">{iss.name}</div>
                  <div className="text-[10px] text-gray-500">id: {iss._id}</div>
                </td>
                <td className="px-3 py-2">{iss.slug}</td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-1">
                    {iss.aliases?.map((a) => (
                      <span key={a} className="inline-flex items-center bg-gray-100 text-xs px-2 py-0.5 rounded">
                        {a}
                        <button
                          className="ml-2 text-gray-600"
                          title="Remove alias"
                          onClick={async () => {
                            await removeAlias(iss._id, a);
                            load();
                          }}
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <input
                      className="border rounded px-2 py-1 text-xs"
                      placeholder="add alias"
                      value={aliasInput[iss._id] || ""}
                      onChange={(e) => setAliasInput(prev => ({ ...prev, [iss._id]: e.target.value }))}
                      onKeyDown={async (e) => {
                        if (e.key === "Enter" && aliasInput[iss._id]) {
                          await addAlias(iss._id, aliasInput[iss._id]);
                          setAliasInput(prev => ({ ...prev, [iss._id]: "" }));
                          load();
                        }
                      }}
                    />
                    <button
                      className="text-xs px-2 py-1 border rounded"
                      onClick={async () => {
                        const val = (aliasInput[iss._id] || "").trim();
                        if (!val) return;
                        await addAlias(iss._id, val);
                        setAliasInput(prev => ({ ...prev, [iss._id]: "" }));
                        load();
                      }}
                    >
                      Add
                    </button>
                  </div>
                </td>
                <td className="px-3 py-2">
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={!iss.pending ? false : true}
                      onChange={async (e) => {
                        await updateIssue(iss._id, { pending: e.target.checked });
                        load();
                      }}
                    />
                    <span className="text-xs">{iss.pending ? "pending" : "approved"}</span>
                  </label>
                </td>
                <td className="px-3 py-2 text-right">{iss.usageCount ?? 0}</td>
                <td className="px-3 py-2 text-right">
                  <button
                    className="text-xs px-2 py-1 border rounded"
                    onClick={async () => {
                      const newName = prompt("Rename issue", iss.name);
                      if (!newName || newName.trim() === iss.name) return;
                      await updateIssue(iss._id, { name: newName.trim() });
                      load();
                    }}
                  >
                    Rename
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="mt-3 text-sm flex items-center justify-between">
        <div>Showing page {page} of {totalPages} — total {total}</div>
        <div className="flex gap-1">
          <button className="px-2 py-1 border rounded disabled:opacity-50" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p-1))}>Prev</button>
          <button className="px-2 py-1 border rounded disabled:opacity-50" disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p+1))}>Next</button>
        </div>
      </div>

      {/* Merge modal */}
      {mergeOpen && mergeSource && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded shadow-lg max-w-lg w-full">
            <div className="px-4 py-3 border-b flex items-center justify-between">
              <div className="font-semibold text-sm">Merge Issue</div>
              <button className="text-sm px-2 py-1 border rounded" onClick={() => { setMergeOpen(false); setMergeSource(null); setMergeTargetId(""); setMergePreview(null); }}>
                Close
              </button>
            </div>
            <div className="p-4 text-sm space-y-3">
              <div><strong>Source:</strong> {mergeSource.name} <span className="text-gray-500">({mergeSource.slug})</span></div>
                <div>
                <label className="block mb-1">Target issue</label>
                <IssueTypeahead
                    value={mergeTargetSel}
                    onChange={setMergeTargetSel}
                    excludeId={mergeSource?._id}
                    placeholder="Search by name / slug / alias"
                    autoFocus
                />
                </div>
              <div className="flex gap-2">
                <button
                  className="px-3 py-1 border rounded"
                  disabled={!mergeTargetId || mergeBusy}
                  onClick={async () => {
                    setMergeBusy(true);
                    try {
                      const preview = await mergeIssues(mergeSource._id, mergeTargetSel!.id, true);
                      setMergePreview(preview);
                    } catch (e: any) {
                      alert(e.message || "Dry-run failed");
                    } finally {
                      setMergeBusy(false);
                    }
                  }}
                >
                  Dry run
                </button>
                <button
                  className="px-3 py-1 rounded bg-green-600 text-white disabled:opacity-50"
                  disabled={!mergeTargetId || mergeBusy}
                  onClick={async () => {
                    if (!confirm("Merge now? This updates references and deletes the source issue.")) return;
                    setMergeBusy(true);
                    try {
                      await mergeIssues(mergeSource._id, mergeTargetSel!.id, true);;
                      setMergeOpen(false);
                      setMergeSource(null);
                      setMergeTargetId("");
                      setMergePreview(null);
                      // refresh list
                      load();
                    } catch (e: any) {
                      alert(e.message || "Merge failed");
                    } finally {
                      setMergeBusy(false);
                    }
                  }}
                >
                  Merge
                </button>
              </div>

              {mergePreview && (
                <div className="mt-2 border rounded p-2 bg-gray-50">
                  <div className="font-medium mb-1">Dry-run</div>
                  <div>Officials to update: {mergePreview?.wouldUpdate?.officials ?? 0}</div>
                  <div>Submissions to update: {mergePreview?.wouldUpdate?.submissions ?? 0}</div>
                  <div className="text-xs text-gray-600 mt-1">
                    Source: {mergePreview?.source?.name} ({mergePreview?.source?.slug}) → Target: {mergePreview?.target?.name} ({mergePreview?.target?.slug})
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default IssueCurationPage;
