import React, { useState } from "react";
import SuggestEditModal from "./SuggestEditModal";

type Phone = { number: string; label?: string; priority?: number };

type Props = {
  open: boolean;
  official: any | null;
  onClose: () => void;
};

const OfficialQuickViewModal: React.FC<Props> = ({ open, official, onClose }) => {
  const [editOpen, setEditOpen] = useState(false);
  if (!open || !official) return null;

  const phones: Phone[] = Array.isArray(official.phoneNumbers) ? official.phoneNumbers : [];
  const primaryPhone = phones[0]?.number;

  const handleBackdrop = (e: React.MouseEvent) => {
    // close when clicking the dim backdrop
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
      onMouseDown={handleBackdrop}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-white w-full max-w-2xl rounded shadow-lg overflow-hidden"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <div className="min-w-0">
            <div className="font-semibold truncate">
              {official.fullName} — {official.role}
              {official.verified && (
                <span className="ml-2 text-xs bg-green-100 text-green-800 border border-green-200 px-2 py-0.5 rounded-full">
                  verified
                </span>
              )}
            </div>
            <div className="text-xs text-gray-600 truncate">
              {official.jurisdiction?.city || "—"}, {official.state} · {official.level}
            </div>
          </div>
          <button className="px-2 py-1 border rounded text-sm" onClick={onClose}>Close</button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-3">
          <div>
            <div className="text-xs text-gray-500">Email</div>
            {official.email ? (
              <a className="underline text-blue-700 break-all" href={`mailto:${official.email}`}>
                {official.email}
              </a>
            ) : (
              <div className="text-gray-500 text-sm">no email</div>
            )}
          </div>

          <div>
            <div className="text-xs text-gray-500 mb-1">Phone numbers</div>
            {phones.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {phones.map((p, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center text-xs bg-gray-100 text-gray-800 px-2 py-0.5 rounded"
                  >
                    {p.number}
                    {p.label ? ` (${p.label})` : ""}
                    {typeof p.priority === "number" ? ` · p${p.priority}` : ""}
                  </span>
                ))}
              </div>
            ) : (
              <div className="text-gray-500 text-sm">—</div>
            )}
          </div>

          {Array.isArray(official.issues) && official.issues.length > 0 && (
            <div>
              <div className="text-xs text-gray-500 mb-1">Issues</div>
              <div className="flex flex-wrap gap-1">
                {official.issues.map((iss: any, i: number) => (
                  <span key={i} className="text-xs bg-gray-100 text-gray-800 px-2 py-0.5 rounded">
                    {typeof iss === "string" ? iss : iss?.name || iss?.slug || "issue"}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="px-4 py-3 border-t flex items-center justify-between">
          <div className="flex items-center gap-3 text-sm">
            {official.email && (
              <a className="underline text-blue-700" href={`mailto:${official.email}`}>Email</a>
            )}
            {primaryPhone && (
              <a className="underline text-blue-700" href={`tel:${primaryPhone}`}>Call</a>
            )}
          </div>
          <button className="px-3 py-1 rounded bg-blue-600 text-white" onClick={() => setEditOpen(true)}>
            Suggest edit
          </button>
        </div>
      </div>

      {/* Nested: Suggest Edit */}
      {editOpen && (
        <SuggestEditModal
          open={true}
          official={official}
          onClose={() => setEditOpen(false)}
          onSubmitted={() => setEditOpen(false)}
        />
      )}
    </div>
  );
};

export default OfficialQuickViewModal;
