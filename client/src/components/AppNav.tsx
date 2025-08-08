import { NavLink, useNavigate } from "react-router-dom";
import { useUser } from "../context/UserContext";
import { API_BASE_URL } from "../config";

const linkCls = ({ isActive }: {isActive: boolean}) =>
  `px-3 py-2 rounded text-sm ${isActive ? "bg-blue-600 text-white" : "text-gray-700 hover:bg-gray-100"}`;

export default function AppNav() {
  const { user, isAdmin, isPartner } = useUser();
  const nav = useNavigate();

  const logout = async () => {
    await fetch(`${API_BASE_URL}/logout`, { credentials: "include" });
    nav("/");
    window.location.reload();
  };

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b">
      <div className="max-w-6xl mx-auto px-4 h-12 flex items-center justify-between">
        <NavLink to="/Dashboard" className="font-semibold">GovReach</NavLink>

        {/* Primary nav */}
        <nav className="flex items-center gap-1">
          <NavLink to="/officials" className={linkCls}>Find Officials</NavLink>
          <NavLink to="/partner/campaigns/new" className={linkCls}>New Campaign</NavLink>

          {(isAdmin || isPartner) && (
            <NavLink to="/review-submissions" className={linkCls}>Review</NavLink>
          )}

          {isAdmin && (
            <div className="relative group">
              <button className="px-3 py-2 rounded text-sm text-gray-700 hover:bg-gray-100">
                Admin
              </button>
              <div className="absolute right-0 mt-1 hidden group-hover:block bg-white border rounded shadow text-sm min-w-[180px]">
                <NavLink to="/admin" className="block px-3 py-2 hover:bg-gray-50">Admin Home</NavLink>
                <NavLink to="/admin/issues" className="block px-3 py-2 hover:bg-gray-50">Issue Curation</NavLink>
                <NavLink to="/batch-upload" className="block px-3 py-2 hover:bg-gray-50">Batch Upload</NavLink>
              </div>
            </div>
          )}
        </nav>

        {/* User area */}
        <div className="flex items-center gap-2 text-sm">
          {user ? (
            <>
              <span className="text-gray-600 hidden sm:inline">
                {user.name} · {user.role}
              </span>
              <button onClick={logout} className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded">Logout</button>
            </>
          ) : (
            <NavLink to="/" className="px-3 py-1 border rounded">Login</NavLink>
          )}
        </div>
      </div>
    </header>
  );
}
