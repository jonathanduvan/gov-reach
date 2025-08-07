// src/pages/ReviewerDashboard.tsx
import React, { useEffect, useState } from "react";
import { listPendingSubmissions } from "../services/submissions";
import SubmissionCard from "../components/SubmissionCard";
import { useUser } from "../context/UserContext";

const ReviewerDashboard = () => {
  const { user } = useUser();
  const [subs, setSubs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetch = async () => {
    setLoading(true);
    try {
      const data = await listPendingSubmissions();
      setSubs(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetch();
  }, []);

  if (!user) return <div>Loading user...</div>;
  if (user.role !== "admin" && user.role !== "partner")
    return <div className="p-6">You don’t have permission to review submissions.</div>;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Pending Official Submissions</h1>
      {loading && <div>Loading...</div>}
      {!loading && subs.length === 0 && <div>No pending submissions.</div>}
      {subs.map((s) => (
        <SubmissionCard key={s._id} submission={s} onUpdated={fetch} />
      ))}
    </div>
  );
};

export default ReviewerDashboard;
