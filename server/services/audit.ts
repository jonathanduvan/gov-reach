import ReviewEvent from "../models/ReviewEvent.js";

export async function logReviewEvent(params: {
  reqUser: { email: string; role: string };
  groupKey: string;
  action: "claim"|"release"|"approve"|"reject"|"conflict"|"merge";
  submissionId?: string;
  summary?: string;
  payload?: any;
}) {
  const { reqUser, groupKey, action, submissionId, summary, payload } = params;
  try {
    await ReviewEvent.create({
      actorEmail: reqUser.email,
      actorRole:  reqUser.role,
      submissionId,
      groupKey,
      action,
      summary,
      payload,
    });
  } catch (e) {
    // don't crash the request if audit write fails
    console.error("[audit] failed", e);
  }
}
