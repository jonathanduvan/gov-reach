import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import PartnerRequest from "./pages/PartnerRequest";
import Dashboard from "./pages/Dashboard"; // already exists
import ContactCampaignPage from "./pages/ContactCampaignPage";
import PartnerEditCampaign from "./pages/PartnerEditCampaign";
import PartnerCreateCampaign from "./pages/PartnerCreateCampaign";


function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/partner" element={<PartnerRequest />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/contact/:id" element={<ContactCampaignPage />} />
        <Route path="/partner/campaigns/:id/edit" element={<PartnerEditCampaign />} />
        <Route path="/partner/campaigns/new" element={<PartnerCreateCampaign />} />

      </Routes>
    </Router>
  );
}

export default App;
