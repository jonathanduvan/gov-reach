// src/components/SubmissionCard.tsx
import React from "react";
import { voteSubmission, resolveSubmission } from "../services/submissions";
import { useUser } from "../context/UserContext";

type Props = {
  submission: any;
  onUpdated?: () => void;
};

const SubmissionCard: React.FC<Props> = ({ submission, onUpdated }) => {
  const { user } = useUser();
  const isReviewer = user?.role === "admin" || user?.role === "partner";

  const handleVote = async (type: "up" | "down") => {
    if (!user) return;
    await voteSubmission(submission._id, type, user.id);
    onUpdated?.();
  };

  const handleApprove = async () => {
    if (!user) return;
    await resolveSubmission(submission._id, {
      action: "approve",
      verifierId: user.id,
      mergeStrategy: "merge",
      resolution: "Approved via reviewer dashboard",
    });
    onUpdated?.();
  };

  const handleReject = async () => {
    if (!user) return;
    await resolveSubmission(submission._id, {
      action: "reject",
      verifierId: user.id,
      resolution: "Rejected via reviewer dashboard",
    });
    onUpdated?.();
  };

  return (
    <div className="border rounded p-4 bg-white shadow-sm mb-3">
      <div className="flex justify-between">
        <div>
          <div className="font-semibold">{submission.proposed.fullName || "Unnamed"}</div>
          <div className="text-xs text-gray-600">
            Submitted by {submission.submitterEmail} as {submission.type} on{" "}
            {new Date(submission.createdAt).toLocaleString()}
          </div>
        </div>
        <div className="flex gap-2">
          <div className="text-sm">
            👍 {submission.votes?.up || 0} 👎 {submission.votes?.down || 0}
          </div>
          <div className="flex gap-1">
            <button onClick={() => handleVote("up")} className="px-2 bg-green-100 rounded text-sm">
              Upvote
            </button>
            <button onClick={() => handleVote("down")} className="px-2 bg-red-100 rounded text-sm">
              Downvote
            </button>
          </div>
        </div>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-4">
        <div>
          <div className="text-xs font-medium mb-1">Proposed</div>
          <pre className="bg-gray-50 p-2 rounded text-xs overflow-auto">
            {JSON.stringify(submission.proposed, null, 2)}
          </pre>
        </div>
        {submission.targetOfficialId && (
          <div>
            <div className="text-xs font-medium mb-1">Target Official</div>
            <div className="text-xs">ID: {submission.targetOfficialId}</div>
          </div>
        )}
      </div>
      {isReviewer && (
        <div className="flex gap-2 mt-3">
          <button onClick={handleApprove} className="bg-blue-600 text-white px-3 py-1 rounded text-sm">
            Approve
          </button>
          <button onClick={handleReject} className="bg-gray-300 px-3 py-1 rounded text-sm">
            Reject
          </button>
        </div>
      )}
    </div>
  );
};

export default SubmissionCard;
