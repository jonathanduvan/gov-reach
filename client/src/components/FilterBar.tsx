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

const inputClasses = `
  w-full
  bg-[var(--bg-surface)]
  text-[var(--text)]
  border border-[var(--border)]
  placeholder:text-[var(--muted)]
  rounded-md
  px-3 py-2
  transition-colors
  focus:outline-none
  focus:ring-2
  focus:ring-brand-500/40
  focus:border-brand-500
`;

const quietButtonClasses = `
  border border-[var(--border)]
  bg-transparent
  text-[var(--text)]
  hover:bg-neutral-100
  dark:hover:bg-neutral-700
  transition-colors
`;

const inactivePillClasses = `
  border-[var(--border)]
  bg-transparent
  text-[var(--text)]
  hover:bg-neutral-100
  dark:hover:bg-neutral-700
`;

const activePillClasses = `
  bg-brand-50
  border-brand-300
  text-brand-700
  dark:bg-brand-950/50
  dark:border-brand-800
  dark:text-brand-200
`;

export default function FilterBar({
  value,
  onChange,
  onSearch,
  onUseLocation,
  allLevels,
  loading = false,
}: Props) {
  const [moreOpen, setMoreOpen] = useState(false);

  const toggleLevel = (level: string) => {
    const isSelected = value.levels.includes(level);

    const nextLevels = isSelected
      ? value.levels.filter((currentLevel) => currentLevel !== level)
      : [...value.levels, level];

    onChange({ levels: nextLevels });
  };

  const allSelected =
    allLevels.length > 0 && value.levels.length === allLevels.length;

  const noneSelected = value.levels.length === 0;

  const setAll = () => {
    onChange({ levels: [...allLevels] });
  };

  const setNone = () => {
    onChange({ levels: [] });
  };

  const resetFilters = () => {
    onChange({
      q: "",
      city: "",
      state: "",
      issue: "",
      levels: [...allLevels],
    });
  };

  const selectedSummary = useMemo(() => {
    const summaryParts: string[] = [];

    if (value.city) {
      summaryParts.push(value.city);
    }

    if (value.state) {
      summaryParts.push(value.state);
    }

    if (value.issue) {
      summaryParts.push(`#${value.issue}`);
    }

    if (
      value.levels.length > 0 &&
      value.levels.length < allLevels.length
    ) {
      summaryParts.push(`${value.levels.length} lvls`);
    }

    return summaryParts.join(" · ");
  }, [
    value.city,
    value.state,
    value.issue,
    value.levels.length,
    allLevels.length,
  ]);

  return (
    <section
      className="
        mb-4 rounded-xl
        border border-[var(--border)]
        bg-[var(--bg-surface)]/90
        text-[var(--text)]
        p-3 shadow-sm
        backdrop-blur
        transition-colors
        md:p-4
      "
    >
      {/* Top row: search bar and actions */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center">
        <div className="relative flex-1">
          <span
            aria-hidden="true"
            className="
              pointer-events-none
              absolute left-3 top-1/2
              -translate-y-1/2
              text-[var(--muted)]
            "
          >
            🔎
          </span>

          <input
            type="search"
            className={`
              ${inputClasses}
              rounded-lg
              pl-9 pr-24
            `}
            placeholder="Search names, roles, emails…"
            value={value.q}
            onChange={(event) => onChange({ q: event.target.value })}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                onSearch();
              }
            }}
          />

          {value.q && (
            <button
              type="button"
              className="
                absolute right-24 top-1/2
                -translate-y-1/2
                rounded px-1
                text-xs text-[var(--muted)]
                hover:text-[var(--text)]
                focus-visible:outline-none
                focus-visible:ring-2
                focus-visible:ring-brand-500
              "
              onClick={() => onChange({ q: "" })}
              aria-label="Clear search"
              title="Clear"
            >
              ✕
            </button>
          )}

          <div className="absolute right-2 top-1/2 hidden -translate-y-1/2 gap-2 md:flex">
            <button
              type="button"
              onClick={onUseLocation}
              className={`
                ${quietButtonClasses}
                rounded-md px-2 py-1 text-sm
              `}
              title="Use my location"
            >
              📍 Location
            </button>

            <button
              type="button"
              onClick={onSearch}
              disabled={loading}
              className="
                rounded-md
                bg-brand-600
                px-3 py-1.5
                text-sm text-white
                transition-colors
                hover:bg-brand-700
                disabled:cursor-not-allowed
                disabled:opacity-60
              "
            >
              {loading ? "Searching…" : "Search"}
            </button>
          </div>
        </div>

        {/* Mobile action buttons */}
        <div className="flex gap-2 md:hidden">
          <button
            type="button"
            onClick={onUseLocation}
            className={`
              ${quietButtonClasses}
              flex-1 rounded-md px-3 py-2 text-sm
            `}
            title="Use my location"
          >
            📍 Location
          </button>

          <button
            type="button"
            onClick={onSearch}
            disabled={loading}
            className="
              flex-1 rounded-md
              bg-brand-600
              px-3 py-2
              text-sm text-white
              transition-colors
              hover:bg-brand-700
              disabled:cursor-not-allowed
              disabled:opacity-60
            "
          >
            {loading ? "Searching…" : "Search"}
          </button>
        </div>
      </div>

      {/* Level pills */}
      <div className="mt-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-[var(--muted)]">
            Levels:
          </span>

          <button
            type="button"
            className={`
              rounded-full border px-2 py-1 text-xs
              transition-colors
              ${allSelected ? activePillClasses : inactivePillClasses}
            `}
            onClick={setAll}
            aria-pressed={allSelected}
          >
            All
          </button>

          <button
            type="button"
            className={`
              rounded-full border px-2 py-1 text-xs
              transition-colors
              ${
                noneSelected
                  ? `
                    border-neutral-300
                    bg-neutral-100
                    text-neutral-800
                    dark:border-neutral-600
                    dark:bg-neutral-700
                    dark:text-neutral-100
                  `
                  : inactivePillClasses
              }
            `}
            onClick={setNone}
            aria-pressed={noneSelected}
          >
            None
          </button>

          <div className="scrollbar-thin flex gap-2 overflow-auto">
            {allLevels.map((level) => {
              const active = value.levels.includes(level);

              return (
                <button
                  type="button"
                  key={level}
                  onClick={() => toggleLevel(level)}
                  className={`
                    whitespace-nowrap
                    rounded-full border
                    px-2 py-1
                    text-xs capitalize
                    transition-colors
                    ${
                      active
                        ? activePillClasses
                        : inactivePillClasses
                    }
                  `}
                  title={`Toggle ${level}`}
                  aria-pressed={active}
                >
                  {level}
                </button>
              );
            })}
          </div>

          <div className="ml-auto">
            <button
              type="button"
              className={`
                ${quietButtonClasses}
                rounded-md px-2 py-1 text-xs
              `}
              onClick={() => setMoreOpen((current) => !current)}
              aria-expanded={moreOpen}
              aria-controls="additional-filters"
            >
              {moreOpen ? "Hide" : "More"} filters
            </button>
          </div>
        </div>
      </div>

      {/* Collapsible city, state, and issue filters */}
      {moreOpen && (
        <div
          id="additional-filters"
          className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3"
        >
          <input
            type="text"
            className={inputClasses}
            placeholder="City"
            value={value.city}
            onChange={(event) =>
              onChange({ city: event.target.value })
            }
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                onSearch();
              }
            }}
          />

          <input
            type="text"
            className={inputClasses}
            placeholder="State (e.g., FL)"
            value={value.state}
            onChange={(event) =>
              onChange({
                state: event.target.value.toUpperCase(),
              })
            }
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                onSearch();
              }
            }}
            maxLength={2}
            autoCapitalize="characters"
          />

          <input
            type="text"
            className={inputClasses}
            placeholder="Issue (optional)"
            value={value.issue}
            onChange={(event) =>
              onChange({ issue: event.target.value })
            }
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                onSearch();
              }
            }}
          />

          <div className="flex items-center justify-between gap-3 sm:col-span-3">
            <div
              className="
                min-w-0 truncate
                text-xs text-[var(--muted)]
              "
              title={selectedSummary}
            >
              {selectedSummary}
            </div>

            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                className={`
                  ${quietButtonClasses}
                  rounded-md px-3 py-1.5 text-sm
                `}
                onClick={resetFilters}
              >
                Reset
              </button>

              <button
                type="button"
                className="
                  rounded-md
                  bg-brand-600
                  px-3 py-1.5
                  text-sm text-white
                  transition-colors
                  hover:bg-brand-700
                  disabled:cursor-not-allowed
                  disabled:opacity-60
                "
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