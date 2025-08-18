import React, { Fragment, useEffect, useMemo, useState } from "react";
import { useUser } from "../context/UserContext";
import {
  fetchThreads,
  fetchThreadDetail,
  resolveSubmission,
  bulkResolveSubmissions,
  getThreadLock,
  claimThread,
  releaseThread,
} from "../services/submissions";
import ReviewMergeModal from "../components/review-merge/ReviewMergeModal";
import BulkUploadModal from "../components/BulkUploadModal";

type Thread = {
  groupKey: string;
  leader: any;
  relatedCount: number;
  variants: Array<{ proposed: any; submitterId: string; submittedAt?: string }>;
  latestAt: string;
};

const PAGE_SIZE_OPTS = [50, 100, 200];

export default function ReviewerDashboard() {
  const { isAdmin, isPartner } = useUser();

  const [status, setStatus] = useState<"pending" | "conflict" | "all">("pending");
  const [q, setQ] = useState("");
  const [limit, setLimit] = useState<number>(50);
  const [loading, setLoading] = useState(true);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [detail, setDetail] = useState<Record<string, any>>({});
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const selectedIds = useMemo(() => Object.keys(selected).filter((k) => selected[k]), [selected]);

  const [verifyOnApprove, setVerifyOnApprove] = useState(true);
  const [closeThreadOnApprove, setCloseThreadOnApprove] = useState(false);

  const [mergeOpen, setMergeOpen] = useState(false);
  const [mergeLeader, setMergeLeader] = useState<any | null>(null);
  const [mergeChildren, setMergeChildren] = useState<any[] | undefined>(undefined);

  const [locks, setLocks] = useState<Record<string, any>>({});
  const [uploadOpen, setUploadOpen] = useState(false);

  const clearSelection = () => setSelected({});

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchThreads({ status, q, limit });
      setThreads(data.threads || []);
      clearSelection();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAdmin && !isPartner) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, q, limit, isAdmin, isPartner]);

  async function refreshLock(groupKey: string) {
    try {
      const d = await getThreadLock(groupKey);
      setLocks((prev) => ({ ...prev, [groupKey]: d }));
    } catch {}
  }
  useEffect(() => { threads.forEach((t) => refreshLock(t.groupKey)); }, [threads]);

  const toggleExpand = async (groupKey: string) => {
    setExpanded((p) => ({ ...p, [groupKey]: !p[groupKey] }));
    if (!detail[groupKey]) {
      try {
        const d = await fetchThreadDetail(groupKey);
        setDetail((prev) => ({ ...prev, [groupKey]: d }));
      } catch (e) {
        console.error(e);
      }
    }
  };

  async function onClaim(t: any) {
    try { await claimThread(t.groupKey); await refreshLock(t.groupKey); } catch (e: any) { alert(e?.message || "Failed to claim"); }
  }
  async function onRelease(t: any) {
    if (!confirm("Release this lock so others can review?")) return;
    try { await releaseThread(t.groupKey); await refreshLock(t.groupKey); } catch (e: any) { alert(e?.message || "Failed to release"); }
  }

  const approve = async (submissionId: string) => {
    if (!confirm("Approve this submission?")) return;
    await resolveSubmission(submissionId, "approve", { verify: verifyOnApprove, closeThread: closeThreadOnApprove });
    await load();
  };
  const reject = async (submissionId: string) => {
    if (!confirm("Reject this submission?")) return;
    await resolveSubmission(submissionId, "reject", { resolution: "not applicable" });
    await load();
  };

  const visibleIds = useMemo(() => {
    const ids: string[] = [];
    for (const t of threads) {
      if (t.leader?._id) ids.push(t.leader._id);
      if (expanded[t.groupKey]) {
        const ch = detail[t.groupKey]?.children || [];
        for (const c of ch) if (c?._id) ids.push(c._id);
      }
    }
    return ids;
  }, [threads, expanded, detail]);

  const allVisibleSelected = useMemo(
    () => visibleIds.length > 0 && visibleIds.every((id) => !!selected[id]),
    [visibleIds, selected]
  );
  const someVisibleSelected = useMemo(() => visibleIds.some((id) => !!selected[id]), [visibleIds, selected]);

  const toggleSelect = (id: string, on?: boolean) =>
    setSelected((prev) => ({ ...prev, [id]: typeof on === "boolean" ? on : !prev[id] }));
  const toggleSelectAllVisible = (on: boolean) => {
    const patch: Record<string, boolean> = {};
    for (const id of visibleIds) patch[id] = on;
    setSelected((prev) => ({ ...prev, ...patch }));
  };
  const toggleSelectInThread = (groupKey: string, on: boolean) => {
    const t = threads.find((x) => x.groupKey === groupKey);
    const ids = [
      t?.leader?._id,
      ...(detail[groupKey]?.children || []).map((c: any) => c?._id),
    ].filter(Boolean) as string[];
    const patch: Record<string, boolean> = {};
    ids.forEach((id) => (patch[id] = on));
    setSelected((prev) => ({ ...prev, ...patch }));
  };

  async function bulkApprove() {
    if (!selectedIds.length) return;
    if (!confirm(`Approve ${selectedIds.length} submission(s)?`)) return;
    // chunk client-side so user sees steady progress
    const BATCH = 50;
    let ok = 0, fail = 0;
    for (let i = 0; i < selectedIds.length; i += BATCH) {
      const slice = selectedIds.slice(i, i + BATCH);
      try {
        const res = await bulkResolveSubmissions(slice, "approve", { verify: verifyOnApprove, closeThread: closeThreadOnApprove });
        ok += res.ok || 0; fail += res.fail || 0;
      } catch {
        fail += slice.length;
      }
    }
    alert(`Bulk approve done. OK: ${ok}  Fail: ${fail}`);
    await load();
  }

  async function bulkReject() {
    if (!selectedIds.length) return;
    const reason = prompt("Reject reason?") || "not applicable";
    const BATCH = 50;
    let ok = 0, fail = 0;
    for (let i = 0; i < selectedIds.length; i += BATCH) {
      const slice = selectedIds.slice(i, i + BATCH);
      try {
        const res = await bulkResolveSubmissions(slice, "reject", { resolution: reason });
        ok += res.ok || 0; fail += res.fail || 0;
      } catch {
        fail += slice.length;
      }
    }
    alert(`Bulk reject done. OK: ${ok}  Fail: ${fail}`);
    await load();
  }

  async function openMerge(t: any) {
    await refreshLock(t.groupKey);
    const lk = locks[t.groupKey];
    if (!lk?.locked || lk?.isMine) {
      try { await claimThread(t.groupKey); } catch {}
      await refreshLock(t.groupKey);
    } else {
      return alert(`Locked by ${lk.lockedBy}. Try again later.`);
    }
    setMergeLeader(t.leader);
    try {
      const d = await fetchThreadDetail(t.groupKey);
      setMergeChildren(d.children || []);
    } catch {
      setMergeChildren(undefined);
    }
    setMergeOpen(true);
  }
  const onCloseMerge = async () => { setMergeOpen(false); setMergeLeader(null); setMergeChildren(undefined); await load(); };

  if (!isAdmin && !isPartner) {
    return <div className="p-6 text-red-700">You don’t have permission to review submissions.</div>;
  }

  const singles = threads.filter((t) => (t.relatedCount || 0) === 0);
  const groups  = threads.filter((t) => (t.relatedCount || 0) > 0);

  const DetailLine = ({ proposed }: { proposed: any }) => {
    const email = proposed?.email || "no email";
    const city = proposed?.jurisdiction?.city || proposed?.city || "";
    const state = proposed?.state || "";
    const level = proposed?.level || "";
    return <div className="text-sm text-gray-600">{email} · {city ? `${city}, ` : ""}{state} · level: {level}</div>;
  };

  const LockBadge = ({ lock }: { lock: any }) =>
    lock?.locked && !lock?.expired ? (
      <span className="ml-2 text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-700">{lock.isMine ? "Claimed by you" : `Locked by ${lock.lockedBy}`}</span>
    ) : null;

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h1 className="text-2xl font-bold">Review Submissions</h1>
          <p className="text-sm text-gray-600">Approve clean data fast. Merge conflicts with confidence.</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="px-3 py-1.5 border rounded" onClick={() => setUploadOpen(true)}>Bulk Upload</button>
          <button className="px-3 py-1.5 border rounded" onClick={load}>Refresh</button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 items-center mb-4">
        <select value={status} onChange={(e) => setStatus(e.target.value as any)} className="border p-2 rounded">
          <option value="pending">Pending</option>
          <option value="conflict">Conflict</option>
          <option value="all">All</option>
        </select>
        <input className="border p-2 rounded flex-1 min-w-[240px]" placeholder="Search name, email, role…" value={q} onChange={(e) => setQ(e.target.value)} />
        <label className="flex items-center gap-2 text-sm text-gray-700">
          Page size
          <select className="border p-2 rounded" value={limit} onChange={(e) => setLimit(Number(e.target.value))}>
            {PAGE_SIZE_OPTS.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>

        <div className="ml-auto flex items-center gap-3">
          <label className="text-xs text-gray-700 flex items-center gap-1">
            <input type="checkbox" checked={verifyOnApprove} onChange={() => setVerifyOnApprove((v) => !v)} /> Verify on approve
          </label>
          <label className="text-xs text-gray-700 flex items-center gap-1">
            <input type="checkbox" checked={closeThreadOnApprove} onChange={() => setCloseThreadOnApprove((v) => !v)} /> Close thread on approve
          </label>
          <div className="flex items-center gap-1 mr-2">
            <input
              type="checkbox"
              checked={allVisibleSelected}
              ref={(el) => { if (el) el.indeterminate = !allVisibleSelected && someVisibleSelected; }}
              onChange={(e) => toggleSelectAllVisible(e.target.checked)}
              title="Select all visible"
            />
            <span className="text-xs text-gray-600">All visible</span>
          </div>
          <button className="px-3 py-1.5 border rounded disabled:opacity-50" onClick={bulkApprove} disabled={!selectedIds.length}>Bulk Approve</button>
          <button className="px-3 py-1.5 border rounded disabled:opacity-50" onClick={bulkReject} disabled={!selectedIds.length}>Bulk Reject</button>
        </div>
      </div>

      {selectedIds.length > 0 && (
        <div className="sticky top-0 z-10 mb-3 -mt-1 bg-yellow-50 border border-yellow-200 rounded px-3 py-2 flex items-center justify-between">
          <div className="text-xs text-yellow-800"><b>{selectedIds.length}</b> selected</div>
          <div className="flex items-center gap-2">
            <button className="px-2 py-1 text-xs border rounded" onClick={bulkApprove}>Approve</button>
            <button className="px-2 py-1 text-xs border rounded" onClick={bulkReject}>Reject</button>
          </div>
        </div>
      )}

      {loading ? (
        <div>Loading…</div>
      ) : (
        <Fragment>
          {/* Singles */}
          <section className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-semibold">Single submissions <span className="text-sm text-gray-500">({threads.filter(t => (t.relatedCount||0)===0).length})</span></h2>
            </div>
            <ul className="space-y-3">
              {threads.filter(t => (t.relatedCount||0)===0).map((t) => {
                const L = t.leader?.proposed || {};
                const leaderId = t.leader?._id;
                const isConflict = t.leader?.status === "conflict";
                const lk = locks[t.groupKey];

                return (
                  <li key={t.groupKey} className="border rounded p-4 bg-white">
                    <div className="flex justify-between items-start">
                      <div className="flex items-start gap-3">
                        <input type="checkbox" className="mt-1" checked={!!selected[leaderId]} onChange={() => leaderId && toggleSelect(leaderId)} />
                        <div>
                          <div className="font-semibold">
                            {L.fullName} — {L.role}
                            {isConflict && <span className="ml-2 text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">conflict</span>}
                            <LockBadge lock={lk} />
                          </div>
                          <DetailLine proposed={L} />
                        </div>
                      </div>
                      <div className="flex gap-2 items-center">
                        {!lk?.locked || lk?.expired || lk?.isMine === false ? (
                          <button className="ml-2 text-xs px-2 py-0.5 border rounded" onClick={() => onClaim(t)}>Claim</button>
                        ) : (
                          lk?.isMine && <button className="ml-2 text-xs px-2 py-0.5 border rounded" onClick={() => onRelease(t)}>Release</button>
                        )}
                        <button className="bg-green-600 text-white px-3 py-1 rounded" onClick={() => openMerge(t)}>Review / Merge</button>
                        <button className="bg-red-600 text-white px-3 py-1 rounded" onClick={() => leaderId && reject(leaderId)}>Reject</button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>

          {/* Threads */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-semibold">Threads (multiple submissions) <span className="text-sm text-gray-500">({threads.filter(t => (t.relatedCount||0)>0).length})</span></h2>
            </div>
            <ul className="space-y-3">
              {threads.filter(t => (t.relatedCount||0)>0).map((t) => {
                const L = t.leader?.proposed || {};
                const leaderId = t.leader?._id;
                const isConflict = t.leader?.status === "conflict";
                const lk = locks[t.groupKey];
                const open = !!expanded[t.groupKey];

                const children = detail[t.groupKey]?.children || [];
                const threadAllIds = [leaderId, ...children.map((c: any) => c?._id)].filter(Boolean) as string[];
                const threadAllSel = threadAllIds.length > 0 && threadAllIds.every((id) => !!selected[id]);

                return (
                  <li key={t.groupKey} className="border rounded p-4 bg-white">
                    <div className="flex justify-between items-start">
                      <div className="flex items-start gap-3">
                        <input type="checkbox" className="mt-1" checked={!!selected[leaderId]} onChange={() => leaderId && toggleSelect(leaderId)} />
                        <div>
                          <div className="font-semibold">
                            {L.fullName} — {L.role}
                            {isConflict && <span className="ml-2 text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">conflict</span>}
                            <span className="ml-2 text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">related: {t.relatedCount}</span>
                            <LockBadge lock={lk} />
                          </div>
                          <DetailLine proposed={L} />
                        </div>
                      </div>
                      <div className="flex gap-2 items-center">
                        {!lk?.locked || lk?.expired || lk?.isMine === false ? (
                          <button className="ml-2 text-xs px-2 py-0.5 border rounded" onClick={() => onClaim(t)}>Claim</button>
                        ) : (
                          lk?.isMine && <button className="ml-2 text-xs px-2 py-0.5 border rounded" onClick={() => onRelease(t)}>Release</button>
                        )}
                        <button className="text-blue-700 underline" onClick={() => toggleExpand(t.groupKey)}>{open ? "Hide" : "View"} variants</button>
                        <button className="bg-green-600 text-white px-3 py-1 rounded" onClick={() => openMerge(t)}>Review / Merge</button>
                      </div>
                    </div>

                    {open && (
                      <div className="mt-3 flex items-center justify-between text-xs text-gray-700">
                        <label className="flex items-center gap-1">
                          <input type="checkbox" checked={threadAllSel} onChange={(e) => toggleSelectInThread(t.groupKey, e.target.checked)} />
                          Select all in thread
                        </label>
                        <div className="text-gray-500">{children.length > 0 ? `${children.length} variants` : "No child submissions"}</div>
                      </div>
                    )}

                    {open && (
                      <div className="mt-3 border-t pt-3">
                        {children.length ? (
                          <div className="text-sm space-y-2">
                            {children.map((c: any) => {
                              const P = c.proposed || {};
                              const cid = c._id;
                              return (
                                <div key={cid} className="border rounded p-2 bg-gray-50">
                                  <div className="flex justify-between items-start gap-2">
                                    <div className="flex items-start gap-2">
                                      <input type="checkbox" className="mt-1" checked={!!selected[cid]} onChange={() => toggleSelect(cid)} />
                                      <div>
                                        <div className="font-medium">
                                          {P.fullName} — {P.role}
                                          {c.status === "duplicate" && <span className="ml-2 text-xs bg-gray-100 text-gray-700 px-2 rounded">duplicate</span>}
                                        </div>
                                        <div className="text-xs text-gray-600">
                                          {(P.email || "no email")} · {(P.jurisdiction?.city || "")}{P.jurisdiction?.city ? ", " : ""}{P.state}
                                        </div>
                                      </div>
                                    </div>
                                    <div className="flex gap-2 shrink-0">
                                      <button className="text-green-700 underline" onClick={() => approve(cid)}>Approve</button>
                                      <button className="text-red-700 underline" onClick={() => reject(cid)}>Reject</button>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="text-sm text-gray-600">No child submissions yet.</div>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        </Fragment>
      )}

      <ReviewMergeModal open={mergeOpen} onClose={onCloseMerge} leader={mergeLeader} childrenSubs={mergeChildren} />
      <BulkUploadModal open={uploadOpen} onClose={() => setUploadOpen(false)} onDone={load} />
    </div>
  );
}
