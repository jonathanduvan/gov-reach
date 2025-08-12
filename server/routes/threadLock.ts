import express from "express";
import ThreadLock from "../models/ThreadLock.js";
import { requireRole } from "../middleware/auth.js";
import { logReviewEvent } from "../services/audit.js";
import ReviewEvent from "../models/ReviewEvent.js";

const LOCK_TTL_MIN = Number(process.env.REVIEW_LOCK_TTL_MINUTES || 30);

// helper
function isExpired(d: Date) {
  const ttlMs = LOCK_TTL_MIN * 60 * 1000;
  return !d || d.getTime() < Date.now() - ttlMs;
}

const router = express.Router();


// GET lock status
router.get("/threads/:groupKey/lock", requireRole("partner","admin","contributor"), async (req, res) => {
  const { groupKey } = req.params;
  const lock = await ThreadLock.findOne({ groupKey }).lean();
  if (!lock) return res.json({ locked: false });
  const expired = isExpired(lock.lockedAt);
  res.json({
    locked: !expired,
    expired,
    lockedBy: lock.lockedBy,
    lockedByRole: lock.lockedByRole,
    lockedAt: lock.lockedAt,
    expiresAt: new Date(lock.lockedAt.getTime() + LOCK_TTL_MIN * 60 * 1000),
    isMine: !!req.session.user?.email && lock.lockedBy === req.session.user.email
  });
});

// POST claim
router.post("/threads/:groupKey/claim", requireRole("partner","admin"), async (req, res) => {
  const { groupKey } = req.params;
  const meEmail = req.session.user!.email!;
  const meRole  = req.session.user!.role!;

  const existing = await ThreadLock.findOne({ groupKey });
  if (existing && !isExpired(existing.lockedAt) && existing.lockedBy !== meEmail) {
    return res.status(409).json({ message: `Locked by ${existing.lockedBy}` });
  }

  // upsert/refresh my lock
  const lock = await ThreadLock.findOneAndUpdate(
    { groupKey },
    { groupKey, lockedBy: meEmail, lockedByRole: meRole, lockedAt: new Date() },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  ).lean();
  await logReviewEvent({
    reqUser: { email: req.session.user!.email!, role: req.session.user!.role! },
    groupKey,
    action: "claim",
    summary: `Claimed for review`,
  });

  res.json({
    ok: true,
    lock: {
      lockedBy: lock.lockedBy,
      lockedByRole: lock.lockedByRole,
      lockedAt: lock.lockedAt,
      expiresAt: new Date(lock.lockedAt.getTime() + LOCK_TTL_MIN * 60 * 1000)
    }
  });
});

// POST release
router.post("/threads/:groupKey/release", requireRole("partner","admin"), async (req, res) => {
  const { groupKey } = req.params;
  const meEmail = req.session.user!.email!;
  const meRole  = req.session.user!.role!;

  const lock = await ThreadLock.findOne({ groupKey });
  if (!lock) return res.json({ ok: true });

  if (lock.lockedBy !== meEmail && meRole !== "admin") {
    return res.status(403).json({ message: "Only owner (or admin) can release." });
  }

  await ThreadLock.deleteOne({ groupKey });
  await logReviewEvent({
    reqUser: { email: req.session.user!.email!, role: req.session.user!.role! },
    groupKey,
    action: "release",
    summary: `Released review lock`,
  });
  res.json({ ok: true });
});

router.get("/threads/:groupKey/events", requireRole("partner","admin"), async (req, res) => {
  const { groupKey } = req.params;
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  const items = await ReviewEvent.find({ groupKey })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
  res.json({ events: items });
});

export default router;
