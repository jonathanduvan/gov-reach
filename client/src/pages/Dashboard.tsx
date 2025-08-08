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
                    {isAdmin && (
                    <section className="mb-8">
                        <h2 className="text-lg font-semibold mb-2">Admin Tools</h2>
                        <div className="grid sm:grid-cols-3 gap-3">
                        <Link to="/review-submissions" className="border rounded p-4 bg-white hover:bg-gray-50">
                            <div className="font-medium">Review Submissions</div>
                            <div className="text-sm text-gray-600">Resolve threads; approve data.</div>
                        </Link>
                        <Link to="/admin/issues" className="border rounded p-4 bg-white hover:bg-gray-50">
                            <div className="font-medium">Issue Curation</div>
                            <div className="text-sm text-gray-600">Aliases, merges, pending toggle.</div>
                        </Link>
                        <Link to="/batch-upload" className="border rounded p-4 bg-white hover:bg-gray-50">
                            <div className="font-medium">Batch Upload</div>
                            <div className="text-sm text-gray-600">Import CSV/JSON with preview.</div>
                        </Link>
                        </div>
                    </section>
                    )}  
                   
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
                    <div className="mb-8">
                    <h2 className="text-lg font-semibold mb-3">Quick actions</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        <ActionTile
                        title="Find Officials"
                        description="Look up verified contacts by city/state and pick who to reach."
                        to="/officials"
                        accent="indigo"
                        icon={
                            <svg viewBox="0 0 24 24" className="h-5 w-5 text-gray-700" fill="none" stroke="currentColor">
                            <circle cx="11" cy="11" r="7" strokeWidth="2"/><path d="M21 21l-4.3-4.3" strokeWidth="2"/>
                            </svg>
                        }
                        />
                        <ActionTile
                        title="Start a Campaign"
                        description="Create a draft outreach and prefill officials you select."
                        to="/partner/campaigns/new"
                        accent="green"
                        icon={
                            <svg viewBox="0 0 24 24" className="h-5 w-5 text-gray-700" fill="none" stroke="currentColor">
                            <path d="M3 5h18M6 10h12M9 15h6" strokeWidth="2" />
                            </svg>
                        }
                        />
                        <ActionTile
                        title="Submit an Official"
                        description="Contribute new info or corrections for review."
                        onClick={() => setSubmitModalOpen(true)}
                        accent="blue"
                        icon={
                            <svg viewBox="0 0 24 24" className="h-5 w-5 text-gray-700" fill="none" stroke="currentColor">
                            <path d="M12 5v14M5 12h14" strokeWidth="2"/>
                            </svg>
                        }
                        />
                    </div>
                    </div>
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
