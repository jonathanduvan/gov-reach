// src/pages/OfficialsLookupPage.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { searchOfficials } from "../services/officials";
import { useUser } from "../context/UserContext";
import OfficialQuickViewModal from "../components/OfficialQuickViewModal";
import FilterBar from "../components/FilterBar";
import { reverseGeocode } from "../api";
import { explainGeoError, getPositionSmart } from "../utils/geoClient";

const ALL_LEVELS = [
  "municipal",
  "county",
  "regional",
  "state",
  "federal",
  "tribal",
] as const;

const US_STATE_ABBR: Record<string, string> = {
  Alabama: "AL",
  Alaska: "AK",
  Arizona: "AZ",
  Arkansas: "AR",
  California: "CA",
  Colorado: "CO",
  Connecticut: "CT",
  Delaware: "DE",
  "District of Columbia": "DC",
  Florida: "FL",
  Georgia: "GA",
  Hawaii: "HI",
  Idaho: "ID",
  Illinois: "IL",
  Indiana: "IN",
  Iowa: "IA",
  Kansas: "KS",
  Kentucky: "KY",
  Louisiana: "LA",
  Maine: "ME",
  Maryland: "MD",
  Massachusetts: "MA",
  Michigan: "MI",
  Minnesota: "MN",
  Mississippi: "MS",
  Missouri: "MO",
  Montana: "MT",
  Nebraska: "NE",
  Nevada: "NV",
  "New Hampshire": "NH",
  "New Jersey": "NJ",
  "New Mexico": "NM",
  "New York": "NY",
  "North Carolina": "NC",
  "North Dakota": "ND",
  Ohio: "OH",
  Oklahoma: "OK",
  Oregon: "OR",
  Pennsylvania: "PA",
  "Rhode Island": "RI",
  "South Carolina": "SC",
  "South Dakota": "SD",
  Tennessee: "TN",
  Texas: "TX",
  Utah: "UT",
  Vermont: "VT",
  Virginia: "VA",
  Washington: "WA",
  "West Virginia": "WV",
  Wisconsin: "WI",
  Wyoming: "WY",
};

const PAGE_SIZE_OPTIONS = [10, 25, 50];

type SearchOverrides = Partial<{
  city: string;
  state: string;
  levels: string[];
  q: string;
  issue: string;
}>;

function normalizeStateAbbr(input?: string): string | undefined {
  if (!input) {
    return undefined;
  }

  const normalized = input.trim();

  if (!normalized) {
    return undefined;
  }

  if (normalized.length === 2) {
    return normalized.toUpperCase();
  }

  const properCase = normalized
    .toLowerCase()
    .replace(/\b\w/g, (character) => character.toUpperCase());

  return US_STATE_ABBR[properCase];
}

