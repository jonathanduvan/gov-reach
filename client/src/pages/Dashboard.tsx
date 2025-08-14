import { useState } from "react";
import CampaignFilter from "../components/CampaignFilter";
import ContactGroupList from "../components/ContactGroupList";
import { Link } from "react-router-dom";
import { useUser } from "../context/UserContext";
import SuggestEditModal from "../components/SuggestEditModal";
import ActionTile from "../components/ActionTile";

const Dashboard = () => {
    const [filters, setFilters] = useState({ issue: "", partner: "" });
    const [showOnlyMine, setShowOnlyMine] = useState(false);
    const { user, loading, isPartner, isAdmin } = useUser();

    const [submitModalOpen, setSubmitModalOpen] = useState(false);

    const isPartnerRep = isPartner;

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
                    {isPartnerRep && (
                        <div className="bg-yellow-100 border border-yellow-300 text-yellow-900 px-4 py-2 mb-6 rounded">
                            <strong>Partner Dashboard:</strong> You can edit your own campaigns.
                        </div>
                    )}
                   {/* Review submissions link for admin/partners */}
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
                    <CampaignFilter onFilterChange={setFilters} />
                    <ContactGroupList filters={filters} myOnly={isPartnerRep && showOnlyMine} userEmail={user.email} />
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
