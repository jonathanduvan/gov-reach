import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import PartnerRequest from "./pages/PartnerRequest";
import Dashboard from "./pages/Dashboard"; // already exists
import ContactCampaignPage from "./pages/ContactCampaignPage";
import PartnerEditCampaign from "./pages/PartnerEditCampaign";
import PartnerCreateCampaign from "./pages/PartnerCreateCampaign";
import ReviewerDashboard from "./pages/ReviewerDashboard";
import BatchUpload from "./pages/BatchUpload";
import OfficialsLookupPage from "./pages/OfficialsLookupPage";
import IssueCurationPage from "./pages/IssueCurationPage";
import AppNav from "./components/AppNav";
import AdminHome from "./pages/AdminHome";


function App() {
  return (
    <Router>
      <AppNav />
      <main className="max-w-6xl mx-auto px-4 py-6">
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/partner" element={<PartnerRequest />} />
        <Route path="/batch-upload" element={<BatchUpload />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/review-submissions" element={<ReviewerDashboard />} />
        <Route path="/contact/:id" element={<ContactCampaignPage />} />
        <Route path="/officials" element={<OfficialsLookupPage />} />
        <Route path="/partner/campaigns/:id/edit" element={<PartnerEditCampaign />} />
        <Route path="/partner/campaigns/new" element={<PartnerCreateCampaign />} />
        <Route path="/admin/issues" element={<IssueCurationPage />} />
        <Route path="/admin" element={<AdminHome />} />
      </Routes>
      </main>
    </Router>
  );
}

export default App;
