// src/components/review/VariantsList.tsx
import React from "react";

type Variant = {
  label: string;
  official: any; // minimal: fullName, role, state, jurisdiction?.city
  meta?: { score?: number; reason?: string; cls?: string };
};

type Props = {
  activeVariantIdx: number;
  setActiveVariantIdx: (i: number) => void;

  // NEW: grouped lists
  likely: Variant[];
  possible: Variant[];
  hiddenGeo: Variant[];           // other cities/counties, hidden by default
  showHidden: boolean;
  setShowHidden: (b: boolean) => void;
};

export default function VariantsList({
  activeVariantIdx, setActiveVariantIdx,
  likely, possible, hiddenGeo, showHidden, setShowHidden
}: Props) {
  const Section = ({ title, items, offset }: { title: string; items: Variant[]; offset: number }) => (
    <div className="border rounded">
      <div className="px-3 py-1.5 text-xs font-semibold tracking-wide text-gray-600 bg-gray-50">{title}</div>
      {items.length === 0 ? (
        <div className="px-3 py-2 text-sm text-gray-500">None</div>
      ) : (
        <ul className="divide-y">
          {items.map((v, i) => {
            const idx = offset + i; // global index for ReviewMergeModal to use applyVariant(idx)
            const o = v.official || {};
            const sel = idx === activeVariantIdx;
            return (
              <li key={idx}>
                <button
                  className={`w-full text-left px-3 py-2 ${sel ? "bg-emerald-50" : "hover:bg-gray-50"}`}
                  onClick={() => setActiveVariantIdx(idx)}
                  title={v.meta?.reason || ""}
                >
                  <div className="font-medium text-sm truncate">{o.fullName || v.label || "(unknown)"}</div>
                  <div className="text-xs text-gray-600 truncate">
                    {o.role || "—"} · {o.jurisdiction?.city ? `${o.jurisdiction.city}, ` : ""}{o.state || ""}
                  </div>
                  {v.meta?.reason && (
                    <div className="text-[11px] text-gray-500 mt-0.5">{v.meta.reason}</div>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );

  const likelyOffset = 0;
  const possibleOffset = likely.length;
  const hiddenOffset = likely.length + possible.length;

  return (
    <div className="space-y-3">
      <Section title="Likely match" items={likely} offset={likelyOffset} />
      <Section title="Possible matches" items={possible} offset={possibleOffset} />

      <div className="flex items-center justify-between">
        <div className="text-xs text-gray-500">Other locations (usually different person)</div>
        <button className="text-xs underline" onClick={() => setShowHidden(!showHidden)}>
          {showHidden ? "Hide" : "Show"} {hiddenGeo.length}
        </button>
      </div>
      {showHidden && <Section title="Hidden – other cities/counties" items={hiddenGeo} offset={hiddenOffset} />}
    </div>
  );
}
