// src/components/ContactGroupList.tsx
import { useEffect, useState } from "react";
import { API_BASE_URL } from "../config";
import { Link } from "react-router-dom";

interface ContactGroup {
    _id: string;
    title: string;
    description?: string;
    partner: string;
    issues?: string[];
}

interface Props {
    filters: {
        issue: string;
        partner: string;
    };
}

const ContactGroupList = ({ filters }: Props) => {
    const [groups, setGroups] = useState<ContactGroup[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const query = new URLSearchParams({ status: "approved" });

        if (filters.issue) query.append("issue", filters.issue);
        if (filters.partner) query.append("partner", filters.partner);

        fetch(`${API_BASE_URL}/api/contact-groups?${query.toString()}`)
            .then((res) => res.json())
            .then((data) => {
                setGroups(data);
                setLoading(false);
            })
            .catch((err) => {
                console.error("Failed to fetch contact groups:", err);
                setLoading(false);
            });
    }, [filters]);

    if (loading) return <p className="text-center text-gray-600">Loading campaigns...</p>;
    if (groups.length === 0) return <p className="text-center text-gray-400">No campaigns found.</p>;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {groups.map((group) => (
                <div key={group._id} className="bg-white dark:bg-gray-800 p-4 rounded shadow">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">{group.title}</h2>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">{group.description}</p>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                        Partner: {group.partner}
                    </div>
                    {group.issues && (
                        <div className="text-xs text-gray-400">Tags: {group.issues.join(", ")}</div>
                    )}
                    <Link
                        to={`/contact/${group._id}`}
                        className="inline-block mt-3 text-blue-600 hover:underline text-sm"
                    >
                        View & Send →
                    </Link>
                </div>
            ))}
        </div>
    );
};

export default ContactGroupList;
