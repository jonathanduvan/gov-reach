// src/pages/OfficialsLookupPage.tsx
import React, { useMemo, useRef, useState, useEffect } from "react";
import { searchOfficials } from "../services/officials";
import { useNavigate } from "react-router-dom";
import { useUser } from "../context/UserContext";
import OfficialQuickViewModal from "../components/OfficialQuickViewModal";
import FilterBar from "../components/FilterBar";
import { reverseGeocode } from "../api";
import { getPositionSmart, explainGeoError } from "../utils/geoClient";

const ALL_LEVELS = ["municipal", "county", "regional", "state", "federal", "tribal"] as const;

const US_STATE_ABBR: Record<string, string> = {
  Alabama: "AL", Alaska: "AK", Arizona: "AZ", Arkansas: "AR", California: "CA", Colorado: "CO", Connecticut: "CT", Delaware: "DE",
  "District of Columbia": "DC", Florida: "FL", Georgia: "GA", Hawaii: "HI", Idaho: "ID", Illinois: "IL", Indiana: "IN", Iowa: "IA",
  Kansas: "KS", Kentucky: "KY", Louisiana: "LA", Maine: "ME", Maryland: "MD", Massachusetts: "MA", Michigan: "MI", Minnesota: "MN",
  Mississippi: "MS", Missouri: "MO", Montana: "MT", Nebraska: "NE", Nevada: "NV", "New Hampshire": "NH", "New Jersey": "NJ",
  "New Mexico": "NM", "New York": "NY", "North Carolina": "NC", "North Dakota": "ND", Ohio: "OH", Oklahoma: "OK", Oregon: "OR",
  Pennsylvania: "PA", "Rhode Island": "RI", "South Carolina": "SC", "South Dakota": "SD", Tennessee: "TN", Texas: "TX", Utah: "UT",
  Vermont: "VT", Virginia: "VA", Washington: "WA", "West Virginia": "WV", Wisconsin: "WI", Wyoming: "WY",
};

// normalize "ca" / "California" / "CALIFORNIA" -> "CA"
function normalizeStateAbbr(input?: string): string | undefined {
  if (!input) return undefined;
  const s = input.trim();
  if (!s) return undefined;
  if (s.length === 2) return s.toUpperCase();
  // try proper-case lookup
  const proper = s
    .toLowerCase()
    .replace(/\b\w/g, (m) => m.toUpperCase()); // "california" -> "California"
  return US_STATE_ABBR[proper] || undefined;
}

const PAGE_SIZE_OPTIONS = [10, 25, 50];

