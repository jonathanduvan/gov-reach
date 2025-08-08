import React, { useEffect } from "react";
import { useMergeState } from "../../hooks/useMergeState";
import { FIELDS } from "../../constants/reviewFields";
import VariantsList from "./VariantsList";
import SideBySideSummary from "./SideBySideSummary";
import SourceEvidence from "./SourceEvidence";
import DedupeContext from "./DedupeContext";
import FieldMergeSection from "./FieldMergeSection";

type Props = {
  open: boolean;
  onClose: () => void;
  leader: any;
  childrenSubs?: any[];
};

const ReviewMergeModal: React.FC<Props> = ({ open, onClose, leader, childrenSubs }) => {
  const {
    canonical, leaderProp, isThread,
    variantSources, candidatesByField, selected,
    verify, closeThread, activeVariantIdx,
    setActiveVariantIdx, setVerify, setCloseThread,
    chooseScalar, toggleArrayValue, cycleField, applyVariant,
    approve, reject, markConflict,
  } = useMergeState(open, leader, childrenSubs);

  // keyboard hooks (↑/↓/Enter) kept inside the hook? If not, wire here:
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") { e.preventDefault(); setActiveVariantIdx(Math.min(activeVariantIdx + 1, variantSources.length - 1)); }
      else if (e.key === "ArrowUp") { e.preventDefault(); setActiveVariantIdx(Math.max(activeVariantIdx - 1, 0)); }
      else if (e.key === "Enter") { e.preventDefault(); applyVariant(activeVariantIdx); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, activeVariantIdx, variantSources.length, setActiveVariantIdx, applyVariant]);

  if (!open) return null;

  const selectedVariant = variantSources[activeVariantIdx];

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white max-w-6xl w-full rounded shadow-lg overflow-hidden">
        {/* Sticky header */}
        <div className="px-4 py-3 border-b sticky top-0 bg-white z-10 flex items-center justify-between">
          <div className="font-semibold">
            Review & Merge — {leaderProp.fullName || "(unknown)"} · {leaderProp.role || ""}
            <span className="ml-2 text-xs text-gray-500">{leader?.submitterEmail ? `submitted by ${leader.submitterEmail}` : ""}</span>
          </div>
          <div className="flex gap-2">
            <button className="text-sm px-2 py-1 border rounded" onClick={() => applyVariant(0)}>Use Leader</button>
            {variantSources.length > 1 && (
              <button className="text-sm px-2 py-1 border rounded" onClick={() => applyVariant(activeVariantIdx)}>
                Use {selectedVariant?.label}
              </button>
            )}
            <button className="text-sm px-2 py-1 border rounded" onClick={onClose}>Close</button>
          </div>
        </div>

        {/* Main layout */}
        <div className="grid grid-cols-12 gap-4 p-4">
          {/* Left column */}
          <aside className="col-span-4 space-y-4">
            <VariantsList
              canonical={canonical}
              variantSources={variantSources}
              activeVariantIdx={activeVariantIdx}
              setActiveVariantIdx={setActiveVariantIdx}
            />
            <SourceEvidence leader={leader} />
            <DedupeContext leader={leader} />
          </aside>

          {/* Right column */}
          <section className="col-span-8 space-y-4">
            <SideBySideSummary canonical={canonical} selectedVariant={selectedVariant} />
            {FIELDS.map((f) => (
              <FieldMergeSection
                key={f.key}
                field={f}
                canonical={canonical}
                selected={selected}
                candidatesByField={candidatesByField}
                chooseScalar={chooseScalar}
                toggleArrayValue={toggleArrayValue}
                cycleField={cycleField}
              />
            ))}

            {/* Actions */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 text-sm">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={verify} onChange={() => setVerify(!verify)} />
                  Approve & verify official
                </label>
                {!!isThread && (
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={closeThread} onChange={() => setCloseThread(!closeThread)} />
                    Close thread (mark others as superseded)
                  </label>
                )}
              </div>
              <div className="flex gap-2">
                <button className="px-3 py-1 border rounded" onClick={() => reject(prompt("Reject reason?") || undefined)}>Reject</button>
                <button className="px-3 py-1 border rounded" onClick={markConflict}>Mark as Conflict</button>
                <button className="px-3 py-1 rounded bg-green-600 text-white" onClick={() => approve()}>Approve</button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default ReviewMergeModal;
