import React, { useState } from "react";
import { CandidatesByField, FieldDef, Phone } from "../../types/review";
import { classNames, ensureArray, get, jsonEq } from "../../utils/mergeUtils";

type Props = {
  field: FieldDef;
  canonical: any | null;
  selected: Record<string, any>;
  candidatesByField: CandidatesByField;
  chooseScalar: (path: string, value: any) => void;
  toggleArrayValue: (path: string, value: any, on: boolean) => void;
  cycleField: (fieldKey: string, dir: 1 | -1) => void;
};

const FieldMergeSection: React.FC<Props> = ({
  field, canonical, selected, candidatesByField, chooseScalar, toggleArrayValue, cycleField
}) => {
  const cands = candidatesByField[field.key] || [];
  const canonicalVal = get(canonical || {}, field.key);
  const currentVal = get(selected, field.key);
  const [newIssue, setNewIssue] = useState("");

  if (field.type === "text") {
    return (
      <div className="border rounded">
        <div className="px-3 py-2 flex items-center justify-between border-b bg-gray-50">
          <div className="text-sm font-medium">{field.label}</div>
          <div className="flex items-center gap-2 text-xs">
            <button className="px-2 py-0.5 border rounded" onClick={() => cycleField(field.key, -1)}>◀ Prev</button>
            <button className="px-2 py-0.5 border rounded" onClick={() => cycleField(field.key, +1)}>Next ▶</button>
            <span className="text-gray-500">pick from {cands.length} sources</span>
          </div>
        </div>
        <div className="p-3 grid grid-cols-2 gap-3 text-sm">
          <div>
            <div className="text-xs text-gray-500 mb-1">Current</div>
            <div className="p-2 bg-gray-50 rounded">{String(canonicalVal ?? "—")}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500 mb-1">Selected</div>
            <input
              className="border rounded px-2 py-1 w-full"
              value={currentVal ?? ""}
              onChange={(e) => chooseScalar(field.key, e.target.value)}
              placeholder={`Enter ${field.label.toLowerCase()}`}
            />
            <div className="mt-2 text-xs text-gray-600">
              Candidates:&nbsp;
              {cands.map((c, i) => (
                <button
                  key={i}
                  className={classNames(
                    "px-2 py-0.5 border rounded mr-1 mb-1",
                    jsonEq(currentVal, c.value) && "bg-blue-600 text-white border-blue-600"
                  )}
                  onClick={() => chooseScalar(field.key, c.value)}
                  title={c.source}
                >
                  {typeof c.value === "object" ? JSON.stringify(c.value) : String(c.value)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (field.key === "issues") {
    const issues: string[] = ensureArray(currentVal);
    return (
      <div className="border rounded">
        <div className="px-3 py-2 text-sm font-medium border-b bg-gray-50">{field.label}</div>
        <div className="p-3 text-sm">
          <div className="text-xs text-gray-600 mb-2">
            Candidates:&nbsp;
            {cands.map((c, i) => (
              <span key={i} className="inline-block px-2 py-0.5 border rounded mr-1 mb-1 bg-gray-50">
                [{c.source}] {Array.isArray(c.value) ? c.value.join(", ") : String(c.value)}
              </span>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {issues.map((v, i) => (
              <span key={i} className="inline-flex items-center text-xs bg-gray-100 px-2 py-1 rounded">
                {v} <button className="ml-2 text-gray-600" onClick={() => {
                  const next = issues.slice(); next.splice(i, 1);
                  chooseScalar("issues", next);
                }}>✕</button>
              </span>
            ))}
          </div>
          <div className="mt-2 flex items-center gap-2">
            <input
              className="border rounded px-2 py-1 text-sm"
              placeholder="Add issue (name)"
              value={newIssue}
              onChange={(e) => setNewIssue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addIssue()}
            />
            <button className="text-sm px-2 py-1 border rounded" onClick={addIssue}>Add</button>
          </div>
        </div>
      </div>
    );

    function addIssue() {
      const v = newIssue.trim();
      if (!v) return;
      const next = Array.from(new Set([...(issues || []), v]));
      chooseScalar("issues", next);
      setNewIssue("");
    }
  }

  // phoneNumbers editor
  const phones: Phone[] = ensureArray(currentVal);
  return (
    <div className="border rounded">
      <div className="px-3 py-2 text-sm font-medium border-b bg-gray-50">{field.label}</div>
      <div className="p-3 text-sm">
        <div className="text-xs text-gray-600 mb-2">
          Candidates:&nbsp;
          {cands.map((c, i) => {
            const arr = Array.isArray(c.value) ? c.value : [];
            return (
              <button
                key={i}
                className="inline-block px-2 py-0.5 border rounded mr-1 mb-1 bg-gray-50"
                onClick={() => arr.forEach(v => toggleArrayValue("phoneNumbers", v, true))}
                title={c.source}
              >
                [{c.source}] {arr.map((p: Phone) => p.number).join(", ") || "—"}
              </button>
            );
          })}
        </div>

        <div className="border rounded">
          <div className="px-2 py-1 text-xs text-gray-600 border-b bg-gray-50">Selected phone numbers (reorder/edit)</div>
          <div className="p-2 space-y-2">
            {phones.map((p, i) => (
              <PhoneRow
                key={i}
                phone={p}
                onChange={(patch) => {
                  const next = phones.slice();
                  next[i] = { ...(next[i] || {}), ...patch };
                  (next as any)[i] = next[i];
                  const out = phones.slice(); out[i] = next[i];
                  // propagate
                  const final = phones.slice(); final[i] = next[i];
                }}
                onChangeAll={(next) => {
                  const arr = phones.slice(); arr[i] = next; 
                  // set whole array
                }}
                onMove={(dir) => {
                  const j = i + dir;
                  if (j < 0 || j >= phones.length) return;
                  const arr = phones.slice();
                  [arr[i], arr[j]] = [arr[j], arr[i]];
                  // set array
                }}
                onRemove={() => {
                  const arr = phones.slice(); arr.splice(i, 1);
                  // set array
                }}
              />
            ))}
            <button className="text-sm px-2 py-1 border rounded" onClick={() => {
              const arr = phones.slice(); arr.push({ number: "", label: "office", priority: 100 });
              // set array
            }}>+ Add phone</button>
          </div>
        </div>
      </div>
    </div>
  );
};

const PhoneRow: React.FC<{
  phone: Phone;
  onChange: (patch: Partial<Phone>) => void;
  onChangeAll: (next: Phone) => void;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
}> = ({ phone, onChange, onMove, onRemove }) => {
  return (
    <div className="grid grid-cols-12 gap-2 items-center">
      <div className="col-span-5 flex gap-2">
        <button className="px-1 border rounded" title="Move up" onClick={() => onMove(-1)}>↑</button>
        <button className="px-1 border rounded" title="Move down" onClick={() => onMove(+1)}>↓</button>
        <input
          className="flex-1 border rounded px-2 py-1 text-sm"
          placeholder="+19545551234"
          value={phone.number || ""}
          onChange={e => onChange({ number: e.target.value })}
        />
      </div>
      <select
        className="col-span-3 border rounded px-2 py-1 text-sm"
        value={phone.label || "office"}
        onChange={e => onChange({ label: e.target.value })}
      >
        {["office","district","capitol","scheduler","press","other"].map(opt => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
      <input
        className="col-span-2 border rounded px-2 py-1 text-sm"
        type="number"
        placeholder="prio"
        value={typeof phone.priority === "number" ? phone.priority : 100}
        onChange={e => onChange({ priority: Number(e.target.value) })}
      />
      <button className="col-span-2 text-xs px-2 py-1 border rounded" onClick={onRemove}>Remove</button>
    </div>
  );
};

export default FieldMergeSection;
