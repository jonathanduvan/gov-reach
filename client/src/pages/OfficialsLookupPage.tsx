import React, { useMemo, useRef, useState, useEffect } from "react";
import { searchOfficials } from "../services/officials";
import SuggestEditModal from "../components/SuggestEditModal";
import { useNavigate } from "react-router-dom";
import { useUser } from "../context/UserContext";

// TODO replace with shared types
const ALL_LEVELS = ["municipal","county","regional","state","federal","tribal"];

const US_STATE_ABBR: Record<string,string> = {
  "Alabama":"AL","Alaska":"AK","Arizona":"AZ","Arkansas":"AR","California":"CA","Colorado":"CO","Connecticut":"CT","Delaware":"DE",
  "District of Columbia":"DC","Florida":"FL","Georgia":"GA","Hawaii":"HI","Idaho":"ID","Illinois":"IL","Indiana":"IN","Iowa":"IA",
  "Kansas":"KS","Kentucky":"KY","Louisiana":"LA","Maine":"ME","Maryland":"MD","Massachusetts":"MA","Michigan":"MI","Minnesota":"MN",
  "Mississippi":"MS","Missouri":"MO","Montana":"MT","Nebraska":"NE","Nevada":"NV","New Hampshire":"NH","New Jersey":"NJ","New Mexico":"NM",
  "New York":"NY","North Carolina":"NC","North Dakota":"ND","Ohio":"OH","Oklahoma":"OK","Oregon":"OR","Pennsylvania":"PA",
  "Rhode Island":"RI","South Carolina":"SC","South Dakota":"SD","Tennessee":"TN","Texas":"TX","Utah":"UT","Vermont":"VT",
  "Virginia":"VA","Washington":"WA","West Virginia":"WV","Wisconsin":"WI","Wyoming":"WY"
};

