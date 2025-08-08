import React from "react";
import { VariantSource } from "../../types/review";
import { FIELDS } from "../../constants/reviewFields";
import { classNames, get, jsonEq } from "../../utils/mergeUtils";

type Props = {
  canonical: any | null;
  variantSources: VariantSource[];
  activeVariantIdx: number;
  setActiveVariantIdx: (i: number) => void;
};

const VariantsList: React.FC<Props> = ({ canonical, variantSources, activeVariantIdx, setActiveVariantIdx }) => {
  return (
    <div className="border rounded">
      <div className="px-3 py-2 text-sm font-medium border-b bg-gray-50">Variants</div>
      <ul className="max-h-64 overflow-auto">
        {variantSources.map((v, i) => {
          const p = v.proposed || {};
          const diffs = FIELDS.filter(f => !jsonEq(get(canonical || {}, f.key), get(p, f.key))).slice(0, 3);
          return (
            <li
              key={v.key}
              className={classNames(
                "px-3 py-2 text-sm cursor-pointer border-b hover:bg-gray-50",
                i === activeVariantIdx && "bg-blue-50"
              )}
              onClick={() => setActiveVariantIdx(i)}
            >
              <div className="font-medium">{p.fullName || "(No name)"} · {p.role || ""}</div>
              <div className="text-xs text-gray-600">
                {v.submission?.submitterEmail || "unknown"} · {new Date(v.submission?.createdAt || v.submission?.submittedAt || Date.now()).toLocaleString()}
              </div>
              {diffs.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {diffs.map(f => (
                    <span key={f.key} className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">
                      {f.label}
                    </span>
                  ))}
                </div>
              )}
            </li>
          );
        })}
      </ul>
      <div className="px-3 py-2 text-xs text-gray-500 border-t">
        ↑/↓ to move, ⏎ to use variant
      </div>
    </div>
  );
};

export default VariantsList;
