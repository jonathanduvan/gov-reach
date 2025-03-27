// src/pages/PartnerCreateCampaign.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../config";
import { ContactGroup } from "../../../shared/types/contactGroup";
import { useUser } from "../context/UserContext";


const PartnerCreateCampaign = () => {
    const navigate = useNavigate();
    const { user } = useUser();


    const [form, setForm] = useState<Partial<ContactGroup>>({
        title: "",
        description: "",
        partner: "",
        issues: [],
        officials: [],
        messageTemplate: "",
    });

    const [status, setStatus] = useState<"idle" | "saving" | "error" | "success">("idle");

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setForm({ ...form, [name]: value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus("saving");

        const payload = {
            ...form,
            createdBy: user.email,
            editors: [user.email],
        };

        try {
            const res = await fetch(`${API_BASE_URL}/api/contact-groups`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(payload),
            });

            const result = await res.json();

            if (!res.ok) throw new Error(result.message || "Unknown error");

            setStatus("success");
            navigate(`/partner/campaigns/${result.contactGroup._id}/edit`);
        } catch (err) {
            console.error("Error submitting campaign:", err);
            setStatus("error");
        }
    };

    return (
        <div className="max-w-2xl mx-auto px-4 py-10">
            <h1 className="text-2xl font-bold mb-6">Create a New Campaign</h1>

            <form onSubmit={handleSubmit} className="space-y-4">
                <input
                    name="title"
                    placeholder="Campaign Title"
                    value={form.title}
                    onChange={handleChange}
                    className="w-full border rounded px-3 py-2"
                    required
                />
                <input
                    name="partner"
                    placeholder="Partner Organization Name"
                    value={form.partner}
                    onChange={handleChange}
                    className="w-full border rounded px-3 py-2"
                    required
                />
                <input
                    name="issues"
                    placeholder="Issue Tags (comma separated)"
                    value={form.issues?.join(", ") || ""}
                    onChange={(e) => setForm({ ...form, issues: e.target.value.split(",").map(i => i.trim()) })}
                    className="w-full border rounded px-3 py-2"
                />
                <textarea
                    name="description"
                    placeholder="Short Description"
                    value={form.description}
                    onChange={handleChange}
                    className="w-full border rounded px-3 py-2"
                    rows={3}
                />
                <textarea
                    name="messageTemplate"
                    placeholder="Message Template"
                    value={form.messageTemplate}
                    onChange={handleChange}
                    className="w-full border rounded px-3 py-2"
                    rows={6}
                    required
                />

                <button
                    type="submit"
                    className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                    disabled={status === "saving"}
                >
                    {status === "saving" ? "Saving..." : "Create Campaign"}
                </button>

                {status === "error" && (
                    <p className="text-red-500 text-sm mt-2">Something went wrong. Please try again.</p>
                )}
            </form>
        </div>
    );
};

export default PartnerCreateCampaign;
