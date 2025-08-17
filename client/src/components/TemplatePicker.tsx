import { useEffect, useState } from "react";
import type { MessageTemplate } from "../services/templates";
import { listTemplates } from "../services/templates";

type Props = {
  open: boolean;
  onClose: () => void;
  onPick: (tmpl: MessageTemplate) => void;
  seedFallback?: MessageTemplate[]; // used if server returns none (demo)
};

export default function TemplatePicker({ open, onClose, onPick, seedFallback = [] }: Props) {
  const [items, setItems] = useState<MessageTemplate[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    (async () => {
      setLoading(true);
      try {
        const res = await listTemplates();
        setItems(res.length ? res : seedFallback);
      } catch {
        setItems(seedFallback);
      } finally {
        setLoading(false);
      }
    })();
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-2xl shadow-lg overflow-hidden">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <div className="font-semibold">Choose a Template</div>
          <button className="text-sm px-2 py-1 border rounded" onClick={onClose}>Close</button>
        </div>

        <div className="p-3 flex gap-2">
          <input
            className="border rounded px-3 py-2 flex-1"
            placeholder="Search templates…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        <div className="max-h-[60vh] overflow-auto divide-y">
          {loading ? (
            <div className="p-4 text-gray-500 text-sm">Loading…</div>
          ) : (
            items
              .filter(t => !q || (t.name + " " + (t.description || "")).toLowerCase().includes(q.toLowerCase()))
              .map(t => (
                <button
                  key={t._id || t.name}
                  className="w-full text-left px-4 py-3 hover:bg-gray-50"
                  onClick={() => { onPick(t); onClose(); }}
                >
                  <div className="font-medium">{t.name}</div>
                  <div className="text-xs text-gray-600">
                    {t.channel.toUpperCase()} · {t.category || "General"} · {t.tone}/{t.length}
                  </div>
                  {t.description && <div className="text-sm text-gray-700 mt-1">{t.description}</div>}
                </button>
              ))
          )}
          {!loading && items.length === 0 && (
            <div className="p-4 text-gray-500 text-sm">No templates yet.</div>
          )}
        </div>
      </div>
    </div>
  );
}
