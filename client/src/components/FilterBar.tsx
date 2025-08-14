import React, { useMemo, useState } from "react";

type Filters = {
  q: string;
  city: string;
  state: string;
  issue: string;
  levels: string[];
};

type Props = {
  value: Filters;
  onChange: (next: Partial<Filters>) => void;
  onSearch: () => void;
  onUseLocation: () => void;
  allLevels: string[];
  loading?: boolean;
};

export default function FilterBar({
  value,
  onChange,
  onSearch,
  onUseLocation,
  allLevels,
  loading,
}: Props) {
  const [moreOpen, setMoreOpen] = useState(false);

  const toggleLevel = (lvl: string) => {
    const has = value.levels.includes(lvl);
    const next = has ? value.levels.filter(l => l !== lvl) : [...value.levels, lvl];
    onChange({ levels: next });
  };

  const allSelected = value.levels.length === allLevels.length;
  const noneSelected = value.levels.length === 0;

  const setAll = () => onChange({ levels: [...allLevels] });
  const setNone = () => onChange({ levels: [] });

  const selectedSummary = useMemo(() => {
    const bits: string[] = [];
    if (value.city) bits.push(value.city);
    if (value.state) bits.push(value.state);
    if (value.issue) bits.push(`#${value.issue}`);
    if (value.levels.length && value.levels.length < allLevels.length) bits.push(`${value.levels.length} lvls`);
    return bits.join(" · ");
  }, [value, allLevels.length]);

  return (
    <section className="bg-white/80 backdrop-blur rounded-xl border shadow-sm p-3 md:p-4 mb-4">
      {/* Top row: big search bar + actions */}
      <div className="flex flex-col md:flex-row md:items-center gap-2">
        <div className="relative flex-1">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔎</span>
          <input
            className="w-full pl-9 pr-24 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-brand/40"
            placeholder="Search names, roles, emails…"
            value={value.q}
            onChange={(e) => onChange({ q: e.target.value })}
            onKeyDown={(e) => e.key === "Enter" && onSearch()}
          />
          {value.q && (
            <button
              className="absolute right-24 top-1/2 -translate-y-1/2 text-xs text-gray-500 hover:text-gray-700"
              onClick={() => onChange({ q: "" })}
              aria-label="Clear search"
              title="Clear"
            >
              ✕
            </button>
          )}
          <div className="hidden md:flex absolute right-2 top-1/2 -translate-y-1/2 gap-2">
            <button
              onClick={onUseLocation}
              className="px-2 py-1 rounded-md border text-sm hover:bg-gray-50"
              title="Use my location"
            >
              📍 Location
            </button>
            <button
              onClick={onSearch}
              disabled={loading}
              className="px-3 py-1.5 rounded-md bg-brand text-white text-sm disabled:opacity-60"
            >
              {loading ? "Searching…" : "Search"}
            </button>
          </div>
        </div>

        {/* Mobile action buttons */}
        <div className="flex md:hidden gap-2">
          <button
            onClick={onUseLocation}
            className="flex-1 px-3 py-2 rounded-md border text-sm hover:bg-gray-50"
            title="Use my location"
          >
            📍 Location
          </button>
          <button
            onClick={onSearch}
            disabled={loading}
            className="flex-1 px-3 py-2 rounded-md bg-brand text-white text-sm disabled:opacity-60"
          >
            {loading ? "Searching…" : "Search"}
          </button>
        </div>
      </div>

      {/* Level pills */}
      <div className="mt-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-500">Levels:</span>
          <button
            className={`text-xs px-2 py-1 rounded-full border ${allSelected ? "bg-brand/10 border-brand/30 text-brand-700" : "hover:bg-gray-50"}`}
            onClick={setAll}
          >
            All
          </button>
          <button
            className={`text-xs px-2 py-1 rounded-full border ${noneSelected ? "bg-gray-100" : "hover:bg-gray-50"}`}
            onClick={setNone}
          >
            None
          </button>
          <div className="flex gap-2 overflow-auto scrollbar-thin">
            {allLevels.map((lvl) => {
              const active = value.levels.includes(lvl);
              return (
                <button
                  key={lvl}
                  onClick={() => toggleLevel(lvl)}
                  className={`text-xs px-2 py-1 rounded-full border capitalize whitespace-nowrap ${
                    active
                      ? "bg-brand/10 border-brand/30 text-brand-700"
                      : "hover:bg-gray-50"
                  }`}
                  title={`Toggle ${lvl}`}
                >
                  {lvl}
                </button>
              );
            })}
          </div>
          <div className="ml-auto">
            <button
              className="text-xs px-2 py-1 rounded-md border hover:bg-gray-50"
              onClick={() => setMoreOpen((v) => !v)}
            >
              {moreOpen ? "Hide" : "More"} filters
            </button>
          </div>
        </div>
      </div>

      {/* Collapsible: city/state/issue */}
      {moreOpen && (
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
          <input
            className="border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand/30"
            placeholder="City"
            value={value.city}
            onChange={(e) => onChange({ city: e.target.value })}
            onKeyDown={(e) => e.key === "Enter" && onSearch()}
          />
          <input
            className="border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand/30"
            placeholder="State (e.g., FL)"
            value={value.state}
            onChange={(e) => onChange({ state: e.target.value.toUpperCase() })}
            onKeyDown={(e) => e.key === "Enter" && onSearch()}
            maxLength={2}
          />
          <input
            className="border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand/30"
            placeholder="Issue (optional)"
            value={value.issue}
            onChange={(e) => onChange({ issue: e.target.value })}
          />
          <div className="sm:col-span-3 flex items-center justify-between">
            <div className="text-xs text-gray-500 truncate">{selectedSummary}</div>
            <div className="flex gap-2">
              <button
                className="px-3 py-1.5 rounded-md border text-sm hover:bg-gray-50"
                onClick={() =>
                  onChange({ q: "", city: "", state: "", issue: "", levels: [...allLevels] })
                }
              >
                Reset
              </button>
              <button
                className="px-3 py-1.5 rounded-md bg-brand text-white text-sm"
                onClick={onSearch}
                disabled={loading}
              >
                {loading ? "Searching…" : "Apply"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