// helpers
function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("timeout")), ms);
    p.then(v => { clearTimeout(t); resolve(v); }, e => { clearTimeout(t); reject(e); });
  });
}
function getPosition(opts: PositionOptions = {}): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) return reject(new Error("geolocation unsupported"));
    navigator.geolocation.getCurrentPosition(resolve, reject, opts);
  });
}
async function reverseGeocode(lat: number, lon: number, signal?: AbortSignal) {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&zoom=10&addressdetails=1`;
  const res = await fetch(url, { headers: { "Accept": "application/json" }, signal });
  if (!res.ok) throw new Error(`reverse geocode failed ${res.status}`);
  return res.json() as Promise<any>;
}

const PAGE_SIZE_OPTIONS = [10, 25, 50];

const OfficialsLookupPage: React.FC = () => {
  const nav = useNavigate();
  const { user } = useUser();

  // filters
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [levels, setLevels] = useState<string[]>(ALL_LEVELS);
  const [q, setQ] = useState("");
  const [issue, setIssue] = useState("");

  // results & UI
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});
  const [editOpenId, setEditOpenId] = useState<string | null>(null);

  // geolocation UI
  const [autoTried, setAutoTried] = useState(false);
  const [locLabel, setLocLabel] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(25);

  const total = results.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const pageStart = (page - 1) * pageSize;
  const pageEnd = Math.min(total, pageStart + pageSize);

  const pageRows = useMemo(
    () => results.slice(pageStart, pageEnd),
    [results, pageStart, pageEnd]
  );

  const anySelected = useMemo(() => Object.values(selectedIds).some(Boolean), [selectedIds]);

  const toggleLevel = (lvl: string) => {
    setLevels(prev => prev.includes(lvl) ? prev.filter(l => l !== lvl) : [...prev, lvl]);
  };

  const runSearch = async () => {
    setLoading(true);
    try {
      const { results } = await searchOfficials({
        city: city.trim() || undefined,
        state: state.trim().toUpperCase() || undefined,
        levels,
        q: q.trim() || undefined,
        issue: issue.trim() || undefined,
        limit: 100
      });
      setResults(results || []);
      setSelectedIds({});
      setPage(1); // reset pagination on new search
    } catch (e) {
      console.error(e);
      alert("Search failed");
    } finally {
      setLoading(false);
    }
  };

  const togglePick = (id: string) => {
    setSelectedIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const togglePickAllOnPage = (on: boolean) => {
    const patch: Record<string, boolean> = {};
    pageRows.forEach(r => { patch[r._id] = on; });
    setSelectedIds(prev => ({ ...prev, ...patch }));
  };

  const startCampaign = () => {
    const selected = results.filter(r => selectedIds[r._id]);
    if (!selected.length) return;
    nav("/partner/campaigns/new", {
      state: {
        preselectedOfficials: selected.map(o => o._id),
        prefill: {
          title: `Contact officials in ${city || state}`,
          description: `Draft outreach to ${selected.length} officials found via lookup.`,
          officialsPreview: selected.map((o: any) => ({
            id: o._id, fullName: o.fullName, role: o.role, email: o.email
          }))
        }
      }
    });
  };

  // auto-locate on mount (fast)
  useEffect(() => {
    (async () => {
      if (autoTried) return;
      setAutoTried(true);
      try {
        const pos = await withTimeout(getPosition({ enableHighAccuracy: false, timeout: 5000, maximumAge: 120000 }), 5000);
        const { latitude, longitude } = pos.coords;

        abortRef.current?.abort();
        const ctrl = new AbortController();
        abortRef.current = ctrl;

        const data = await withTimeout(reverseGeocode(latitude, longitude, ctrl.signal), 3000);
        const addr = data?.address || {};
        const foundCity = addr.city || addr.town || addr.village || addr.hamlet || addr.municipality || "";
        const foundStateName: string = addr.state || "";
        const abbr = US_STATE_ABBR[foundStateName] || (foundStateName.length === 2 ? foundStateName.toUpperCase() : "");

        if (foundCity || abbr) {
          setCity(foundCity);
          setState(abbr);
          setLocLabel(`${foundCity || ""}${foundCity && abbr ? ", " : ""}${abbr || ""}` || null);
          runSearch();
        }
      } catch {
        /* ignore */
      }
    })();
    return () => abortRef.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoTried]);

  const manualUseLocation = async () => {
    try {
      const pos = await withTimeout(getPosition({ enableHighAccuracy: false, timeout: 7000, maximumAge: 120000 }), 7000);
      const { latitude, longitude } = pos.coords;
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      const data = await withTimeout(reverseGeocode(latitude, longitude, ctrl.signal), 3000);
      const addr = data?.address || {};
      const foundCity = addr.city || addr.town || addr.village || addr.hamlet || addr.municipality || "";
      const foundStateName: string = addr.state || "";
      const abbr = US_STATE_ABBR[foundStateName] || (foundStateName.length === 2 ? foundStateName.toUpperCase() : "");
      if (foundCity || abbr) {
        setCity(foundCity);
        setState(abbr);
        setLocLabel(`${foundCity || ""}${foundCity && abbr ? ", " : ""}${abbr || ""}` || null);
        runSearch();
      }
    } catch {
      alert("Couldn’t get your location. You can type city/state instead.");
    }
  };

  // table UI bits
  const allOnPageSelected = pageRows.length > 0 && pageRows.every(r => !!selectedIds[r._id]);
  const someOnPageSelected = pageRows.some(r => !!selectedIds[r._id]) && !allOnPageSelected;

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Find Public Officials</h1>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 mb-2">
        <input
          className="md:col-span-4 border rounded px-3 py-2"
          placeholder="City (e.g., Coral Springs)"
          value={city}
          onChange={(e) => setCity(e.target.value)}
        />
        <input
          className="md:col-span-2 border rounded px-3 py-2"
          placeholder="State (e.g., FL)"
          value={state}
          onChange={(e) => setState(e.target.value)}
        />
        <input
          className="md:col-span-3 border rounded px-3 py-2"
          placeholder="Search text (name, role, email)"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <input
          className="md:col-span-3 border rounded px-3 py-2"
          placeholder="Issue (optional)"
          value={issue}
          onChange={(e) => setIssue(e.target.value)}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-3">
        {ALL_LEVELS.map(lvl => (
          <label key={lvl} className="inline-flex items-center gap-2 text-sm border rounded px-2 py-1">
            <input type="checkbox" checked={levels.includes(lvl)} onChange={() => toggleLevel(lvl)} />
            {lvl}
          </label>
        ))}
        <span className="flex-1" />
        <button
          onClick={manualUseLocation}
          className="border rounded px-3 py-2 text-sm"
          title="Use my location"
        >
          📍 Use my location
        </button>
        <button
          onClick={runSearch}
          disabled={loading}
          className="bg-blue-600 text-white rounded px-4 py-2"
        >
          {loading ? "Searching…" : "Search"}
        </button>
      </div>

      {locLabel && (
        <div className="text-xs text-gray-600 mb-3">
          Auto-detected location: <span className="font-medium">{locLabel}</span>
        </div>
      )}

      {/* Results header & pagination controls */}
      {results.length > 0 && (
        <div className="mb-3 flex items-center justify-between text-sm text-gray-700">
          <div>
            Sorted by verified/confidence. Showing <span className="font-medium">{pageStart + 1}–{pageEnd}</span> of <span className="font-medium">{total}</span>.
          </div>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2">
              <span>Rows per page</span>
              <select
                className="border rounded px-2 py-1"
                value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
              >
                {PAGE_SIZE_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </label>
            <div className="flex items-center gap-1">
              <button
                className="px-2 py-1 border rounded disabled:opacity-50"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                Prev
              </button>
              <span className="px-2">{page} / {totalPages}</span>
              <button
                className="px-2 py-1 border rounded disabled:opacity-50"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
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
                  ref={el => { if (el) el.indeterminate = someOnPageSelected; }}
                  onChange={(e) => togglePickAllOnPage(e.target.checked)}
                  aria-label="Select all on page"
                />
              </th>
              <th className="text-left px-3 py-2 border-b">Official</th>
              <th className="text-left px-3 py-2 border-b">Level</th>
              <th className="text-left px-3 py-2 border-b">Location</th>
              <th className="text-left px-3 py-2 border-b">Email</th>
              <th className="text-left px-3 py-2 border-b">Phones</th>
              <th className="text-right px-3 py-2 border-b">Actions</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-gray-500">No results yet. Try searching.</td>
              </tr>
            ) : (
              pageRows.map((o) => {
                const primaryPhone = (o.phoneNumbers || [])[0]?.number;
                return (
                  <tr key={o._id} className="odd:bg-white even:bg-gray-50">
                    <td className="px-3 py-2 align-top">
                      <input
                        type="checkbox"
                        checked={!!selectedIds[o._id]}
                        onChange={() => togglePick(o._id)}
                        aria-label={`Select ${o.fullName}`}
                      />
                    </td>
                    <td className="px-3 py-2 align-top">
                      <div className="font-medium">{o.fullName}</div>
                      <div className="text-xs text-gray-600">{o.role}
                        {o.verified && (
                          <span className="ml-2 text-[10px] bg-green-100 text-green-800 px-1.5 py-0.5 rounded align-middle">verified</span>
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
                      <div className="text-sm">{o.jurisdiction?.city || "—"}, {o.state}</div>
                      <div className="text-[10px] text-gray-500">{o.category || ""}</div>
                    </td>
                    <td className="px-3 py-2 align-top">
                      {o.email ? (
                        <a className="underline text-blue-700 break-all" href={`mailto:${o.email}`} target="_blank" rel="noreferrer">
                          {o.email}
                        </a>
                      ) : <span className="text-gray-500">no email</span>}
                    </td>
                    <td className="px-3 py-2 align-top">
                      {Array.isArray(o.phoneNumbers) && o.phoneNumbers.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {o.phoneNumbers.slice(0,3).map((p: any, idx: number) => (
                            <span key={idx} className="inline-flex items-center text-xs bg-gray-100 px-2 py-0.5 rounded">
                              {p.number}{p.label ? ` (${p.label})` : ""}{typeof p.priority === "number" ? ` · p${p.priority}` : ""}
                            </span>
                          ))}
                          {o.phoneNumbers.length > 3 && (
                            <span className="text-xs text-gray-500">+{o.phoneNumbers.length - 3} more</span>
                          )}
                        </div>
                      ) : <span className="text-gray-500">—</span>}
                    </td>
                    <td className="px-3 py-2 align-top text-right">
                      <div className="inline-flex gap-2">
                        {primaryPhone && (
                          <a className="underline text-blue-700 text-sm" href={`tel:${primaryPhone}`} rel="noreferrer">Call</a>
                        )}
                        <button
                          className="px-2 py-1 border rounded text-sm"
                          onClick={() => setEditOpenId(o._id)}
                        >
                          Suggest edit
                        </button>
                      </div>
                      {editOpenId === o._id && (
                        <SuggestEditModal
                          open={true}
                          official={o}
                          onClose={() => setEditOpenId(null)}
                          onSubmitted={() => setEditOpenId(null)}
                        />
                      )}
                    </td>
                  </tr>
                );
              })
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
    </div>
  );
};

export default OfficialsLookupPage;
