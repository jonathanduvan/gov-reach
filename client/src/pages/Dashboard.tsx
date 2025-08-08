import { useEffect, useState } from "react";
import { API_BASE_URL } from "../config";
import CampaignFilter from "../components/CampaignFilter";
import ContactGroupList from "../components/ContactGroupList";
import { Link } from "react-router-dom";
import { useUser } from "../context/UserContext";
import SuggestEditModal from "../components/SuggestEditModal";

const Dashboard = () => {
    const [filters, setFilters] = useState({ issue: "", partner: "" });
    const [showOnlyMine, setShowOnlyMine] = useState(false);
    const { user, loading, isPartner, isAdmin } = useUser();

    const [submitModalOpen, setSubmitModalOpen] = useState(false);

    const handleLogout = async () => {
        await fetch(`${API_BASE_URL}/logout`, { credentials: "include" });
        window.location.href = "/";
    };

    const isPartnerRep = isPartner;
    const canReview = isAdmin || isPartner;

    if (loading) {
        return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="text-center text-gray-600">Loading user info...</div>
        </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 px-6 py-10">
            {user ? (
                <>
                    <div className="text-center mb-10">
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                            Welcome, {user.name}
                        </h1>
                        <p className="text-gray-600 dark:text-gray-300">
                            Your email: {user.email} | Provider: {user.provider.toUpperCase()} | Role: {user.role}
                        </p>
                        <button
                            onClick={handleLogout}
                            className="mt-4 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded"
                        >
                            Logout
                        </button>
                    </div>
                    {/* Submit new official */}
                    <div className="mb-6">
                        <button
                        onClick={() => setSubmitModalOpen(true)}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded"
                        >
                        + Submit Official
                        </button>
                    </div>
                    {canReview && (
                        <Link
                            to="/batch-upload"
                            className="ml-4 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded"
                        >
                            Batch Upload
                        </Link>
                    )}
                    {isPartnerRep && (
                        <div className="bg-yellow-100 border border-yellow-300 text-yellow-900 px-4 py-2 mb-6 rounded">
                            <strong>Partner Dashboard:</strong> You can edit your own campaigns.
                        </div>
                    )}
                   {/* Review submissions link for admin/partners */}
                    {canReview && (
                        <div className="mb-6">
                        <Link
                            to="/review-submissions"
                            className="inline-block bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded"
                        >
                            Review Submissions
                        </Link>
                        </div>
                    )}
                    {isPartnerRep && (
                        <div className="flex items-center gap-3 mb-4">
                            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-200">
                                <input
                                    type="checkbox"
                                    checked={showOnlyMine}
                                    onChange={() => setShowOnlyMine(!showOnlyMine)}
                                                      className="mr-1"
                                />
                                Show only my campaigns
                            </label>
                        </div>
                    )}
                    <Link
                        to="/partner/campaigns/new"
                        className="inline-block bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded mb-6"
                    >
                        + Reach Out to the Gov
                    </Link>
                    <CampaignFilter onFilterChange={setFilters} />
                    <ContactGroupList filters={filters} myOnly={isPartnerRep && showOnlyMine} userEmail={user.email} />
                    +                   {/* Suggest/Edit modal for create flow */}
                    <SuggestEditModal
                        open={submitModalOpen}
                        official={undefined}
                        onClose={() => setSubmitModalOpen(false)}
                        onSubmitted={() => {
                        // optional: show toast or refresh state
                        setSubmitModalOpen(false);
                        }}
                    />
                </>
            ) : (
                <p className="text-center text-gray-600">Not logged in.</p>
            )}
        </div>
    );
};

export default Dashboard;
