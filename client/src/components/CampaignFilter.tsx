// src/components/CampaignFilter.tsx
import { useState } from "react";

interface Props {
    onFilterChange: (filters: { issue: string; partner: string }) => void;
}

const CampaignFilter = ({ onFilterChange }: Props) => {
    const [issue, setIssue] = useState("");
    const [partner, setPartner] = useState("");

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onFilterChange({ issue, partner });
    };

    return (
        <form
            onSubmit={handleSubmit}
            className="bg-white dark:bg-gray-800 p-4 rounded shadow-md mb-6 flex flex-col md:flex-row gap-4 items-start md:items-end"
        >
            <div className="flex-1">
                <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">Issue</label>
                <input
                    type="text"
                    placeholder="e.g. Energy, Immigration"
                    value={issue}
                    onChange={(e) => setIssue(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-white"
                />
            </div>

            <div className="flex-1">
                <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">Partner Org</label>
                <input
                    type="text"
                    placeholder="e.g. Sunrise, ACLU"
                    value={partner}
                    onChange={(e) => setPartner(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-white"
                />
            </div>

            <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
                Apply Filters
            </button>
        </form>
    );
};

export default CampaignFilter;
