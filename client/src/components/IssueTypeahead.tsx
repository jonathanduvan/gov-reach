import React, { useEffect, useRef, useState } from "react";
import { listIssues } from "../services/issues";

type Selection = { id: string; label: string };

type Props = {
  value?: Selection | null;
  onChange: (sel: Selection | null) => void;
  placeholder?: string;
  autoFocus?: boolean;
  excludeId?: string; // don't show this id in results (e.g., source issue)
};

const IssueTypeahead: React.FC<Props> = ({
  value,
  onChange,
  placeholder,
  autoFocus,
  excludeId,
}) => {
  const [q, setQ] = useState(value?.label ?? "");
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [hl, setHl] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);

  // query -> fetch (debounced)
  useEffect(() => {
    const t = setTimeout(async () => {
      const term = q.trim();
      if (!term) { setItems([]); return; }
      setLoading(true);
      try {
        const res = await listIssues({ q: term, limit: 10 });
        const list = (res.items || []).filter((it: any) => it._id !== excludeId);
        setItems(list);
        setOpen(true);
        setHl(0);
      } catch { /* ignore */ }
      finally { setLoading(false); }
    }, 200);
    return () => clearTimeout(t);
  }, [q, excludeId]);

  // close on outside click
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const pick = (it: any) => {
    const sel = { id: it._id, label: `${it.name} (${it.slug})` };
    setQ(sel.label);
    setOpen(false);
    onChange(sel);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setHl(i => Math.min(i + 1, items.length - 1)); }
    if (e.key === "ArrowUp")   { e.preventDefault(); setHl(i => Math.max(i - 1, 0)); }
    if (e.key === "Enter" && items[hl]) { e.preventDefault(); pick(items[hl]); }
    if (e.key === "Escape") setOpen(false);
  };

  return (
    <div ref={wrapRef} className="relative">
      <input
        className="border rounded px-2 py-1 w-full"
        value={q}
        onChange={(e) => { setQ(e.target.value); onChange(null); }}
        onFocus={() => q.trim() && setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder={placeholder || "Search issue…"}
        autoFocus={autoFocus}
        aria-autocomplete="list"
        aria-expanded={open}
      />
      {open && (
        <div className="absolute left-0 right-0 mt-1 bg-white border rounded shadow z-10 max-h-64 overflow-auto">
          {loading && <div className="px-3 py-2 text-sm text-gray-500">Searching…</div>}
          {!loading && items.length === 0 && (
            <div className="px-3 py-2 text-sm text-gray-500">No results</div>
          )}
          {!loading && items.map((it, idx) => (
            <button
              key={it._id}
              onClick={() => pick(it)}
              className={`w-full text-left px-3 py-2 text-sm ${idx === hl ? "bg-blue-50" : ""}`}
            >
              <div className="font-medium">{it.name}</div>
              <div className="text-xs text-gray-600">
                {it.slug} · {it.usageCount ?? 0} uses {it.pending ? "· pending" : ""}
              </div>
              {Array.isArray(it.aliases) && it.aliases.length > 0 && (
                <div className="text-[10px] text-gray-500 truncate">
                  aliases: {it.aliases.slice(0, 5).join(", ")}
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default IssueTypeahead;
