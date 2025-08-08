import React from "react";
import { formatPhones, toIssueLabel } from "../../utils/mergeUtils";

type Props = {
  canonical: any | null;
  selectedVariant: { label: string; proposed: any } | undefined;
};

const SideBySideSummary: React.FC<Props> = ({ canonical, selectedVariant }) => {
  const selectedProp = selectedVariant?.proposed || {};
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="border rounded">
        <div className="px-3 py-2 text-sm font-medium border-b bg-gray-50">Current</div>
        <div className="p-3 text-sm">
          {canonical ? (
            <>
              <div className="font-medium">{canonical.fullName} · {canonical.role}</div>
              <div className="text-gray-600">{canonical.email || "no email"} · {canonical.jurisdiction?.city || ""}, {canonical.state} · {canonical.level}</div>
              <div className="mt-1 text-xs text-gray-600">Issues: {toIssueLabel(canonical.issues || []) || "—"}</div>
              <div className="mt-1 text-xs text-gray-600">Phones: {formatPhones(canonical.phoneNumbers) || "—"}</div>
            </>
          ) : (
            <div className="text-gray-600">New official</div>
          )}
        </div>
      </div>
      <div className="border rounded">
        <div className="px-3 py-2 text-sm font-medium border-b bg-gray-50">Selected Variant — {selectedVariant?.label}</div>
        <div className="p-3 text-sm">
          <div className="font-medium">{selectedProp.fullName || "—"} · {selectedProp.role || "—"}</div>
          <div className="text-gray-600">{selectedProp.email || "no email"} · {selectedProp.jurisdiction?.city || ""}, {selectedProp.state || ""} · {selectedProp.level || ""}</div>
          <div className="mt-1 text-xs text-gray-600">Issues: {toIssueLabel(selectedProp.issues || []) || "—"}</div>
          <div className="mt-1 text-xs text-gray-600">Phones: {formatPhones(selectedProp.phoneNumbers) || "—"}</div>
        </div>
      </div>
    </div>
  );
};

export default SideBySideSummary;
