import { useState } from "react";
import { API_BASE_URL } from "../config"; // Make sure this is correctly pointing to your backend

const PartnerRequest = () => {
    const [formData, setFormData] = useState({
        name: "",
        org: "",
        email: "",
        website: "",
        campaignInfo: ""
    });

    const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus("submitting");

        try {
            const response = await fetch(`${API_BASE_URL}/api/partner-requests`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData)
            });

            if (!response.ok) throw new Error("Submission failed");

            setStatus("success");
            setFormData({
                name: "",
                org: "",
                email: "",
                website: "",
                campaignInfo: ""
            });
        } catch (error) {
            console.error("Error submitting partner request:", error);
            setStatus("error");
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-6 py-10">
            <div className="max-w-lg w-full bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">🤝 Partner With Flash Activist</h2>
                <p className="mb-6 text-sm text-gray-600 dark:text-gray-300">
                    Submit a campaign idea and we’ll get in touch to help you launch it on Flash Activist.
                </p>

                {status === "success" ? (
                    <div className="text-green-600 dark:text-green-400 font-medium">
                        ✅ Thank you! Your request has been submitted. We'll reach out soon.
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <input
                            type="text"
                            name="name"
                            placeholder="Your Name"
                            required
                            value={formData.name}
                            onChange={handleChange}
                            className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white"
                        />

                        <input
                            type="text"
                            name="org"
                            placeholder="Organization Name"
                            required
                            value={formData.org}
                            onChange={handleChange}
                            className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white"
                        />

                        <input
                            type="email"
                            name="email"
                            placeholder="Contact Email"
                            required
                            value={formData.email}
                            onChange={handleChange}
                            className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white"
                        />

                        <input
                            type="url"
                            name="website"
                            placeholder="Organization Website (optional)"
                            value={formData.website}
                            onChange={handleChange}
                            className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white"
                        />

                        <textarea
                            name="campaignInfo"
                            placeholder="Brief description of your campaign or goal"
                            required
                            value={formData.campaignInfo}
                            onChange={handleChange}
                            rows={4}
                            className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white"
                        ></textarea>

                        <button
                            type="submit"
                            className="w-full bg-blue-600 text-white hover:bg-blue-700 font-semibold py-2 rounded"
                            disabled={status === "submitting"}
                        >
                            {status === "submitting" ? "Submitting..." : "Submit Request"}
                        </button>

                        {status === "error" && (
                            <p className="text-red-600 text-sm mt-2">
                                ❌ Something went wrong. Please try again.
                            </p>
                        )}
                    </form>
                )}
            </div>
        </div>
    );
};

export default PartnerRequest;