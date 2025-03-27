import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../config";
import { ContactGroup } from "../../../shared/types/contactGroup";
import { Official } from "../../../shared/types/official";


const PartnerEditCampaign = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [campaign, setCampaign] = useState<ContactGroup | null>(null);
    const [allOfficials, setAllOfficials] = useState<Official[]>([]);
    const [selectedOfficials, setSelectedOfficials] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [formData, setFormData] = useState({
        title: "",
        description: "",
        messageTemplate: "",
    });
    const [successMsg, setSuccessMsg] = useState("");

    // Fetch campaign data
    useEffect(() => {
        fetch(`${API_BASE_URL}/api/contact-groups/${id}`)
            .then(res => res.json())
            .then(data => {
                setCampaign(data);
                setFormData({
                    title: data.title,
                    description: data.description || "",
                    messageTemplate: data.messageTemplate,
                });
                setSelectedOfficials(new Set(data.officials.map((o: Official) => o._id)));
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, [id]);

    // Fetch all officials (for selection)
    useEffect(() => {
        fetch(`${API_BASE_URL}/api/officials`)
            .then(res => res.json())
            .then(data => setAllOfficials(data));
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleOfficialToggle = (officialId: string) => {
        setSelectedOfficials(prev => {
            const updated = new Set(prev);
            updated.has(officialId) ? updated.delete(officialId) : updated.add(officialId);
            return updated;
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSuccessMsg("");

        const updatedCampaign = {
            ...formData,
            officials: Array.from(selectedOfficials),
        };

        const res = await fetch(`${API_BASE_URL}/api/contact-groups/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updatedCampaign),
        });

        if (res.ok) {
            setSuccessMsg("✅ Campaign updated successfully!");
            setTimeout(() => navigate("/dashboard"), 1500);
        } else {
            const error = await res.json();
            setSuccessMsg(`❌ Failed to update: ${error.message}`);
        }
    };

    if (loading) return <p className="text-center py-10">Loading...</p>;
    if (!campaign) return <p className="text-center py-10 text-red-500">Campaign not found.</p>;

    return (
        <div className="max-w-3xl mx-auto px-4 py-10">
            <h1 className="text-2xl font-bold mb-6">Edit Campaign: {campaign.title}</h1>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label className="block font-medium">Title</label>
                    <input
                        type="text"
                        name="title"
                        value={formData.title}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border rounded mt-1 dark:bg-gray-900 dark:text-white"
                    />
                </div>

                <div>
                    <label className="block font-medium">Description</label>
                    <textarea
                        name="description"
                        value={formData.description}
                        onChange={handleChange}
                        rows={3}
                        className="w-full px-3 py-2 border rounded mt-1 dark:bg-gray-900 dark:text-white"
                    />
                </div>

                <div>
                    <label className="block font-medium">Email Message Template</label>
                    <textarea
                        name="messageTemplate"
                        value={formData.messageTemplate}
                        onChange={handleChange}
                        rows={6}
                        className="w-full px-3 py-2 border rounded mt-1 dark:bg-gray-900 dark:text-white"
                    />
                </div>

                <div>
                    <h2 className="text-lg font-semibold mb-2">Select Officials</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-64 overflow-y-auto border p-3 rounded bg-white dark:bg-gray-800">
                        {allOfficials.map(official => (
                            <label key={official._id} className="flex items-center">
                                <input
                                    type="checkbox"
                                    checked={selectedOfficials.has(official._id)}
                                    onChange={() => handleOfficialToggle(official._id)}
                                    className="mr-2"
                                />
                                <span className="text-sm text-gray-800 dark:text-white">
                                    {official.fullName} — {official.role} ({official.state})
                                </span>
                            </label>
                        ))}
                    </div>
                </div>

                <button
                    type="submit"
                    className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                >
                    Save Changes
                </button>

                {successMsg && (
                    <p className="mt-3 text-sm text-center text-green-600 dark:text-green-400">
                        {successMsg}
                    </p>
                )}
            </form>
        </div>
    );
};

export default PartnerEditCampaign;
