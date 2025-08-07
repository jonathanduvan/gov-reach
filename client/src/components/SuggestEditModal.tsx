// src/components/SuggestEditModal.tsx
import React, { useEffect, useState } from "react";
import { createSubmission } from "../services/submissions";
import { useUser } from "../context/UserContext";

type Props = {
  official?: any; // existing official to edit; absent = create new
  onSubmitted?: () => void;
  open: boolean;
  onClose: () => void;
};

const levels = ["federal","state","municipal","regional","tribal"] as const;

const SuggestEditModal: React.FC<Props> = ({
  official,
  onSubmitted,
  open,
  onClose,
}) => {
  const { user } = useUser();

  // Form fields
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("");
  const [email, setEmail] = useState("");
  const [stateVal, setStateVal] = useState("");
  const [category, setCategory] = useState("");
  const [level, setLevel] = useState<typeof levels[number]>("municipal");
  const [city, setCity] = useState("");
  const [county, setCounty] = useState("");
  const [issueInput, setIssueInput] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Reset when opening or official changes
  useEffect(() => {
    if (open) {
      setFullName(official?.fullName || "");
      setRole(official?.role || "");
      setEmail(official?.email || "");
      setStateVal(official?.state || "");
      setCategory(official?.category || "");
      setLevel(official?.level || "municipal");
      setCity(official?.jurisdiction?.city || "");
      setCounty(official?.jurisdiction?.county || "");
      setIssueInput("");
      setNote("");
    }
  }, [open, official]);

  const handleSubmit = async () => {
    if (!user) return;
    setSubmitting(true);
    try {
      const proposed: any = {
        fullName,
        role,
        email,
        state: stateVal.toUpperCase(),
        category,
        level,
        jurisdiction: { city, county },
        issues: [issueInput.toLowerCase()],
        sourceNote: note,            // optional custom field
      };

      const payload: any = {
        type: official ? "edit" : "create",
        proposed,
        submitterId: user.email,     // fallback until you add user.id
        submitterEmail: user.email,
        submitterRole: user.role,
      };
      if (official) payload.targetOfficialId = official._id;

      await createSubmission(payload);
      onSubmitted?.();
      onClose();
    } catch (e) {
      console.error(e);
      alert("Failed to submit suggestion");
    } finally {
      setSubmitting(false);
    }
  };

  // Disable until required
  const canSubmit =
    !!fullName && !!role && !!email && !!stateVal && !!category && !!level;

  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded shadow-xl max-w-md w-full p-6">
        <h2 className="text-xl font-bold mb-4">
          {official ? "Suggest Edit" : "Submit New Official"}
        </h2>

        <div className="space-y-3">
          {/* Name, Role, Email */}
          {[
            { label: "Full Name", value: fullName, set: setFullName },
            { label: "Role", value: role, set: setRole },
            { label: "Email", value: email, set: setEmail },
          ].map(({ label, value, set }) => (
            <div key={label}>
              <label className="block text-sm">{label}</label>
              <input
                className="border rounded w-full p-2"
                value={value}
                onChange={(e) => set(e.target.value)}
              />
            </div>
          ))}

          {/* State, Category, Level */}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-sm">State</label>
              <input
                className="border rounded w-full p-2"
                value={stateVal}
                onChange={(e) => setStateVal(e.target.value)}
                placeholder="FL"
                maxLength={2}
              />
            </div>
            <div>
              <label className="block text-sm">Category</label>
              <input
                className="border rounded w-full p-2"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Council Member"
              />
            </div>
            <div>
              <label className="block text-sm">Level</label>
              <select
                className="border rounded w-full p-2"
                value={level}
                onChange={(e) => setLevel(e.target.value as any)}
              >
                {levels.map((lvl) => (
                  <option key={lvl} value={lvl}>
                    {lvl}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Jurisdiction */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-sm">City</label>
              <input
                className="border rounded w-full p-2"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm">County</label>
              <input
                className="border rounded w-full p-2"
                value={county}
                onChange={(e) => setCounty(e.target.value)}
              />
            </div>
          </div>

          {/* Issues */}
          <div>
            <label className="block text-sm">Issue</label>
            <input
              className="border rounded w-full p-2"
              value={issueInput}
              onChange={(e) => setIssueInput(e.target.value)}
              placeholder="e.g. housing"
            />
          </div>

          {/* Note / Source */}
          <div>
            <label className="block text-sm">Note / Source URL</label>
            <textarea
              className="border rounded w-full p-2"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Found on coral springs official site"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded"
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || !canSubmit}
            className={`px-4 py-2 rounded text-white ${
              canSubmit ? "bg-blue-600 hover:bg-blue-700" : "bg-gray-400 cursor-not-allowed"
            }`}
          >
            {submitting ? "Submitting..." : official ? "Submit Edit" : "Submit Official"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SuggestEditModal;
