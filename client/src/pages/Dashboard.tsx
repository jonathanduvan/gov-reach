import { useEffect, useState } from "react";
import { API_BASE_URL } from "../config";
import CampaignFilter from "../components/CampaignFilter";
import ContactGroupList from "../components/ContactGroupList";
import { Link } from "react-router-dom";
import { useUser } from "../context/UserContext";

interface User {
    name: string;
    email: string;
    provider: "gmail" | "outlook";
}

const Dashboard = () => {
    const [filters, setFilters] = useState({ issue: "", partner: "" });
    const [showOnlyMine, setShowOnlyMine] = useState(false);
    const { user } = useUser();

    const handleLogout = async () => {
        await fetch(`${API_BASE_URL}/logout`, { credentials: "include" });
        window.location.href = "/";
    };

    const isPartnerRep = user?.email?.endsWith("@example.org"); // <-- Replace with real logic later

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 px-6 py-10">
            {user ? (
                <>
                    <div className="text-center mb-10">
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                            Welcome, {user.name}
                        </h1>
                        <p className="text-gray-600 dark:text-gray-300">
                            Your email: {user.email} | Provider: {user.provider.toUpperCase()}
                        </p>
                        <button
                            onClick={handleLogout}
                            className="mt-4 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded"
                        >
                            Logout
                        </button>
                    </div>

                    {isPartnerRep && (
                        <div className="bg-yellow-100 border border-yellow-300 text-yellow-900 px-4 py-2 mb-6 rounded">
                            <strong>Partner Dashboard:</strong> You can edit your own campaigns.
                        </div>
                    )}

                    {isPartnerRep && (
                        <div className="flex items-center gap-3 mb-4">
                            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-200">
                                <input
                                    type="checkbox"
                                    checked={showOnlyMine}
                                    onChange={() => setShowOnlyMine(!showOnlyMine)}
                                />
                                Show only my campaigns
                            </label>
                        </div>
                    )}
                    <Link
                        to="/partner/campaigns/new"
                        className="inline-block bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded mb-6"
                    >
                        + New Flash Campaign
                    </Link>
                    <CampaignFilter onFilterChange={setFilters} />
                    <ContactGroupList filters={filters} myOnly={isPartnerRep && showOnlyMine} userEmail={user.email} />
                </>
            ) : (
                <p className="text-center text-gray-600">Loading user info...</p>
            )}
        </div>
    );
};

export default Dashboard;
