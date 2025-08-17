// src/components/review/ReviewMergeModal.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useMergeState } from "../../hooks/useMergeState";
import { FIELDS } from "../../constants/reviewFields";
import VariantsList from "./VariantsList";
import SourceEvidence from "./SourceEvidence";
import DedupeContext from "./DedupeContext";
import FieldMergeSection from "./FieldMergeSection";
import { claimThread, fetchThreadEvents } from "../../services/submissions";
import { classifyMatch, type MatchResult } from "../../lib/matchOfficial";

type Props = {
  open: boolean;
  onClose: () => void;
  leader: any;
  childrenSubs?: any[];
};

type ClassifiedVariant = {
  label: string;
  official: any;
  meta: MatchResult;
};

export default function ReviewMergeModal({ open, onClose, leader, childrenSubs }: Props) {
  if (!open) return null;

  const {
    canonical, leaderProp, isThread,
    variantSources, candidatesByField, selected,
    verify, closeThread, activeVariantIdx,
    setActiveVariantIdx, setVerify, setCloseThread,
    chooseScalar, toggleArrayValue, cycleField, applyVariant,
    approve, reject, markConflict,
  } = useMergeState(true, leader, childrenSubs);

  const [events, setEvents] = useState<any[]>([]);
  const [showHidden, setShowHidden] = useState(false);
  const [compact, setCompact] = useState(true);
  const [submitting, setSubmitting] = useState<"approve"|"reject"|"conflict"|null>(null);
  const [error, setError] = useState<string|null>(null);

  const safeCanonical = canonical ?? {};
  const safeLeaderProp = leaderProp ?? {};
  const safeVariants: Array<{ label: string; official: any }> = Array.isArray(variantSources) ? variantSources : [];

  // Lock body scroll & shortcuts
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); onClose(); }
      else if (e.key === "ArrowDown") { e.preventDefault(); setActiveVariantIdx(i => Math.min(i + 1, Math.max(safeVariants.length - 1, 0))); }
      else if (e.key === "ArrowUp") { e.preventDefault(); setActiveVariantIdx(i => Math.max(i - 1, 0)); }
      else if (e.key === "Enter") { e.preventDefault(); applyVariant(activeVariantIdx); }
    };
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener("keydown", onKey); };
  }, [onClose, activeVariantIdx, safeVariants.length, setActiveVariantIdx, applyVariant]);

  // Activity
  useEffect(() => {
    let active = true;
    (async () => {
      const key = leader?.groupKey;
      if (!key) { if (active) setEvents([]); return; }
      try {
        const { events } = await fetchThreadEvents(key, 10);
        if (active) setEvents(events || []);
      } catch { if (active) setEvents([]); }
    })();
    return () => { active = false; };
  }, [leader?.groupKey]);

  // Keep claim alive
  useEffect(() => {
    const key = leader?.groupKey;
    if (!key) return;
    const id = window.setInterval(() => claimThread(key).catch(() => {}), 10 * 60 * 1000);
    return () => window.clearInterval(id);
  }, [leader?.groupKey]);

  // Classify variants
  const classified = useMemo<ClassifiedVariant[]>(() => {
    return safeVariants.map((v) => {
      const meta = classifyMatch(safeLeaderProp as any, v.official || {});
      return { ...v, meta };
    }).sort((a, b) => b.meta.score - a.meta.score);
  }, [safeVariants, safeLeaderProp]);

  const likely = classified.filter(v => v.meta.cls === "LIKELY_SAME");
  const possible = classified.filter(v => v.meta.cls === "POSSIBLE");
  const hiddenGeo = classified.filter(v => v.meta.cls === "OTHER_GEO");
  // DIFFERENT are simply omitted

  // Prediction banner
  const prediction = useMemo(() => {
    if (likely.length > 0) return { type: "update" as const, text: `Predicted: Update existing record`, detail: likely[0].meta.reason };
    if (possible[0]?.meta.score >= 0.65) return { type: "update" as const, text: `Predicted: Update (tentative)`, detail: possible[0].meta.reason };
    return { type: "new" as const, text: "Predicted: New official", detail: "no strong matches" };
  }, [likely, possible]);

  // Filter candidate values for field sections to only show allowed variants
  const allowedLabels = useMemo(() => {
    const base = [...likely, ...possible].map(v => v.label);
    return showHidden ? [...base, ...hiddenGeo.map(v => v.label)] : base;
  }, [likely, possible, hiddenGeo, showHidden]);

  const filteredCandidatesByField = useMemo(() => {
    const raw = candidatesByField || {};
    const out: Record<string, any[]> = {};
    for (const [k, arr] of Object.entries(raw)) {
      const xs = Array.isArray(arr) ? arr : [];
      out[k] = xs.filter((c: any) => {
        if (!c?.source) return true; // keep values without a specific source label (e.g., leader)
        return allowedLabels.includes(c.source);
      });
    }
    return out;
  }, [candidatesByField, allowedLabels]);

  const selectedVariant = classified[Math.max(0, Math.min(activeVariantIdx, classified.length - 1))];

  // Actions
  const handleApprove = async () => {
    setError(null);
    setSubmitting("approve");
    try { await approve(); onClose(); }
    catch (e: any) { setError(e?.message || "Failed to approve."); }
    finally { setSubmitting(null); }
  };
  const handleReject = async () => {
    const reason = window.prompt("Reject reason (optional):") || undefined;
    if (reason === null) return;
    setError(null);
    setSubmitting("reject");
    try { await reject(reason); onClose(); }
    catch (e: any) { setError(e?.message || "Failed to reject."); }
    finally { setSubmitting(null); }
  };
  const handleConflict = async () => {
    setError(null);
    setSubmitting("conflict");
    try { await markConflict(); onClose(); }
    catch (e: any) { setError(e?.message || "Failed to mark conflict."); }
    finally { setSubmitting(null); }
  };

  const onOverlayMouseDown = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-3 sm:p-4" onMouseDown={onOverlayMouseDown}>
      <div className="bg-white w-full max-w-6xl max-h-[92vh] rounded-xl shadow-2xl overflow-hidden flex flex-col" onMouseDown={(e)=>e.stopPropagation()}>
        {/* Header */}
        <div className="px-4 py-3 border-b bg-white sticky top-0 z-10">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="font-semibold truncate">
                Review — {safeLeaderProp.fullName || "(unknown)"} · {safeLeaderProp.role || ""}
              </div>
              <div className="text-xs text-gray-500 truncate">
                {leader?.submitterEmail ? `submitted by ${leader.submitterEmail}` : ""}{leader?.groupKey ? ` · thread ${leader.groupKey}` : ""}{isThread ? " · multi" : ""}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button className="text-sm px-2 py-1 border rounded" onClick={() => applyVariant(0)}>Use Leader</button>
              {classified.length > 1 && (
                <button className="text-sm px-2 py-1 border rounded" onClick={() => applyVariant(activeVariantIdx)}>
                  Use “{selectedVariant?.label || "Variant"}”
                </button>
              )}
              <button className="text-sm px-2 py-1 border rounded" onClick={onClose}>Close</button>
            </div>
          </div>

          {/* Prediction Banner */}
          <div className={`mt-2 px-3 py-2 rounded text-sm flex items-center justify-between ${prediction.type === "new" ? "bg-amber-50 text-amber-900 border border-amber-200" : "bg-emerald-50 text-emerald-900 border border-emerald-200"}`}>
            <div>
              <span className="font-medium">{prediction.text}</span>
              <span className="ml-2 text-xs opacity-80">({prediction.detail})</span>
            </div>
            <label className="text-xs inline-flex items-center gap-2">
              <input type="checkbox" checked={showHidden} onChange={() => setShowHidden(v => !v)} />
              Show candidates from other locations
            </label>
          </div>

          {/* Header controls */}
          <div className="mt-2 flex items-center gap-3 text-sm">
            <label className="inline-flex items-center gap-2">
              <input type="checkbox" checked={compact} onChange={() => setCompact(v=>!v)} />
              Compact fields
            </label>
            <div className="ml-auto text-xs text-gray-500">↑/↓ pick variant, Enter apply · Esc close</div>
          </div>
        </div>

        {/* Content */}
        <div className="grid grid-cols-12 gap-4 p-4 overflow-y-auto">
          {/* Left rail */}
          <aside className="col-span-12 lg:col-span-4 space-y-3">
            <VariantsList
              activeVariantIdx={activeVariantIdx}
              setActiveVariantIdx={setActiveVariantIdx}
              likely={likely}
              possible={possible}
              hiddenGeo={hiddenGeo}
              showHidden={showHidden}
              setShowHidden={setShowHidden}
            />

            <details className="border rounded">
              <summary className="px-3 py-2 text-sm font-medium bg-gray-50 cursor-pointer">Context & Evidence</summary>
              <div className="p-3 space-y-3">
                <SourceEvidence leader={leader} />
                <DedupeContext leader={leader} />
              </div>
            </details>

            <div className="border rounded">
              <div className="px-3 py-2 text-sm font-medium border-b bg-gray-50">Activity</div>
              <ul className="p-3 space-y-2 text-sm">
                {events.length === 0 ? (
                  <li className="text-gray-600">No recent activity.</li>
                ) : events.map((ev) => (
                  <li key={ev._id} className="border rounded p-2">
                    <div className="text-xs text-gray-500">{new Date(ev.createdAt).toLocaleString()}</div>
                    <div className="font-medium">{ev.action}</div>
                    <div className="text-gray-700">{ev.summary || "-"}</div>
                    <div className="text-xs text-gray-500">{ev.actorEmail} · {ev.actorRole}</div>
                  </li>
                ))}
              </ul>
            </div>
          </aside>

          {/* Right: fields */}
          <section className="col-span-12 lg:col-span-8 space-y-3">
            {/* Field sections filtered to allowed variants */}
            {FIELDS.map((f) => (
              <FieldMergeSection
                key={f.key}
                field={f}
                canonical={safeCanonical}
                selected={selected || {}}
                candidatesByField={filteredCandidatesByField}
                chooseScalar={chooseScalar}
                toggleArrayValue={toggleArrayValue}
                cycleField={cycleField}
                compact={compact}
              />
            ))}

            {/* Verify/Close toggles */}
            <div className="flex items-center gap-6 text-sm border-t pt-3">
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" checked={!!verify} onChange={() => setVerify(!verify)} />
                Approve & verify official
              </label>
              {isThread && (
                <label className="inline-flex items-center gap-2">
                  <input type="checkbox" checked={!!closeThread} onChange={() => setCloseThread(!closeThread)} />
                  Close thread (mark others superseded)
                </label>
              )}
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t bg-white sticky bottom-0 z-10 flex items-center justify-between">
          {error ? (
            <div className="text-sm text-red-600">{error}</div>
          ) : (
            <div className="text-xs text-gray-500">
              {prediction.type === "update"
                ? "Looks like an update to an existing record. Approve when your field picks look right."
                : "Looks like a new official. Approve to create a new record."}
            </div>
          )}
          <div className="flex gap-2">
            <button className="px-3 py-1 border rounded disabled:opacity-50" onClick={handleReject} disabled={!!submitting}>
              {submitting === "reject" ? "Rejecting…" : "Reject"}
            </button>
            <button className="px-3 py-1 border rounded disabled:opacity-50" onClick={handleConflict} disabled={!!submitting}>
              {submitting === "conflict" ? "Marking…" : "Mark conflict"}
            </button>
            <button className="px-3 py-1 rounded bg-green-600 text-white disabled:opacity-50" onClick={handleApprove} disabled={!!submitting}>
              {submitting === "approve" ? "Approving…" : "Approve"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
