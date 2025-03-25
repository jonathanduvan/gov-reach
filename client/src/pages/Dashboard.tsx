// src/pages/Dashboard.tsx
import { useEffect, useState } from "react";
import { API_BASE_URL } from "../config";
import CampaignFilter from "../components/CampaignFilter";
import ContactGroupList from "../components/ContactGroupList";

interface User {
    name: string;
    email: string;
    provider: "gmail" | "outlook";
}

const Dashboard = () => {
    const [user, setUser] = useState<User | null>(null);
    const [filters, setFilters] = useState({ issue: "", partner: "" });

    useEffect(() => {
        fetch(`${API_BASE_URL}/user`, { credentials: "include" })
            .then((res) => res.json())
            .then((data) => setUser(data))
            .catch(() => setUser(null));
    }, []);

    const handleLogout = async () => {
        await fetch(`${API_BASE_URL}/logout`, { credentials: "include" });
        window.location.href = "/";
    };

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

                    <CampaignFilter onFilterChange={setFilters} />
                    <ContactGroupList filters={filters} />
                </>
            ) : (
                <p className="text-center text-gray-600">Loading user info...</p>
            )}
        </div>
    );
};

export default Dashboard;
