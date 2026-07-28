// src/components/AppNav.tsx
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useUser } from "../context/UserContext";
import { API_BASE_URL } from "../config";

type Theme = "light" | "dark";

const THEME_STORAGE_KEY = "govreach-theme";

const linkBase =
  "flex items-center gap-2 w-full px-3 py-2 rounded text-sm " +
  "text-gray-800 hover:bg-gray-100 " +
  "dark:text-gray-200 dark:hover:bg-gray-800";

const activeCls =
  "bg-blue-50 text-blue-700 " +
  "dark:bg-blue-950 dark:text-blue-300";

function getInitialTheme(): Theme {
  if (typeof window === "undefined") {
    return "light";
  }

  const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);

  if (savedTheme === "light" || savedTheme === "dark") {
    return savedTheme;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export default function AppNav() {
  const { user, isAdmin, isPartner } = useUser();
  const nav = useNavigate();
  const loc = useLocation();

  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  const isDarkMode = theme === "dark";

  const logout = async () => {
    await fetch(`${API_BASE_URL}/logout`, {
      credentials: "include",
    });

    nav("/");
    window.location.reload();
  };

  const toggleTheme = () => {
    setTheme((currentTheme) =>
      currentTheme === "dark" ? "light" : "dark"
    );
  };

  useEffect(() => {
    const root = document.documentElement;

    root.classList.toggle("dark", isDarkMode);
    root.style.colorScheme = isDarkMode ? "dark" : "light";

    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme, isDarkMode]);

  useEffect(() => {
    setOpen(false);
  }, [loc.pathname]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

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

  const DrawerLink = ({
    to,
    children,
  }: {
    to: string;
    children: React.ReactNode;
  }) => (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `${linkBase} ${isActive ? activeCls : ""}`
      }
    >
      {children}
    </NavLink>
  );

  const role = user?.role ?? "guest";

  const roleBadge =
    role === "admin"
      ? "badge badge-admin"
      : role === "partner"
        ? "badge badge-partner"
        : role === "contributor"
          ? "badge badge-contributor"
          : role === "user"
            ? "badge badge-user"
            : "badge badge-guest";

  return (
    <>
      <header
        className={`
          fixed top-0 inset-x-0 z-50 h-11 border-b
          ${roleBadge}
        `}
      >
        <div className="h-full px-2 sm:px-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Open menu"
              aria-expanded={open}
              aria-controls="app-navigation-drawer"
              onClick={() => setOpen(true)}
              className="
                p-2 rounded
                hover:bg-gray-100
                dark:hover:bg-gray-800
              "
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M3 6h18M3 12h18M3 18h18"
                  stroke="currentColor"
                  strokeWidth="2"
                />
              </svg>
            </button>

            <NavLink to="/dashboard" className="font-semibold">
              GovReach
            </NavLink>
          </div>

          <div className={`text-[11px] px-2 py-0.5 rounded-full ${roleBadge}`}>
            Role: <span className="font-medium capitalize">{role}</span>
          </div>
        </div>
      </header>

      <div
        onClick={() => setOpen(false)}
        className={`
          fixed inset-0 z-40 bg-black/30 transition-opacity
          ${
            open
              ? "opacity-100 pointer-events-auto"
              : "opacity-0 pointer-events-none"
          }
        `}
        aria-hidden={!open}
      />

      <aside
        id="app-navigation-drawer"
        className={`
          fixed top-0 left-0 z-50 h-full w-72
          bg-white border-r border-gray-200
          dark:bg-gray-900 dark:border-gray-700
          transform transition-transform
          ${open ? "translate-x-0" : "-translate-x-full"}
        `}
        role="dialog"
        aria-modal="true"
        aria-label="Main navigation"
      >
        <div
          className="
            h-11 px-3 border-b border-gray-200
            dark:border-gray-700
            flex items-center justify-between
          "
        >
          <span className="font-semibold text-gray-900 dark:text-gray-100">
            Navigation
          </span>

          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="
              p-2 rounded
              text-gray-700 hover:bg-gray-100
              dark:text-gray-200 dark:hover:bg-gray-800
            "
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M6 6l12 12M18 6L6 18"
                stroke="currentColor"
                strokeWidth="2"
              />
            </svg>
          </button>
        </div>

        <nav className="h-[calc(100%-44px)] overflow-y-auto p-3 space-y-6">
          <section>
            <div
              className="
                px-3 pb-2 text-[11px] uppercase tracking-wide
                text-gray-500 dark:text-gray-400
              "
            >
              General
            </div>

            <DrawerLink to="/officials">🔎 Find Officials</DrawerLink>
            <DrawerLink to="/partner/campaigns/new">
              ✉️ New Campaign
            </DrawerLink>
            <DrawerLink to="/dashboard">🏠 Dashboard</DrawerLink>

            <button
              type="button"
              role="switch"
              aria-checked={isDarkMode}
              onClick={toggleTheme}
              className={`
                mt-1 flex w-full items-center justify-between
                rounded px-3 py-2 text-sm
                text-gray-800 hover:bg-gray-100
                dark:text-gray-200 dark:hover:bg-gray-800
                focus-visible:outline-none
                focus-visible:ring-2
                focus-visible:ring-blue-500
                focus-visible:ring-offset-2
                dark:focus-visible:ring-offset-gray-900
              `}
            >
              <span className="flex items-center gap-2">
                <span aria-hidden="true">
                  {isDarkMode ? "🌙" : "☀️"}
                </span>
                Dark mode
              </span>

              <span
                aria-hidden="true"
                className={`
                  relative inline-flex h-5 w-9 shrink-0
                  rounded-full transition-colors
                  ${isDarkMode ? "bg-blue-600" : "bg-gray-300"}
                `}
              >
                <span
                  className={`
                    inline-block h-4 w-4
                    translate-y-0.5 rounded-full bg-white
                    shadow transition-transform
                    ${
                      isDarkMode
                        ? "translate-x-[18px]"
                        : "translate-x-0.5"
                    }
                  `}
                />
              </span>
            </button>
          </section>

          {(isAdmin || isPartner) && (
            <section>
              <div
                className="
                  px-3 pb-2 text-[11px] uppercase tracking-wide
                  text-gray-500 dark:text-gray-400
                "
              >
                Review
              </div>

              <DrawerLink to="/review-submissions">
                🧾 Review Submissions
              </DrawerLink>

              <DrawerLink to="/batch-upload">
                📤 Batch Upload
              </DrawerLink>
            </section>
          )}

          {isAdmin && (
            <section>
              <div
                className="
                  px-3 pb-2 text-[11px] uppercase tracking-wide
                  text-gray-500 dark:text-gray-400
                "
              >
                Admin
              </div>

              <DrawerLink to="/admin/issues">
                🏷️ Issue Curation
              </DrawerLink>
            </section>
          )}

          <section>
            <div
              className="
                px-3 pb-2 text-[11px] uppercase tracking-wide
                text-gray-500 dark:text-gray-400
              "
            >
              Account
            </div>

            {user ? (
              <div
                className="
                  px-3 py-2 rounded border
                  border-gray-200
                  dark:border-gray-700
                  dark:bg-gray-800
                "
              >
                <div className="text-sm font-medium truncate text-gray-900 dark:text-gray-100">
                  {user.name}
                </div>

                <div className="text-xs text-gray-600 dark:text-gray-400 truncate">
                  {user.email}
                </div>

                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={logout}
                    className="
                      px-3 py-1 text-sm rounded
                      bg-red-500 hover:bg-red-600 text-white
                    "
                  >
                    Logout
                  </button>
                </div>
              </div>
            ) : (
              <NavLink to="/" className={linkBase}>
                🔐 Login
              </NavLink>
            )}
          </section>
        </nav>
      </aside>
    </>
  );
}