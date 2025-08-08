import { useEffect, useMemo, useRef, useState } from "react";
import { fetchOfficialByEmail, fetchOfficialById } from "../services/officials";
import { resolveSubmission } from "../services/submissions";
import { CandidatesByField, VariantSource } from "../types/review";
import { ensureArray, get, jsonEq, setPath } from "../utils/mergeUtils";
import { FIELDS } from "../constants/reviewFields";

export function useMergeState(open: boolean, leader: any, childrenSubs?: any[]) {
  const leaderProp = leader?.proposed || {};
  const isThread = (childrenSubs?.length || 0) > 0;

  // stable key for fetch + draft
  const canonicalKey = useMemo<string | null>(() => {
    if (!open) return null;
    return leader?.targetOfficialId || leaderProp?.email || leader?._id || null;
  }, [open, leader?.targetOfficialId, leaderProp?.email, leader?._id]);

  const draftKey = useMemo(() => (canonicalKey ? `review-draft:${canonicalKey}` : null), [canonicalKey]);

  // canonical
  const [canonical, setCanonical] = useState<any | null>(null);
  const loadNonce = useRef(0);
  useEffect(() => {
    if (!open) return;
    if (!canonicalKey) { setCanonical(null); return; }
    let cancelled = false;
    const nonce = ++loadNonce.current;
    (async () => {
      try {
        const data = leader?.targetOfficialId
          ? await fetchOfficialById(leader.targetOfficialId)
          : (leaderProp?.email ? await fetchOfficialByEmail(leaderProp.email) : null);
        if (cancelled || loadNonce.current !== nonce) return;
        setCanonical(data || null);
      } catch {
        if (!cancelled && loadNonce.current === nonce) setCanonical(null);
      }
    })();
    return () => { cancelled = true; };
  }, [open, canonicalKey, leader?.targetOfficialId, leaderProp?.email]);

  // variants (leader + children)
  const variantSources: VariantSource[] = useMemo(() => ([
    { key: "Leader", label: "Leader", submission: leader, proposed: leaderProp },
    ...(childrenSubs || []).map((c, i) => ({ key: `Child-${i+1}`, label: `Child ${i+1}`, submission: c, proposed: c.proposed || {} }))
  ]), [leader, leaderProp, childrenSubs]);

  // candidates by field
  const candidatesByField: CandidatesByField = useMemo(() => {
    const map: CandidatesByField = {};
    for (const f of FIELDS) {
      const vals: Array<{ source: string; value: any }> = [];
      if (canonical) {
        const v = get(canonical, f.key);
        if (v !== undefined) vals.push({ source: "Current", value: v });
      }
      for (const s of variantSources) {
        const v = get(s.proposed || {}, f.key);
        if (v !== undefined) vals.push({ source: s.label, value: v });
      }
      const seen = new Set<string>();
      map[f.key] = vals.filter(({ value }) => {
        const k = JSON.stringify(value ?? null);
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });
    }
    return map;
  }, [canonical, variantSources]);

  // selection state (+ draft)
  const [selected, setSelected] = useState<Record<string, any>>({});
  const [verify, setVerify] = useState(false);
  const [closeThread, setCloseThread] = useState(true);
  const [activeVariantIdx, setActiveVariantIdx] = useState(0);

  useEffect(() => {
    if (!open) return;
    const init: Record<string, any> = {};
    const raw = draftKey ? localStorage.getItem(draftKey) : null;
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") {
          setSelected(parsed.selected || {});
          setVerify(!!parsed.verify);
          setCloseThread(!!parsed.closeThread);
          setActiveVariantIdx(parsed.activeVariantIdx ?? 0);
          return;
        }
      } catch {}
    }
    for (const f of FIELDS) {
      const val = get(leaderProp, f.key);
      if (val !== undefined) setPath(init, f.key, val);
    }
    setSelected(init);
    setVerify(false);
    setCloseThread(true);
    setActiveVariantIdx(0);
  }, [open, draftKey, leaderProp]);

  // draft save
  const draftTimer = useRef<number | null>(null);
  useEffect(() => {
    if (!open || !draftKey) return;
    if (draftTimer.current) window.clearTimeout(draftTimer.current);
    draftTimer.current = window.setTimeout(() => {
      try {
        localStorage.setItem(
          draftKey,
          JSON.stringify({ selected, verify, closeThread, activeVariantIdx })
        );
      } catch {}
    }, 200);
    return () => { if (draftTimer.current) window.clearTimeout(draftTimer.current); };
  }, [open, draftKey, selected, verify, closeThread, activeVariantIdx]);
  const clearDraft = () => { if (draftKey) localStorage.removeItem(draftKey); };

  // field ops
  function chooseScalar(path: string, value: any) {
    setSelected(prev => { const next = { ...prev }; setPath(next, path, value); return next; });
  }
  function toggleArrayValue(path: string, value: any, on: boolean) {
    setSelected(prev => {
      const cur = ensureArray(get(prev, path));
      const next = on ? [...cur, value] : cur.filter(x => !jsonEq(x, value));
      const out = { ...prev }; setPath(out, path, next); return out;
    });
  }
  function cycleField(fieldKey: string, dir: 1 | -1) {
    const cands = candidatesByField[fieldKey] || [];
    if (!cands.length) return;
    const cur = get(selected, fieldKey);
    let idx = cands.findIndex(c => jsonEq(c.value, cur));
    if (idx === -1) idx = 0;
    idx = (idx + dir + cands.length) % cands.length;
    chooseScalar(fieldKey, cands[idx].value);
  }
  function applyVariant(idx: number) {
    const src = variantSources[idx]?.proposed || {};
    const next: Record<string, any> = {};
    for (const f of FIELDS) {
      const val = get(src, f.key);
      if (val !== undefined) setPath(next, f.key, val);
    }
    setSelected(next); setActiveVariantIdx(idx);
  }

  // approvals
  async function approve(opts?: { verify?: boolean; closeThread?: boolean }) {
    const body: any = {
      mergeStrategy: "merge",
      verify: !!opts?.verify || verify,
      closeThread: isThread ? (opts?.closeThread ?? closeThread) : false,
      fieldOverrides: selected,
    };
    await resolveSubmission(leader._id, "approve", body);
    clearDraft();
  }
  async function reject(reason?: string) {
    await resolveSubmission(leader._id, "reject", { resolution: reason || "not applicable" });
    clearDraft();
  }
  async function markConflict() {
    await resolveSubmission(leader._id, "reject", { resolution: "conflict" });
    clearDraft();
  }

  return {
    // data
    canonical,
    leaderProp,
    isThread,
    variantSources,
    candidatesByField,
    selected,
    verify, closeThread,
    activeVariantIdx,

    // setters
    setActiveVariantIdx,
    setVerify, setCloseThread,

    // ops
    chooseScalar, toggleArrayValue, cycleField, applyVariant,
    approve, reject, markConflict,
  };
}
