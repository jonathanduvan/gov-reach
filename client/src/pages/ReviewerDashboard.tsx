import React, { useEffect, useState } from "react";
import { useUser } from "../context/UserContext";
import { fetchThreads, fetchThreadDetail, resolveSubmission } from "../services/submissions";
import ReviewMergeModal from "../components/review-merge/ReviewMergeModal";
import { getThreadLock, claimThread, releaseThread } from "../services/submissions";

type Thread = {
  groupKey: string;
  leader: any;
  relatedCount: number;
  variants: Array<{ proposed: any; submitterId: string; submittedAt?: string }>;
  latestAt: string;
};


const ReviewerDashboard: React.FC = () => {
  const { isAdmin, isPartner } = useUser();
  const [status, setStatus] = useState<"pending" | "conflict" | "all">("pending");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [detail, setDetail] = useState<Record<string, any>>({}); // groupKey -> detail

  const [mergeOpen, setMergeOpen] = useState(false);
  const [mergeLeader, setMergeLeader] = useState<any | null>(null);
  const [mergeChildren, setMergeChildren] = useState<any[] | undefined>(undefined);

  const [locks, setLocks] = useState<Record<string, any>>({});

  async function refreshLock(groupKey: string) {
    try {
      const d = await getThreadLock(groupKey);
      setLocks(prev => ({ ...prev, [groupKey]: d }));
    } catch {}
  }
  useEffect(() => { threads.forEach(t => refreshLock(t.groupKey)); }, [threads]);

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchThreads({ status, q, limit: 50 });
      setThreads(data.threads || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  async function onClaim(t: any) {
  try {
    await claimThread(t.groupKey);
    await refreshLock(t.groupKey);
  } catch (e: any) {
    alert(e.message || "Failed to claim");
  }
}

  async function openMerge(t: any) {
    // must own or claim if locked
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

  useEffect(() => {
    if (!isAdmin && !isPartner) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, q, isAdmin, isPartner]);

  const toggleExpand = async (groupKey: string) => {
    setExpanded((prev) => ({ ...prev, [groupKey]: !prev[groupKey] }));
    if (!detail[groupKey]) {
      try {
        const d = await fetchThreadDetail(groupKey);
        setDetail((prev) => ({ ...prev, [groupKey]: d }));
      } catch (e) {
        console.error(e);
      }
    }
  };

  const approve = async (submissionId: string) => {
    if (!confirm("Approve this submission?")) return;
    await resolveSubmission(submissionId, "approve", { mergeStrategy: "merge" });
    await load();
  };

  const reject = async (submissionId: string) => {
    if (!confirm("Reject this submission?")) return;
    await resolveSubmission(submissionId, "reject", { resolution: "not applicable" });
    await load();
  };

  // after approve/reject, reload list & close modal (optional)
  const onCloseMerge = async () => {
    setMergeOpen(false);
    setMergeLeader(null);
    setMergeChildren(undefined);
    await load();
  };

  if (!isAdmin && !isPartner) {
    return <div className="p-6 text-red-700">You don’t have permission to review submissions.</div>;
  }

  const singles = threads.filter((t) => (t.relatedCount || 0) === 0);
  const groups  = threads.filter((t) => (t.relatedCount || 0) > 0);

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Review Submissions</h1>

      <div className="flex gap-2 items-center mb-4">
        <select value={status} onChange={e => setStatus(e.target.value as any)} className="border p-2 rounded">
          <option value="pending">Pending</option>
          <option value="conflict">Conflict</option>
          <option value="all">All</option>
        </select>
        <input
          className="border p-2 rounded flex-1"
          placeholder="Search name, email, role…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {loading ? (
        <div>Loading…</div>
      ) : (
        <>
          {/* Singles */}
          <section className="mb-8">
            <h2 className="text-lg font-semibold mb-2">
              Single submissions <span className="text-sm text-gray-500">({singles.length})</span>
            </h2>
            {singles.length === 0 ? (
              <div className="text-gray-600 text-sm">No single submissions.</div>
            ) : (
              <ul className="space-y-3">
                {singles.map((t) => {
                  const L = t.leader?.proposed || {};
                  const isConflict = t.leader?.status === "conflict";
                  return (
                    <li key={t.groupKey} className="border rounded p-4 bg-white">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-semibold">
                            {L.fullName} — {L.role}
                            {isConflict && (
                              <span className="ml-2 text-yellow-800 text-xs bg-yellow-100 px-2 py-0.5 rounded">
                                conflict
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-gray-600">
                            {L.email || "no email"} · {L.jurisdiction?.city || L.city}, {L.state} · level: {L.level}
                          </div>
                        </div>
                        <div className="flex gap-2 items-center">
                          {(() => {
                              const lk = locks[t.groupKey];
                              return (
                                <>
                                  {lk?.locked && !lk?.expired && (
                                    <span className="ml-2 text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                                      {lk.isMine ? `Claimed by you.` : `Locked by ${lk.lockedBy}`}
                                    </span>
                                  )}
                                  {(!lk?.locked || lk?.expired || lk?.isMine === false) && (
                                    <button
                                      className="ml-2 text-xs px-2 py-0.5 border rounded"
                                      onClick={() => onClaim(t)}
                                    >
                                      Claim for review
                                    </button>
                                  )}
                                  {/* Release if it's mine (or you can also show this for admins) */}
                                  {lk?.locked && lk?.isMine && (
                                    <button
                                      className="ml-2 text-xs px-2 py-0.5 border rounded"
                                      onClick={async () => {
                                        if (!confirm("Release this lock so others can review?")) return;
                                        await releaseThread(t.groupKey);
                                        await refreshLock(t.groupKey);
                                      }}
                                    >
                                      Release
                                    </button>
                                  )}
                                </>
                              );
                            })()}
                          <button
                            className="bg-green-600 text-white px-3 py-1 rounded"
                            onClick={() => openMerge(t)}
                          >
                            Review / Merge
                          </button>
                          <button
                            className="bg-red-600 text-white px-3 py-1 rounded"
                            onClick={() => reject(t.leader._id)}
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* Threads */}
          <section>
            <h2 className="text-lg font-semibold mb-2">
              Threads (multiple submissions) <span className="text-sm text-gray-500">({groups.length})</span>
            </h2>
            {groups.length === 0 ? (
              <div className="text-gray-600 text-sm">No threads.</div>
            ) : (
              <ul className="space-y-3">
                {groups.map((t) => {
                  const L = t.leader?.proposed || {};
                  const isConflict = t.leader?.status === "conflict";
                  return (
                    <li key={t.groupKey} className="border rounded p-4 bg-white">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-semibold">
                            {L.fullName} — {L.role}
                            {isConflict && (
                              <span className="ml-2 text-yellow-800 text-xs bg-yellow-100 px-2 py-0.5 rounded">
                                conflict
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-gray-600">
                            {L.email || "no email"} · {L.jurisdiction?.city || L.city}, {L.state} · level: {L.level} · related: {t.relatedCount}
                          </div>
                        </div>
                        <div className="flex gap-2 items-center">
                           {(() => {
                            const lk = locks[t.groupKey];
                            return (
                              <>
                                {lk?.locked && !lk?.expired && (
                                  <span className="ml-2 text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                                    {lk.isMine ? `Claimed by you` : `Locked by ${lk.lockedBy}`}
                                  </span>
                                )}
                                {(!lk?.locked || lk?.expired || lk?.isMine === false) && (
                                  <button
                                    className="ml-2 text-xs px-2 py-0.5 border rounded"
                                    onClick={() => onClaim(t)}
                                  >
                                    Claim for review
                                  </button>
                                )}
                                {/* Release if it's mine (or you can also show this for admins) */}
                                {lk?.locked && lk?.isMine && (
                                  <button
                                    className="ml-2 text-xs px-2 py-0.5 border rounded"
                                    onClick={async () => {
                                      if (!confirm("Release this lock so others can review?")) return;
                                      await releaseThread(t.groupKey);
                                      await refreshLock(t.groupKey);
                                    }}
                                  >
                                    Release
                                  </button>
                                )}
                              </>
                            );
                          })()}
                          <button
                            className="text-blue-700 underline"
                            onClick={() => toggleExpand(t.groupKey)}
                          >
                            {expanded[t.groupKey] ? "Hide" : "View"} variants
                          </button>
                          <button
                            className="bg-green-600 text-white px-3 py-1 rounded"
                            onClick={() => openMerge(t)}
                          >
                            Approve leader
                          </button>
                        </div>
                      </div>

                      {expanded[t.groupKey] && (
                        <div className="mt-3 border-t pt-3">
                          {/* leader variant */}
                          <div className="text-sm mb-2">
                            <strong>Leader</strong>: {L.fullName} · {L.role} · {L.email || "no email"}
                          </div>
                          {/* children (full detail) */}
                          {detail[t.groupKey]?.children?.length ? (
                            <div className="text-sm space-y-2">
                              {detail[t.groupKey].children.map((c: any) => (
                                <div key={c._id} className="border rounded p-2">
                                  <div className="flex justify-between">
                                    <div>
                                      <div className="font-medium">
                                        {c.proposed?.fullName} — {c.proposed?.role}
                                        {c.status === "duplicate" && (
                                          <span className="ml-2 text-xs text-gray-700 bg-gray-100 px-2 rounded">
                                            duplicate
                                          </span>
                                        )}
                                      </div>
                                      <div className="text-xs text-gray-600">
                                        {c.proposed?.email || "no email"} · {c.proposed?.jurisdiction?.city}, {c.proposed?.state}
                                      </div>
                                    </div>
                                    <div className="flex gap-2">
                                      <button
                                        className="text-green-700 underline"
                                        onClick={() =>
                                          resolveSubmission(c._id, "approve", { mergeStrategy: "merge" }).then(() =>
                                            toggleExpand(t.groupKey)
                                          )
                                        }
                                      >
                                        Approve this
                                      </button>
                                      <button
                                        className="text-red-700 underline"
                                        onClick={() =>
                                          resolveSubmission(c._id, "reject", { resolution: "not applicable" }).then(() =>
                                            toggleExpand(t.groupKey)
                                          )
                                        }
                                      >
                                        Reject
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              ))}
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
            )}
          </section>
        </>
      )}
      <ReviewMergeModal
        open={mergeOpen}
        onClose={onCloseMerge}
        leader={mergeLeader}
        childrenSubs={mergeChildren}
      />
    </div>
  );
};

export default ReviewerDashboard;
