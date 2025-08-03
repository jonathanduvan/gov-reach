import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { API_BASE_URL } from "../config";
import { generateMessageVariations } from "../utils/generateMessageVariations";
import { ContactGroup } from "../../../shared/types/contactGroup";
import { Official } from "../../../shared/types/official";
import { useUser } from "../context/UserContext";

interface User {
    name: string;
    email: string;
    provider: "gmail" | "outlook";
    city?: string;
    zip?: string;
}

const ContactCampaignPage = () => {
    const { id } = useParams<{ id: string }>();
    const [campaign, setCampaign] = useState<ContactGroup | null>(null);
    const [selectedOfficials, setSelectedOfficials] = useState<Set<string>>(new Set());
    const [message, setMessage] = useState("");
    const [variations, setVariations] = useState<string[]>([]);
    const [showVariations, setShowVariations] = useState(false);
    const [loadingCampaign, setLoadingCampaign] = useState(true);

    const { user, loading } = useUser();

    // Fetch campaign
    useEffect(() => {
        fetch(`${API_BASE_URL}/api/contact-groups/${id}`)
            .then(res => res.json())
            .then(data => {
                setCampaign(data);
                setMessage(data.messageTemplate);
                setSelectedOfficials(new Set(data.officials.map((o: Official) => o._id)));
                setLoadingCampaign(false);
            })
            .catch(err => {
                console.error("Error loading campaign:", err);
                setLoadingCampaign(false);
            });
    }, [id]);

    const handleCheckboxChange = (officialId: string) => {
        setSelectedOfficials(prev => {
            const updated = new Set(prev);
            updated.has(officialId) ? updated.delete(officialId) : updated.add(officialId);
            return updated;
        });
    };

    const handleGenerateVariations = () => {
        if (!campaign || !user) return;

        const selected = campaign.officials.filter(o => selectedOfficials.has(o._id));
        const result = generateMessageVariations({
            template: message,
            user,
            issue: campaign.issues?.[0],
            officials: selected,
        });

        setVariations(result);
        setShowVariations(true);
    };

    if (loading || loadingCampaign) return <p className="text-center text-gray-600 py-10">Loading campaign...</p>;
    if (!campaign) return <p className="text-center text-red-500 py-10">Campaign not found.</p>;

    return (
        <div className="max-w-4xl mx-auto px-4 py-10">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{campaign.title}</h1>
            <p className="text-sm text-gray-600 mb-4">Organized by <span className="font-medium">{campaign.partner}</span></p>
            {campaign.description && (
                <p className="text-base text-gray-700 dark:text-gray-300 mb-6">{campaign.description}</p>
            )}

            <h2 className="text-xl font-semibold mb-2">Officials to Contact</h2>
            <div className="space-y-2 mb-6">
                {campaign.officials.map(official => (
                    <label
                        key={official._id}
                        className="block bg-white dark:bg-gray-800 p-3 rounded border dark:border-gray-700 shadow-sm flex items-center"
                    >
                        <input
                            type="checkbox"
                            checked={selectedOfficials.has(official._id)}
                            onChange={() => handleCheckboxChange(official._id)}
                            className="mr-3"
                        />
                        <div>
                            <div className="font-medium text-gray-900 dark:text-white">{official.fullName}</div>
                            <div className="text-sm text-gray-500">{official.role} • {official.state.toUpperCase()}</div>
                        </div>
                    </label>
                ))}
            </div>

            <h2 className="text-xl font-semibold mb-2">Your Message</h2>
            <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                rows={6}
                className="w-full border border-gray-300 dark:border-gray-700 rounded px-3 py-2 bg-white dark:bg-gray-900 text-gray-800 dark:text-white"
            />

            <div className="mt-6">
                <button
                    onClick={handleGenerateVariations}
                    className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
                >
                    Generate Personalized Messages
                </button>
            </div>

            {showVariations && variations.length > 0 && (
                <div className="mt-6 space-y-4">
                    <h3 className="text-lg font-semibold mb-2">Generated Messages</h3>
                    {variations.map((text, idx) => (
                        <div
                            key={idx}
                            className="border border-gray-300 dark:border-gray-700 rounded p-4 bg-white dark:bg-gray-800"
                        >
                            <div className="text-xs text-gray-500 mb-2">Message #{idx + 1}</div>
                            <pre className="text-sm text-gray-800 dark:text-white whitespace-pre-wrap">{text}</pre>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ContactCampaignPage;
