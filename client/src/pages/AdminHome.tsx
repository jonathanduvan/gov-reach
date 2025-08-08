import { useUser } from "../context/UserContext";
import { Link } from "react-router-dom";

export default function AdminHome() {
  const { isAdmin } = useUser();
  if (!isAdmin) return <div className="max-w-5xl mx-auto p-6 text-red-700">Admins only.</div>;

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Admin</h1>
      <div className="grid sm:grid-cols-2 gap-4">
        <Link to="/review-submissions" className="border rounded p-4 hover:bg-gray-50">
          <div className="font-semibold mb-1">Review Submissions</div>
          <div className="text-sm text-gray-600">Approve, merge, or reject official data.</div>
        </Link>
        <Link to="/admin/issues" className="border rounded p-4 hover:bg-gray-50">
          <div className="font-semibold mb-1">Issue Curation</div>
          <div className="text-sm text-gray-600">Aliases, merges, pending status, usage counts.</div>
        </Link>
        <Link to="/batch-upload" className="border rounded p-4 hover:bg-gray-50">
          <div className="font-semibold mb-1">Batch Upload</div>
          <div className="text-sm text-gray-600">Import CSV/JSON, preview & error export.</div>
        </Link>
      </div>
    </div>
  );
}