const OfficialsLookupPage: React.FC = () => {
  const nav = useNavigate();
  const { user } = useUser();

  // Filters
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [levels, setLevels] = useState<string[]>([...ALL_LEVELS]);
  const [q, setQ] = useState("");
  const [issue, setIssue] = useState("");

  // Results and UI
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});

  // Geolocation UI
  const [locLabel, setLocLabel] = useState<string | null>(null);

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(25);

  // Quick-view modal
  const [viewOfficial, setViewOfficial] = useState<any | null>(null);

  // Request nonces prevent stale responses from updating state
  const geoNonce = useRef(0);
  const searchNonce = useRef(0);

  const total = results.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const pageStart = (page - 1) * pageSize;
  const pageEnd = Math.min(total, pageStart + pageSize);

  const pageRows = useMemo(
    () => results.slice(pageStart, pageEnd),
    [results, pageStart, pageEnd]
  );

  const anySelected = useMemo(
    () => Object.values(selectedIds).some(Boolean),
    [selectedIds]
  );

  const selectedCount = useMemo(
    () => Object.values(selectedIds).filter(Boolean).length,
    [selectedIds]
  );

  const allOnPageSelected =
    pageRows.length > 0 &&
    pageRows.every((official) => Boolean(selectedIds[official._id]));

  const someOnPageSelected =
    pageRows.some((official) => Boolean(selectedIds[official._id])) &&
    !allOnPageSelected;

  function handleRowClick(
    event: React.MouseEvent,
    official: any
  ) {
    const target = event.target as HTMLElement;

    if (target.closest("a,button,input,label,select")) {
      return;
    }

    setViewOfficial(official);
  }

  const runSearch = async (overrides?: SearchOverrides) => {
    setError(null);
    setLoading(true);
    setHasSearched(true);

    const nonce = ++searchNonce.current;

    const stateInput = overrides?.state ?? state;

    const stateAbbreviation =
      normalizeStateAbbr(stateInput) ??
      (stateInput?.length === 2
        ? stateInput.toUpperCase()
        : undefined);

    const filters = {
      city: (overrides?.city ?? city).trim() || undefined,
      state: stateAbbreviation,
      levels: overrides?.levels ?? levels,
      q: (overrides?.q ?? q).trim() || undefined,
      issue: (overrides?.issue ?? issue).trim() || undefined,
      limit: 100,
    };

    try {
      const response = await searchOfficials(filters);

      if (searchNonce.current !== nonce) {
        return;
      }

      setResults(response.results || []);
      setSelectedIds({});
      setPage(1);
    } catch (searchError: any) {
      if (searchNonce.current !== nonce) {
        return;
      }

      console.error(searchError);
      setError(searchError?.message || "Search failed");
    } finally {
      if (searchNonce.current === nonce) {
        setLoading(false);
      }
    }
  };

  const runSearchWithOverrides = async (
    overrides: Partial<{ city: string; state: string }>
  ) => {
    await runSearch(overrides);
  };

  const useMyLocation = async (auto = false) => {
    const nonce = ++geoNonce.current;

    try {
      setLoading(true);

      const position = await getPositionSmart({
        totalTimeoutMs: auto ? 6000 : 9000,
        minAccuracyMeters: 100000,
      });

      if (geoNonce.current !== nonce) {
        return;
      }

      const { latitude, longitude } = position.coords;

      const geo = await reverseGeocode(latitude, longitude);

      if (geoNonce.current !== nonce) {
        return;
      }

      const foundCity = geo?.city || "";
      const stateAbbreviation = geo?.stateAbbr || "";

      setCity(foundCity);
      setState(stateAbbreviation);
      setLocLabel(
        [foundCity, stateAbbreviation].filter(Boolean).join(", ") || null
      );

      await runSearchWithOverrides({
        city: foundCity,
        state: stateAbbreviation,
      });
    } catch (locationError) {
      if (!auto) {
        alert(explainGeoError(locationError));
      }
    } finally {
      if (geoNonce.current === nonce) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    let cancelled = false;

    const checkLocationPermission = async () => {
      try {
        const permission = await (
          navigator.permissions as any
        )?.query?.({
          name: "geolocation" as PermissionName,
        });

        if (!cancelled && permission?.state === "granted") {
          await useMyLocation(true);
        }
      } catch {
        // Ignore unsupported permission API errors.
      }
    };

    void checkLocationPermission();

    return () => {
      cancelled = true;
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (q.trim().length >= 3) {
        void runSearch();
      }
    }, 400);

    return () => {
      window.clearTimeout(timer);
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const togglePick = (id: string) => {
    setSelectedIds((previous) => ({
      ...previous,
      [id]: !previous[id],
    }));
  };

  const togglePickAllOnPage = (selected: boolean) => {
    const patch: Record<string, boolean> = {};

    pageRows.forEach((official) => {
      patch[official._id] = selected;
    });

    setSelectedIds((previous) => ({
      ...previous,
      ...patch,
    }));
  };

  const startCampaign = () => {
    const selectedOfficials = results.filter(
      (official) => selectedIds[official._id]
    );

    if (!selectedOfficials.length) {
      return;
    }

    nav("/partner/campaigns/new", {
      state: {
        preselectedOfficials: selectedOfficials.map(
          (official) => official._id
        ),
        prefill: {
          title: `Contact officials in ${city || state}`,
          description: `Draft outreach to ${selectedOfficials.length} officials found via lookup.`,
          officialsPreview: selectedOfficials.map((official: any) => ({
            id: official._id,
            fullName: official.fullName,
            role: official.role,
            email: official.email,
          })),
        },
      },
    });
  };

  return (
    <main
      className="
        mx-auto max-w-6xl
        px-4 py-6
        text-[var(--text)]
        transition-colors
        sm:px-6
      "
    >
      <h1 className="mb-4 text-2xl font-bold text-[var(--text)]">
        Find Public Officials
      </h1>

      <FilterBar
        value={{
          q,
          city,
          state,
          issue,
          levels,
        }}
        onChange={(next) => {
          if (next.q !== undefined) {
            setQ(next.q);
          }

          if (next.city !== undefined) {
            setCity(next.city);
          }

          if (next.state !== undefined) {
            setState(next.state);
          }

          if (next.issue !== undefined) {
            setIssue(next.issue);
          }

          if (next.levels !== undefined) {
            setLevels(next.levels);
          }
        }}
        onSearch={() => {
          void runSearch();
        }}
        onUseLocation={() => {
          void useMyLocation(false);
        }}
        allLevels={[...ALL_LEVELS]}
        loading={loading}
      />

      {error && (
        <div
          role="alert"
          className="
            mb-3 rounded
            border border-red-200
            bg-red-50
            px-3 py-2
            text-sm text-red-700
            dark:border-red-900
            dark:bg-red-950/40
            dark:text-red-200
          "
        >
          {error}
        </div>
      )}

      {locLabel && (
        <div className="mb-3 text-xs text-[var(--muted)]">
          Auto-detected location:{" "}
          <span className="font-medium text-[var(--text)]">
            {locLabel}
          </span>
        </div>
      )}

      {results.length > 0 && (
        <div
          className="
            mb-3 flex flex-col gap-3
            text-sm text-[var(--muted)]
            sm:flex-row sm:items-center sm:justify-between
          "
        >
          <div>
            Sorted by verified/confidence. Showing{" "}
            <span className="font-medium text-[var(--text)]">
              {pageStart + 1}–{pageEnd}
            </span>{" "}
            of{" "}
            <span className="font-medium text-[var(--text)]">
              {total}
            </span>
            .
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2">
              <span>Rows per page</span>

              <select
                className="
                  rounded border border-[var(--border)]
                  bg-[var(--bg-surface)]
                  px-2 py-1
                  text-[var(--text)]
                  focus:outline-none
                  focus:ring-2
                  focus:ring-brand-500/40
                "
                value={pageSize}
                onChange={(event) => {
                  setPageSize(Number(event.target.value));
                  setPage(1);
                }}
              >
                {PAGE_SIZE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex items-center gap-1">
              <button
                type="button"
                className="
                  rounded border border-[var(--border)]
                  bg-[var(--bg-surface)]
                  px-2 py-1
                  text-[var(--text)]
                  transition-colors
                  hover:bg-neutral-100
                  disabled:cursor-not-allowed
                  disabled:opacity-50
                  dark:hover:bg-neutral-700
                "
                onClick={() =>
                  setPage((currentPage) =>
                    Math.max(1, currentPage - 1)
                  )
                }
                disabled={page <= 1}
              >
                Prev
              </button>

              <span className="px-2 text-[var(--text)]">
                {page} / {totalPages}
              </span>

              <button
                type="button"
                className="
                  rounded border border-[var(--border)]
                  bg-[var(--bg-surface)]
                  px-2 py-1
                  text-[var(--text)]
                  transition-colors
                  hover:bg-neutral-100
                  disabled:cursor-not-allowed
                  disabled:opacity-50
                  dark:hover:bg-neutral-700
                "
                onClick={() =>
                  setPage((currentPage) =>
                    Math.min(totalPages, currentPage + 1)
                  )
                }
                disabled={page >= totalPages}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      <div
        className="
          overflow-x-auto rounded
          border border-[var(--border)]
          bg-[var(--bg-surface)]
          shadow-sm
          transition-colors
        "
      >
        <table className="min-w-full text-sm">
          <thead
            className="
              sticky top-0 z-10
              bg-neutral-50
              text-neutral-800
              dark:bg-neutral-800
              dark:text-neutral-100
            "
          >
            <tr>
              <th
                scope="col"
                className="
                  w-10 border-b border-[var(--border)]
                  px-3 py-2
                "
              >
                <input
                  type="checkbox"
                  checked={allOnPageSelected}
                  ref={(element) => {
                    if (element) {
                      element.indeterminate = someOnPageSelected;
                    }
                  }}
                  onChange={(event) =>
                    togglePickAllOnPage(event.target.checked)
                  }
                  aria-label="Select all officials on this page"
                  className="
                    h-4 w-4 rounded
                    border-[var(--border)]
                    bg-[var(--bg-surface)]
                    text-brand-600
                    focus:ring-brand-500
                  "
                />
              </th>

              <th
                scope="col"
                className="
                  border-b border-[var(--border)]
                  px-3 py-2 text-left
                "
              >
                Official
              </th>

              <th
                scope="col"
                className="
                  border-b border-[var(--border)]
                  px-3 py-2 text-left
                "
              >
                Level
              </th>

              <th
                scope="col"
                className="
                  border-b border-[var(--border)]
                  px-3 py-2 text-left
                "
              >
                Location
              </th>

              <th
                scope="col"
                className="
                  border-b border-[var(--border)]
                  px-3 py-2 text-left
                "
              >
                Email
              </th>

              <th
                scope="col"
                className="
                  border-b border-[var(--border)]
                  px-3 py-2 text-left
                "
              >
                Phones
              </th>
            </tr>
          </thead>

          <tbody>
            {pageRows.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="
                    bg-[var(--bg-surface)]
                    px-3 py-8
                    text-center
                    text-[var(--muted)]
                  "
                >
                  {loading
                    ? "Searching…"
                    : hasSearched
                      ? "No results match these filters."
                      : "No results yet. Try searching."}
                </td>
              </tr>
            ) : (
              pageRows.map((official) => (
                <tr
                  key={official._id}
                  className="
                    cursor-pointer
                    border-b border-[var(--border)]
                    bg-[var(--bg-surface)]
                    transition-colors
                    last:border-b-0
                    odd:bg-[var(--bg-surface)]
                    even:bg-neutral-50
                    hover:bg-neutral-100
                    dark:even:bg-neutral-800/60
                    dark:hover:bg-neutral-700/80
                  "
                  onClick={(event) =>
                    handleRowClick(event, official)
                  }
                >
                  <td className="px-3 py-2 align-top">
                    <input
                      type="checkbox"
                      checked={Boolean(selectedIds[official._id])}
                      onChange={() => togglePick(official._id)}
                      aria-label={`Select ${official.fullName}`}
                      onClick={(event) => event.stopPropagation()}
                      className="
                        h-4 w-4 rounded
                        border-[var(--border)]
                        bg-[var(--bg-surface)]
                        text-brand-600
                        focus:ring-brand-500
                      "
                    />
                  </td>

                  <td className="px-3 py-2 align-top">
                    <div className="font-medium text-[var(--text)]">
                      {official.fullName}
                    </div>

                    <div className="text-xs text-[var(--muted)]">
                      {official.role}

                      {official.verified && (
                        <span
                          className="
                            ml-2 inline-flex items-center
                            rounded px-1.5 py-0.5
                            align-middle text-[10px]
                            bg-green-100 text-green-800
                            dark:bg-green-950/50
                            dark:text-green-200
                          "
                        >
                          verified
                        </span>
                      )}
                    </div>
                  </td>

                  <td className="px-3 py-2 align-top">
                    <div className="capitalize text-[var(--text)]">
                      {official.level}
                    </div>

                    {typeof official.confidenceScore === "number" && (
                      <div className="text-[10px] text-[var(--muted)]">
                        conf: {official.confidenceScore.toFixed(2)}
                      </div>
                    )}
                  </td>

                  <td className="px-3 py-2 align-top">
                    <div className="text-sm text-[var(--text)]">
                      {official.jurisdiction?.city || "—"},{" "}
                      {official.state}
                    </div>

                    <div className="text-[10px] text-[var(--muted)]">
                      {official.category || ""}
                    </div>
                  </td>

                  <td className="px-3 py-2 align-top">
                    {official.email ? (
                      <a
                        className="
                          break-all underline
                          text-blue-700
                          hover:text-blue-800
                          dark:text-blue-300
                          dark:hover:text-blue-200
                        "
                        href={`mailto:${official.email}`}
                        onClick={(event) => event.stopPropagation()}
                      >
                        {official.email}
                      </a>
                    ) : (
                      <span className="text-[var(--muted)]">
                        no email
                      </span>
                    )}
                  </td>

                  <td className="px-3 py-2 align-top">
                    {Array.isArray(official.phoneNumbers) &&
                    official.phoneNumbers.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {official.phoneNumbers
                          .slice(0, 3)
                          .map((phone: any, index: number) => (
                            <span
                              key={`${official._id}-${phone.number}-${index}`}
                              className="
                                inline-flex items-center
                                rounded px-2 py-0.5
                                text-xs
                                bg-neutral-100
                                text-neutral-800
                                dark:bg-neutral-700
                                dark:text-neutral-100
                              "
                            >
                              {phone.number}
                              {phone.label
                                ? ` (${phone.label})`
                                : ""}
                              {typeof phone.priority === "number"
                                ? ` · p${phone.priority}`
                                : ""}
                            </span>
                          ))}

                        {official.phoneNumbers.length > 3 && (
                          <span className="text-xs text-[var(--muted)]">
                            +{official.phoneNumbers.length - 3} more
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-[var(--muted)]">—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {results.length > 0 && (
        <div className="mt-4 flex items-center justify-between gap-3">
          <div className="text-sm text-[var(--muted)]">
            {selectedCount} selected
          </div>

          <button
            type="button"
            disabled={!anySelected}
            onClick={startCampaign}
            className="
              rounded px-4 py-2
              text-sm font-medium
              transition-colors
              enabled:bg-green-600
              enabled:text-white
              enabled:hover:bg-green-700
              disabled:cursor-not-allowed
              disabled:bg-neutral-300
              disabled:text-neutral-600
              dark:disabled:bg-neutral-700
              dark:disabled:text-neutral-400
            "
          >
            Start a campaign with these
          </button>
        </div>
      )}

      {!user && (
        <div
          className="
            mt-6 rounded border p-3 text-sm
            border-amber-300
            bg-amber-100
            text-amber-900
            dark:border-amber-800
            dark:bg-amber-950/40
            dark:text-amber-200
          "
        >
          You can find officials without logging in. To create a
          campaign, please log in first.
        </div>
      )}

      <OfficialQuickViewModal
        open={Boolean(viewOfficial)}
        official={viewOfficial}
        onClose={() => setViewOfficial(null)}
      />
    </main>
  );
};

export default OfficialsLookupPage;
