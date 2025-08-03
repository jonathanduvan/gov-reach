// src/components/OfficialSelector.tsx
import { useEffect, useState } from "react";
import { Official } from "../../../shared/types/official"; // Adjust if needed
import { API_BASE_URL } from "../config";

interface Props {
    selected: Official[];
    onChange: (updated: Official[]) => void;
}

const OfficialSelector = ({ selected, onChange }: Props) => {
    const [allOfficials, setAllOfficials] = useState<Official[]>([]);
    const [query, setQuery] = useState("");

    useEffect(() => {
        fetch(`${API_BASE_URL}/api/officials`)
            .then((res) => res.json())
            .then(setAllOfficials)
            .catch(console.error);
    }, []);

    const filtered = allOfficials.filter((o) =>
        o.fullName.toLowerCase().includes(query.toLowerCase()) ||
        o.issues?.some((issue) => issue.toLowerCase().includes(query.toLowerCase()))
    );

    const toggle = (official: Official) => {
        const exists = selected.find((o) => o._id === official._id);
        onChange(
            exists ? selected.filter((o) => o._id !== official._id) : [...selected, official]
        );
    };

    return (
        <div className="my-4">
            <input
                className="w-full p-2 border rounded mb-2"
                placeholder="Search officials..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
            />
            <div className="grid gap-2 max-h-64 overflow-y-scroll">
                {filtered.map((official) => (
                    <label key={official._id} className="flex items-center space-x-2">
                        <input
                            type="checkbox"
                            checked={!!selected.find((o) => o._id === official._id)}
                            onChange={() => toggle(official)}
                        />
                        <span>{official.fullName} ({official.role})</span>
                    </label>
                ))}
            </div>
        </div>
    );
};

export default OfficialSelector;