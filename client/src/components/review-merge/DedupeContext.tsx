import React from "react";

const DedupeContext: React.FC<{ leader: any }> = ({ leader }) => {
  return (
    <div className="border rounded">
      <div className="px-3 py-2 text-sm font-medium border-b bg-gray-50">Dedupe context</div>
      <div className="p-3 text-sm space-y-1">
        <div><span className="text-gray-600">Method:</span> {leader?.dedupe?.method || "n/a"}</div>
        <div><span className="text-gray-600">Score:</span> {typeof leader?.dedupe?.score === "number" ? leader.dedupe.score.toFixed(2) : "n/a"}</div>
        {leader?.targetOfficialId && (
          <div className="text-xs">Matched official id: <code>{leader.targetOfficialId}</code></div>
        )}
        {Array.isArray(leader?.dedupe?.candidates) && leader.dedupe.candidates.length > 0 && (
          <details className="text-xs">
            <summary className="cursor-pointer">Top candidates</summary>
            <pre className="bg-gray-50 p-2 rounded overflow-auto">{JSON.stringify(leader.dedupe.candidates, null, 2)}</pre>
          </details>
        )}
      </div>
    </div>
  );
};

export default DedupeContext;
