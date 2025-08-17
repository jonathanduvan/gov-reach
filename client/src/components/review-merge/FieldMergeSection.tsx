import React, { useMemo, useState } from "react";

type Props = {
  field: { key: string; label: string; type?: "string" | "array" | "object" };
  canonical: any; // can be null/undefined; we guard
  selected: Record<string, any> | undefined;
  candidatesByField: Record<string, Array<{ value: any; label?: string; source?: string }>> | undefined;
  chooseScalar: (key: string, value: any) => void;
  toggleArrayValue: (key: string, value: any) => void;
  cycleField: (key: string) => void;
  compact?: boolean;
};

function renderValue(v: any) {
  if (v == null || v === "") return <span className="text-gray-400">—</span>;
  if (Array.isArray(v)) return v.length ? v.join(", ") : <span className="text-gray-400">—</span>;
  if (typeof v === "object") return <code className="text-xs">{JSON.stringify(v)}</code>;
  return String(v);
}

export default function FieldMergeSection({
  field, canonical, selected, candidatesByField,
  chooseScalar, toggleArrayValue, compact = true
}: Props) {
  const key = field.key;
  const safeSelected = selected ?? {};
  const safeCanonical = canonical ?? {};
  const candidates = (candidatesByField?.[key] ?? []) as Array<{ value: any; label?: string; source?: string }>;

  const currentRaw = safeSelected.hasOwnProperty(key) ? safeSelected[key] : safeCanonical[key];
  const current = currentRaw;

  const [expanded, setExpanded] = useState(false);
  const longText = typeof current === "string" && current.length > 180;

  const chipItems = useMemo(
    () =>
      candidates.map((c) => ({
        value: c.value,
        label: c.label ?? (typeof c.value === "string" ? c.value : JSON.stringify(c.value)),
        source: c.source
      })),
    [candidates]
  );

  const hasCandidates = chipItems.length > 0;
  const isArray = Array.isArray(current);

  return (
    <div className={`border rounded ${compact ? "p-2" : "p-3"}`}>
      {/* Header + current value */}
      <div className="flex items-start gap-2 justify-between">
        <div className="min-w-0">
          <div className="text-[11px] uppercase tracking-wide text-gray-500">{field.label}</div>
          <div className={`text-sm whitespace-pre-wrap break-words ${compact ? "max-h-16 overflow-y-auto" : ""}`}>
            {renderValue(current)}
          </div>
          {longText && (
            <button className="text-xs text-blue-600 mt-1" onClick={() => setExpanded(v => !v)}>
              {expanded ? "Collapse" : "Expand"}
            </button>
          )}
        </div>
        {hasCandidates && <div className="text-[11px] text-gray-500 shrink-0">{chipItems.length} alt.</div>}
      </div>

      {/* Candidate chips */}
      {hasCandidates && (
        <div className="mt-2 flex flex-wrap gap-2">
          {chipItems.map((c, idx) => {
            const isActive = isArray
              ? (Array.isArray(current) && current.includes(c.value))
              : current === c.value;

            const onSelect = isArray
              ? () => toggleArrayValue(key, c.value)
              : () => chooseScalar(key, c.value);

            return (
              <button
                key={idx}
                type="button"
                onClick={onSelect}
                className={`text-xs px-2 py-1 rounded-full border ${
                  isActive ? "bg-emerald-50 border-emerald-300 text-emerald-800" : "hover:bg-gray-50"
                }`}
                title={c.source ? `Source: ${c.source}` : "Candidate value"}
              >
                {c.label.length > 80 ? c.label.slice(0, 77) + "…" : c.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
