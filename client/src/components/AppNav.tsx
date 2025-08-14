// src/components/AppNav.tsx
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useUser } from "../context/UserContext";
import { API_BASE_URL } from "../config";

const linkBase = "flex items-center gap-2 w-full px-3 py-2 rounded text-sm hover:bg-gray-100 text-gray-800";
const activeCls = "bg-blue-50 text-blue-700";

export default function AppNav() {
  const { user, isAdmin, isPartner } = useUser();
  const nav = useNavigate();
  const loc = useLocation();
  const [open, setOpen] = useState(false);

  const logout = async () => {
    await fetch(`${API_BASE_URL}/logout`, { credentials: "include" });
    nav("/");
    window.location.reload();
  };

  useEffect(() => setOpen(false), [loc.pathname]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    if (open) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", onKey);
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const DrawerLink = (props: { to: string; children: React.ReactNode }) => (
    <NavLink to={props.to} className={({ isActive }) => `${linkBase} ${isActive ? activeCls : ""}`}>
      {props.children}
    </NavLink>
  );

  const role = user?.role ?? "guest";
  const roleBadge =
    role === "admin" ? "badge badge-admin" :
    role === "partner" ? "badge badge-partner" :
    role === "contributor" ? "badge badge-contributor" :
    role === "user" ? "badge badge-user" :
    "badge badge-guest";
  return (
    <>
      {/* Full-bleed thin bar (no max-width) so it aligns with the left drawer */}
      <header className={`fixed top-0 inset-x-0 z-50 h-11 ${roleBadge} border-b`}>
        <div className="h-full px-2 sm:px-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              aria-label="Open menu"
              onClick={() => setOpen(true)}
              className="p-2 rounded hover:bg-gray-100"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" strokeWidth="2" />
              </svg>
            </button>
            <NavLink to="/dashboard" className="font-semibold">GovReach</NavLink>
          </div>

          {/* Right: role badge (updates color when role changes) */}
          <div className={`text-[11px] px-2 py-0.5 rounded-full ${roleBadge}`}>
            Role: <span className="font-medium capitalize">{role}</span>
          </div>
        </div>
      </header>

      {/* Overlay */}
      <div
        onClick={() => setOpen(false)}
        className={`fixed inset-0 z-40 bg-black/30 transition-opacity ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        aria-hidden={!open}
      />

      {/* Left drawer */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-72 bg-white border-r transform transition-transform ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Main navigation"
      >
        {/* Drawer header shares the top bar height for continuity */}
        <div className="h-11 px-3 border-b flex items-center justify-between">
          <span className="font-semibold">Navigation</span>
          <button
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="p-2 rounded hover:bg-gray-100"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" />
            </svg>
          </button>
        </div>

        <nav className="h-[calc(100%-44px)] overflow-y-auto p-3 space-y-6">
          <section>
            <div className="px-3 pb-2 text-[11px] uppercase tracking-wide text-gray-500">General</div>
            <DrawerLink to="/officials">🔎 Find Officials</DrawerLink>
            <DrawerLink to="/partner/campaigns/new">✉️ New Campaign</DrawerLink>
            <DrawerLink to="/dashboard">🏠 Dashboard</DrawerLink>
          </section>

          {(isAdmin || isPartner) && (
            <section>
              <div className="px-3 pb-2 text-[11px] uppercase tracking-wide text-gray-500">Review</div>
              <DrawerLink to="/review-submissions">🧾 Review Submissions</DrawerLink>
              <DrawerLink to="/batch-upload">📤 Batch Upload</DrawerLink>
            </section>
          )}

          {isAdmin && (
            <section>
              <div className="px-3 pb-2 text-[11px] uppercase tracking-wide text-gray-500">Admin</div>
              <DrawerLink to="/admin">🛠️ Admin Home</DrawerLink>
              <DrawerLink to="/admin/issues">🏷️ Issue Curation</DrawerLink>
            </section>
          )}

          <section>
            <div className="px-3 pb-2 text-[11px] uppercase tracking-wide text-gray-500">Account</div>
            {user ? (
              <div className="px-3 py-2 rounded border">
                <div className="text-sm font-medium truncate">{user.name}</div>
                <div className="text-xs text-gray-600 truncate">{user.email}</div>
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={logout}
                    className="px-3 py-1 text-sm rounded bg-red-500 hover:bg-red-600 text-white"
                  >
                    Logout
                  </button>
                </div>
              </div>
            ) : (
              <NavLink to="/" className={linkBase}>🔐 Login</NavLink>
            )}
          </section>
        </nav>
      </aside>
    </>
  );
}

// helper so TS doesn't complain above
const roleBadgeMap = {
  admin: "",
  partner: "",
  contributor: "",
  user: "",
  guest: "",
};
