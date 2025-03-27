// src/components/ContactGroupList.tsx
import { useEffect, useState } from "react";
import { API_BASE_URL } from "../config";
import { Link } from "react-router-dom";
import { ContactGroup } from "../../../shared/types/contactGroup";

interface Props {
    filters: {
        issue: string;
        partner: string;
    };
    myOnly?: boolean;
    userEmail?: string;
}


const ContactGroupList = ({ filters, myOnly = false, userEmail }: Props) => {
    const [groups, setGroups] = useState<ContactGroup[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const query = new URLSearchParams({ status: "approved" });

        if (filters.issue) query.append("issue", filters.issue);
        if (filters.partner) query.append("partner", filters.partner);

        fetch(`${API_BASE_URL}/api/contact-groups?${query.toString()}`)
            .then((res) => res.json())
            .then((data) => {
                if (myOnly && userEmail) {
                    const mine = data.filter(
                        (c: any) =>
                            c.createdBy === userEmail || (c.editors || []).includes(userEmail)
                    );
                    setGroups(mine);
                } else {
                    setGroups(data);
                }
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
            {groups.map((group) => {
                const canEdit =
                    userEmail &&
                    (group.createdBy === userEmail || (group.editors || []).includes(userEmail));

                return (
                    <div
                        key={group._id}
                        className="bg-white dark:bg-gray-800 p-4 rounded shadow"
                    >
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                            {group.title}
                        </h2>
                        <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                            {group.description}
                        </p>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                            Partner: {group.partner}
                        </div>
                        {group.issues && (
                            <div className="text-xs text-gray-400">
                                Tags: {group.issues.join(", ")}
                            </div>
                        )}

                        <div className="mt-3 flex gap-4 text-sm">
                            <Link
                                to={`/contact/${group._id}`}
                                className="text-blue-600 hover:underline"
                            >
                                View & Send →
                            </Link>

                            {canEdit && (
                                <Link
                                    to={`/partner/campaigns/${group._id}/edit`}
                                    className="text-yellow-600 hover:underline"
                                >
                                    Edit
                                </Link>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};
export default ContactGroupList;
