import React from "react";

const SourceEvidence: React.FC<{ leader: any }> = ({ leader }) => {
  return (
    <div className="border rounded">
      <div className="px-3 py-2 text-sm font-medium border-b bg-gray-50">Source & Evidence</div>
      <div className="p-3 text-sm space-y-2">
        <div><span className="text-gray-600">Submitter:</span> {leader?.submitterEmail || "unknown"} ({leader?.submitterRole || "role?"})</div>
        {leader?.note && <div><span className="text-gray-600">Reviewer note:</span> {leader.note}</div>}
        {leader?.proposed?.sourceNote && (
          <div><span className="text-gray-600">Source note:</span> {leader.proposed.sourceNote}</div>
        )}
        {leader?.sourceAttribution?.originalRaw && (
          <details className="text-xs">
            <summary className="cursor-pointer text-gray-700">Original raw</summary>
            <pre className="bg-gray-50 p-2 rounded overflow-auto">
              {JSON.stringify(leader.sourceAttribution.originalRaw, null, 2)}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
};

export default SourceEvidence;
