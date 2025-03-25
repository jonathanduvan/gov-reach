import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import PartnerRequest from "./pages/PartnerRequest";
import Dashboard from "./pages/Dashboard"; // already exists
import ContactCampaignPage from "./pages/ContactCampaignPage";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/partner" element={<PartnerRequest />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/contact/:id" element={<ContactCampaignPage />} />

      </Routes>
    </Router>
  );
}

export default App;