const OfficialsLookupPage: React.FC = () => {
  const nav = useNavigate();
  const { user } = useUser();

  // filters
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [levels, setLevels] = useState<string[]>([...ALL_LEVELS]);
  const [q, setQ] = useState("");
  const [issue, setIssue] = useState("");

  // results & UI
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});

  // geolocation UI
  const [locLabel, setLocLabel] = useState<string | null>(null);

  // pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(25);

  // quick view modal
  const [viewOfficial, setViewOfficial] = useState<any | null>(null);

  // request nonces (cancel stale responses)
  const geoNonce = useRef(0);
  const searchNonce = useRef(0);

  const total = results.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const pageStart = (page - 1) * pageSize;
  const pageEnd = Math.min(total, pageStart + pageSize);

  const pageRows = useMemo(() => results.slice(pageStart, pageEnd), [results, pageStart, pageEnd]);
  const anySelected = useMemo(() => Object.values(selectedIds).some(Boolean), [selectedIds]);

  function handleRowClick(e: React.MouseEvent, official: any) {
    const target = e.target as HTMLElement;
    if (target.closest("a,button,input,label")) return;
    setViewOfficial(official);
  }

  // ----- SEARCH -----
  const runSearch = async (overrides?: Partial<{ city: string; state: string; levels: string[]; q: string; issue: string }>) => {
    setError(null);
    setLoading(true);
    setHasSearched(true);

    const nonce = ++searchNonce.current;

    // normalize state before searching
    const stateInput = overrides?.state ?? state;
    const abbr = normalizeStateAbbr(stateInput) ?? (stateInput?.length === 2 ? stateInput.toUpperCase() : undefined);

    const filters = {
      city: (overrides?.city ?? city).trim() || undefined,
      state: abbr,
      levels: overrides?.levels ?? levels,
      q: (overrides?.q ?? q).trim() || undefined,
      issue: (overrides?.issue ?? issue).trim() || undefined,
      limit: 100,
    };

    try {
      const { results } = await searchOfficials(filters);
      if (searchNonce.current !== nonce) return;
      setResults(results || []);
      setSelectedIds({});
      setPage(1);
    } catch (e: any) {
      if (searchNonce.current !== nonce) return;
      console.error(e);
      setError(e?.message || "Search failed");
    } finally {
      if (searchNonce.current === nonce) setLoading(false);
    }
  };

  // helper to run with fresh geo values immediately (no state race)
  const runSearchWithOverrides = async (ovr: Partial<{ city: string; state: string }>) => {
    await runSearch(ovr);
  };

  // ----- GEO LOCATION -----
  const useMyLocation = async (auto = false) => {
    const myNonce = ++geoNonce.current;
    try {
      setLoading(true);

      const pos = await getPositionSmart({
        totalTimeoutMs: auto ? 6000 : 9000,
        minAccuracyMeters: 100000, // be generous
      });

      if (geoNonce.current !== myNonce) return;

      const { latitude, longitude } = pos.coords;
      const geo = await reverseGeocode(latitude, longitude); // expects { city, stateAbbr, raw? }

      if (geoNonce.current !== myNonce) return;

      const foundCity = geo?.city || "";
      const abbr = geo?.stateAbbr || "";

      setCity(foundCity);
      setState(abbr);
      setLocLabel([foundCity, abbr].filter(Boolean).join(", ") || null);

      await runSearchWithOverrides({ city: foundCity, state: abbr });
    } catch (err) {
      if (!auto) alert(explainGeoError(err));
    } finally {
      if (geoNonce.current === myNonce) setLoading(false);
    }
  };

  // Only auto-run location if user has already granted permission
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const p = await (navigator.permissions as any)?.query?.({ name: "geolocation" as PermissionName });
        if (!cancelled && p?.state === "granted") {
          useMyLocation(true);
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounce text query
  useEffect(() => {
    const t = setTimeout(() => {
      if (q.trim().length >= 3) runSearch();
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  // table UI bits
  const allOnPageSelected = pageRows.length > 0 && pageRows.every((r) => !!selectedIds[r._id]);
  const someOnPageSelected = pageRows.some((r) => !!selectedIds[r._id]) && !allOnPageSelected;

  const togglePick = (id: string) => {
    setSelectedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };
  const togglePickAllOnPage = (on: boolean) => {
    const patch: Record<string, boolean> = {};
    pageRows.forEach((r) => {
      patch[r._id] = on;
    });
    setSelectedIds((prev) => ({ ...prev, ...patch }));
  };

  const startCampaign = () => {
    const selected = results.filter((r) => selectedIds[r._id]);
    if (!selected.length) return;
    nav("/partner/campaigns/new", {
      state: {
        preselectedOfficials: selected.map((o) => o._id),
        prefill: {
          title: `Contact officials in ${city || state}`,
          description: `Draft outreach to ${selected.length} officials found via lookup.`,
          officialsPreview: selected.map((o: any) => ({
            id: o._id,
            fullName: o.fullName,
            role: o.role,
            email: o.email,
          })),
        },
      },
    });
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Find Public Officials</h1>

      <FilterBar
        value={{ q, city, state, issue, levels }}
        onChange={(next) => {
          if (next.q !== undefined) setQ(next.q);
          if (next.city !== undefined) setCity(next.city);
          if (next.state !== undefined) setState(next.state);
          if (next.issue !== undefined) setIssue(next.issue);
          if (next.levels !== undefined) setLevels(next.levels);
        }}
        onSearch={() => runSearch()}
        onUseLocation={() => useMyLocation(false)}
        allLevels={[...ALL_LEVELS]}
        loading={loading}
      />

      {error && (
        <div className="mb-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
          {error}
        </div>
      )}

      {locLabel && (
        <div className="text-xs text-gray-600 mb-3">
          Auto-detected location: <span className="font-medium">{locLabel}</span>
        </div>
      )}

      {/* Results header & pagination controls */}
      {results.length > 0 && (
        <div className="mb-3 flex items-center justify-between text-sm text-gray-700">
          <div>
            Sorted by verified/confidence. Showing{" "}
            <span className="font-medium">
              {pageStart + 1}–{pageEnd}
            </span>{" "}
            of <span className="font-medium">{total}</span>.
          </div>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2">
              <span>Rows per page</span>
              <select
                className="border rounded px-2 py-1"
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
              >
                {PAGE_SIZE_OPTIONS.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex items-center gap-1">
              <button
                className="px-2 py-1 border rounded disabled:opacity-50"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                Prev
              </button>
              <span className="px-2">
                {page} / {totalPages}
              </span>
              <button
                className="px-2 py-1 border rounded disabled:opacity-50"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="border rounded overflow-x-auto bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 sticky top-0 z-10">
            <tr>
              <th className="px-3 py-2 border-b w-10">
                <input
                  type="checkbox"
                  checked={allOnPageSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someOnPageSelected;
                  }}
                  onChange={(e) => togglePickAllOnPage(e.target.checked)}
                  aria-label="Select all on page"
                />
              </th>
              <th className="text-left px-3 py-2 border-b">Official</th>
              <th className="text-left px-3 py-2 border-b">Level</th>
              <th className="text-left px-3 py-2 border-b">Location</th>
              <th className="text-left px-3 py-2 border-b">Email</th>
              <th className="text-left px-3 py-2 border-b">Phones</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-gray-500">
                  {loading
                    ? "Searching…"
                    : hasSearched
                    ? "No results match these filters."
                    : "No results yet. Try searching."}
                </td>
              </tr>
            ) : (
              pageRows.map((o) => (
                <tr
                  key={o._id}
                  className="odd:bg-white even:bg-gray-50 hover:bg-gray-100 cursor-pointer"
                  onClick={(e) => handleRowClick(e, o)}
                >
                  <td className="px-3 py-2 align-top">
                    <input
                      type="checkbox"
                      checked={!!selectedIds[o._id]}
                      onChange={() => togglePick(o._id)}
                      aria-label={`Select ${o.fullName}`}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </td>
                  <td className="px-3 py-2 align-top">
                    <div className="font-medium">{o.fullName}</div>
                    <div className="text-xs text-gray-600">
                      {o.role}
                      {o.verified && (
                        <span className="ml-2 text-[10px] bg-green-100 text-green-800 px-1.5 py-0.5 rounded align-middle">
                          verified
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2 align-top">
                    <div className="capitalize">{o.level}</div>
                    {typeof o.confidenceScore === "number" && (
                      <div className="text-[10px] text-gray-500">conf: {o.confidenceScore.toFixed(2)}</div>
                    )}
                  </td>
                  <td className="px-3 py-2 align-top">
                    <div className="text-sm">
                      {o.jurisdiction?.city || "—"}, {o.state}
                    </div>
                    <div className="text-[10px] text-gray-500">{o.category || ""}</div>
                  </td>
                  <td className="px-3 py-2 align-top">
                    {o.email ? (
                      <a
                        className="underline text-blue-700 break-all"
                        href={`mailto:${o.email}`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {o.email}
                      </a>
                    ) : (
                      <span className="text-gray-500">no email</span>
                    )}
                  </td>
                  <td className="px-3 py-2 align-top">
                    {Array.isArray(o.phoneNumbers) && o.phoneNumbers.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {o.phoneNumbers.slice(0, 3).map((p: any, idx: number) => (
                          <span key={idx} className="inline-flex items-center text-xs bg-gray-100 px-2 py-0.5 rounded">
                            {p.number}
                            {p.label ? ` (${p.label})` : ""}
                            {typeof p.priority === "number" ? ` · p${p.priority}` : ""}
                          </span>
                        ))}
                        {o.phoneNumbers.length > 3 && (
                          <span className="text-xs text-gray-500">+{o.phoneNumbers.length - 3} more</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-500">—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer actions */}
      {results.length > 0 && (
        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            {Object.values(selectedIds).filter(Boolean).length} selected
          </div>
          <button
            disabled={!anySelected}
            onClick={startCampaign}
            className={`px-4 py-2 rounded ${anySelected ? "bg-green-600 text-white" : "bg-gray-300 text-gray-600"}`}
          >
            Start a campaign with these
          </button>
        </div>
      )}

      {!user && (
        <div className="mt-6 text-sm text-yellow-900 bg-yellow-100 border border-yellow-300 rounded p-3">
          You can find officials without logging in. To create a campaign, please log in first.
        </div>
      )}

      <OfficialQuickViewModal open={!!viewOfficial} official={viewOfficial} onClose={() => setViewOfficial(null)} />
    </div>
  );
};

export default OfficialsLookupPage;
