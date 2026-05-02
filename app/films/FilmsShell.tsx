// ─────────────────────────────────────────────────────────────────
// FilmsShell — client wrapper for the /films grid + filter UI.
//
// Layout:
//   • md+ (≥768px): two-column grid — filter sidebar on the left
//     (sticky-positioned so it stays visible during long-page
//     scrolls), film grid + pagination on the right.
//   • <md: a "Filters · N" trigger sits above the grid; tapping it
//     opens a full-screen fly-in drawer that contains the same
//     filter content as the desktop sidebar. Esc closes; body
//     scroll is locked while open; focus moves to the close button
//     on open and back to the trigger on close.
//
// Filtering is server-side: each control change calls router.replace
// with new URL params, which re-runs page.tsx, which runs
// applyFilters again and passes a new film slice down to this
// shell. This shell never filters directly — it just renders chips,
// sort UI, and whatever subset the server hands it.
//
// URL params owned here:
//   ?rating=4,4.5,5     — per-review rating multiselect
//   ?genre=Horror,Drama — per-film genre multiselect
//   ?reviewYear=2025    — per-review review-year filter (single year)
//   ?reviewWindow=12mo  — per-review rolling 12-month window
//                         (mutually exclusive with reviewYear)
//   ?sort=...           — sort dimension (omitted = default)
//   ?page=N             — current page (reset to 1 on any filter change)
//   ?from=films         — preserved when present so card→detail→back
//                         navigation lands back here
//
// Pagination uses the primitive's BasePathMode with preserveParams
// so each page link carries the active filter state forward.
// ─────────────────────────────────────────────────────────────────

"use client";

import {
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { Stack } from "@/components/layout/Stack";
import { Headline } from "@/components/typography/Headline";
import { Kicker } from "@/components/typography/Kicker";
import { Pagination } from "@/components/primitives/Pagination";
import type {
  AppliedFilm,
  FilmFilters,
  FilmSort,
} from "@/lib/feeds/letterboxd-utils";
import { FilmCard } from "./FilmCard";

const RATING_VALUES = [
  0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5,
] as const;

const SORT_OPTIONS: { value: FilmSort; label: string }[] = [
  { value: "latest-watched-desc", label: "Newest watch" },
  { value: "latest-watched-asc", label: "Oldest watch" },
  { value: "rating-desc", label: "Highest rated" },
  { value: "rating-asc", label: "Lowest rated" },
  { value: "release-year-desc", label: "Newest release" },
  { value: "release-year-asc", label: "Oldest release" },
  { value: "latest-review-desc", label: "Newest review" },
];

const REVIEW_DATE_OPTIONS: {
  key: string;
  label: string;
  reviewYear?: number;
  reviewWindow?: "12mo";
}[] = [
  { key: "all", label: "All time" },
  { key: "12mo", label: "Past 12 months", reviewWindow: "12mo" },
  { key: "2026", label: "2026", reviewYear: 2026 },
  { key: "2025", label: "2025", reviewYear: 2025 },
  { key: "2024", label: "2024", reviewYear: 2024 },
  { key: "2023", label: "2023", reviewYear: 2023 },
];

const DRAWER_ID = "films-filter-drawer";

type Props = {
  films: AppliedFilm[];
  totalPages: number;
  currentPage: number;
  totalResults: number;
  filters: FilmFilters;
  sort: FilmSort;
  /** Genres present in the snapshot, sorted by usage descending. */
  availableGenres: string[];
};

export function FilmsShell({
  films,
  totalPages,
  currentPage,
  totalResults,
  filters,
  sort,
  availableGenres,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Drawer (mobile fly-in) state.
  const [drawerOpen, setDrawerOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Esc closes the drawer and restores focus to the trigger so the
  // keyboard user lands somewhere sensible (mirrors Nav's pattern).
  useEffect(() => {
    if (!drawerOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setDrawerOpen(false);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [drawerOpen]);

  // Body scroll lock while the drawer is open. Without this, the
  // page underneath scrolls when the user pans inside the drawer
  // on mobile — disorienting. We restore the original overflow
  // value on cleanup so other code paths that toggle overflow
  // (modals, transitions) aren't broken.
  useEffect(() => {
    if (!drawerOpen) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [drawerOpen]);

  // Move focus into the drawer when it opens (close button is the
  // safest target — predictable, always visible, and a tap there
  // dismisses the panel cleanly).
  useEffect(() => {
    if (drawerOpen) {
      closeButtonRef.current?.focus();
    }
  }, [drawerOpen]);

  // Memoize so Pagination doesn't see a new identity every render.
  // Strips `page` because Pagination sets its own page param.
  const preserveParams = useMemo(() => {
    const out: Record<string, string> = {};
    for (const [k, v] of searchParams.entries()) {
      if (k !== "page") out[k] = v;
    }
    return out;
  }, [searchParams]);

  // Update URL params and navigate. Resets `page` to 1 on any
  // filter/sort change so users don't land on an out-of-range page
  // after narrowing the result set.
  function navigate(updates: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(updates)) {
      if (v === undefined || v === "") {
        params.delete(k);
      } else {
        params.set(k, v);
      }
    }
    const onlyPage = Object.keys(updates).every((k) => k === "page");
    if (!onlyPage) {
      params.delete("page");
    }
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, {
      scroll: false,
    });
  }

  function toggleRating(rating: number) {
    const current = filters.ratings ?? [];
    const next = current.includes(rating)
      ? current.filter((r) => r !== rating)
      : [...current, rating].sort((a, b) => a - b);
    navigate({
      rating: next.length > 0 ? next.join(",") : undefined,
    });
  }

  function toggleGenre(genre: string) {
    const current = filters.genres ?? [];
    const next = current.includes(genre)
      ? current.filter((g) => g !== genre)
      : [...current, genre];
    navigate({
      genre: next.length > 0 ? next.join(",") : undefined,
    });
  }

  function setReviewDate(option: (typeof REVIEW_DATE_OPTIONS)[number]) {
    navigate({
      reviewYear: option.reviewYear ? String(option.reviewYear) : undefined,
      reviewWindow: option.reviewWindow,
    });
  }

  function handleSortChange(value: FilmSort) {
    navigate({
      sort: value === "latest-watched-desc" ? undefined : value,
    });
  }

  function clearAll() {
    const from = searchParams.get("from");
    const next = from ? `${pathname}?from=${from}` : pathname;
    router.replace(next, { scroll: false });
  }

  const activeFilterCount = countActiveFilters(filters);
  const activeReviewKey = currentReviewDateKey(filters);
  const sortIsDefault = sort === "latest-watched-desc";
  const anyControlChangedFromDefault =
    activeFilterCount > 0 || !sortIsDefault;

  // Built once and passed to both the sidebar and the drawer so
  // there's no chance of the two diverging.
  const filterContent = (
    <FilterContent
      filters={filters}
      sort={sort}
      availableGenres={availableGenres}
      activeReviewKey={activeReviewKey}
      anyControlChangedFromDefault={anyControlChangedFromDefault}
      totalResults={totalResults}
      onToggleRating={toggleRating}
      onToggleGenre={toggleGenre}
      onSetReviewDate={setReviewDate}
      onSortChange={handleSortChange}
      onClearAll={clearAll}
    />
  );

  return (
    <>
      {/* ─── Mobile trigger row (md:hidden) ─────────────────── */}
      <div
        className="flex items-center justify-between gap-4 md:hidden"
        style={{ marginBottom: 16 }}
      >
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setDrawerOpen(true)}
          aria-expanded={drawerOpen}
          aria-controls={DRAWER_ID}
          style={triggerButtonStyle}
          className="focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          Filters
          {activeFilterCount > 0 ? ` · ${activeFilterCount}` : ""}
        </button>
        <span style={resultCountStyle} aria-live="polite">
          {totalResults.toLocaleString()}{" "}
          {totalResults === 1 ? "film" : "films"}
        </span>
      </div>

      {/* ─── Mobile drawer ─────────────────────────────────── */}
      {drawerOpen ? (
        <div
          id={DRAWER_ID}
          role="dialog"
          aria-modal="true"
          aria-label="Filter and sort"
          className="md:hidden"
          style={drawerOverlayStyle}
        >
          <header style={drawerHeaderStyle}>
            <h2 style={drawerTitleStyle}>Filters</h2>
            <button
              ref={closeButtonRef}
              type="button"
              onClick={() => {
                setDrawerOpen(false);
                triggerRef.current?.focus();
              }}
              aria-label="Close filters"
              style={drawerCloseButtonStyle}
              className="focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              <span aria-hidden="true">✕</span>
            </button>
          </header>
          <div style={drawerBodyStyle}>{filterContent}</div>
        </div>
      ) : null}

      {/* ─── Desktop/tablet layout (md+) ─────────────────────── */}
      <div
        className="md:grid md:gap-8 lg:gap-10"
        style={
          {
            // CSS Grid template only at md+ (className above scopes
            // the grid behavior). Width chosen so the sidebar gives
            // chips room to wrap without dominating the grid: 280
            // on tablet, 320 on desktop.
            "--films-shell-cols-md": "280px 1fr",
            "--films-shell-cols-lg": "320px 1fr",
          } as CSSProperties
        }
      >
        <style>{`
          @media (min-width: 768px) {
            .films-shell-grid {
              grid-template-columns: var(--films-shell-cols-md);
            }
          }
          @media (min-width: 1024px) {
            .films-shell-grid {
              grid-template-columns: var(--films-shell-cols-lg);
            }
          }
        `}</style>
        <div className="md:grid md:gap-8 lg:gap-10 films-shell-grid">
          {/* Sidebar — sticky so filters stay visible during long
              scrolls; max-height + overflow-y so a tall filter list
              doesn't escape the viewport. top: 5rem clears the
              sticky Nav (h-16 + small buffer). */}
          <aside
            aria-label="Filter and sort"
            className="hidden md:block"
            style={{
              position: "sticky",
              top: "5rem",
              maxHeight: "calc(100vh - 6rem)",
              overflowY: "auto",
              alignSelf: "start",
            }}
          >
            {filterContent}
          </aside>

          {/* Main content — grid + pagination. */}
          <div>
            <Headline level={2} className="sr-only">
              Film reviews
            </Headline>
            {films.length > 0 ? (
              <ul
                role="list"
                className="grid gap-4 sm:gap-6"
                style={{
                  gridTemplateColumns:
                    "repeat(auto-fill, minmax(160px, 1fr))",
                  listStyle: "none",
                  padding: 0,
                  margin: 0,
                }}
              >
                {films.map((applied) => (
                  <li key={applied.film.id}>
                    <FilmCard applied={applied} />
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState onClearAll={clearAll} />
            )}
            <div style={{ marginTop: "var(--scale-700)" }}>
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                basePath={pathname}
                pageParam="page"
                preserveParams={preserveParams}
                ariaLabel="Film review pages"
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Sub-components ───────────────────────────────────────────────

function FilterContent({
  filters,
  sort,
  availableGenres,
  activeReviewKey,
  anyControlChangedFromDefault,
  totalResults,
  onToggleRating,
  onToggleGenre,
  onSetReviewDate,
  onSortChange,
  onClearAll,
}: {
  filters: FilmFilters;
  sort: FilmSort;
  availableGenres: string[];
  activeReviewKey: string;
  anyControlChangedFromDefault: boolean;
  totalResults: number;
  onToggleRating: (r: number) => void;
  onToggleGenre: (g: string) => void;
  onSetReviewDate: (o: (typeof REVIEW_DATE_OPTIONS)[number]) => void;
  onSortChange: (v: FilmSort) => void;
  onClearAll: () => void;
}) {
  return (
    <Stack gap="500">
      {/* Sort + clear-all live at the top of the rail so the most
          common control is the easiest to reach. The result count
          sits next to "Clear all" — same line as the Sort label
          would feel cramped, so each gets its own row inside the
          Stack. */}
      <div>
        <Kicker>Sort</Kicker>
        <select
          value={sort}
          onChange={(e) => onSortChange(e.target.value as FilmSort)}
          style={{
            ...sortSelectStyle,
            marginTop: 8,
          }}
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <FilterRow label="Rating">
        {RATING_VALUES.map((r) => (
          <Chip
            key={r}
            isActive={(filters.ratings ?? []).includes(r)}
            onClick={() => onToggleRating(r)}
            ariaLabel={`Filter to ${r} star${r === 1 ? "" : "s"}`}
          >
            {r}★
          </Chip>
        ))}
      </FilterRow>

      <FilterRow label="Reviewed">
        {REVIEW_DATE_OPTIONS.map((opt) => (
          <Chip
            key={opt.key}
            isActive={opt.key === activeReviewKey}
            onClick={() => onSetReviewDate(opt)}
            ariaLabel={`Filter reviewed-date to ${opt.label}`}
          >
            {opt.label}
          </Chip>
        ))}
      </FilterRow>

      {availableGenres.length > 0 ? (
        <FilterRow label="Genre">
          {availableGenres.map((g) => (
            <Chip
              key={g}
              isActive={(filters.genres ?? []).includes(g)}
              onClick={() => onToggleGenre(g)}
              ariaLabel={`Filter to ${g}`}
            >
              {g}
            </Chip>
          ))}
        </FilterRow>
      ) : null}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          paddingTop: 8,
          borderTop: "1px solid var(--border-default)",
        }}
      >
        <span
          style={resultCountStyle}
          aria-live="polite"
          // Visible on the desktop sidebar; the mobile drawer also
          // shows it, and the mobile trigger row mirrors it above.
          // Three views of the same number — accessible and
          // unambiguous regardless of viewport.
        >
          {totalResults.toLocaleString()}{" "}
          {totalResults === 1 ? "film" : "films"}
        </span>
        {anyControlChangedFromDefault ? (
          <button
            type="button"
            onClick={onClearAll}
            style={clearAllButtonStyle}
            aria-label="Clear all filters and reset sort"
            className="focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            Clear all
          </button>
        ) : null}
      </div>
    </Stack>
  );
}

function FilterRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div>
      <Kicker>{label}</Kicker>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 6,
          marginTop: 8,
        }}
      >
        {children}
      </div>
    </div>
  );
}

function Chip({
  isActive,
  onClick,
  children,
  ariaLabel,
}: {
  isActive: boolean;
  onClick: () => void;
  children: ReactNode;
  ariaLabel?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={isActive}
      aria-label={ariaLabel}
      style={{
        ...chipBaseStyle,
        background: isActive ? "var(--text-action)" : "transparent",
        color: isActive ? "var(--surface-page)" : "var(--text-body)",
        borderColor: isActive
          ? "var(--text-action)"
          : "var(--border-default)",
      }}
      className="hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2"
    >
      {children}
    </button>
  );
}

function EmptyState({ onClearAll }: { onClearAll: () => void }) {
  return (
    <div
      style={{
        padding: "var(--scale-800)",
        border: "1px dashed var(--border-default)",
        borderRadius: "var(--border-radius-md)",
        textAlign: "center",
      }}
    >
      <p
        style={{
          fontFamily: "var(--font-secondary)",
          fontSize: "var(--p-md-font-size)",
          color: "var(--text-body)",
          margin: 0,
        }}
      >
        No films match these filters.
      </p>
      <button
        type="button"
        onClick={onClearAll}
        style={{
          marginTop: 12,
          ...clearAllButtonStyle,
        }}
      >
        Clear all filters
      </button>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────

function countActiveFilters(filters: FilmFilters): number {
  let n = 0;
  if (filters.ratings && filters.ratings.length > 0) n++;
  if (filters.genres && filters.genres.length > 0) n++;
  if (filters.releaseYearMin !== undefined) n++;
  if (filters.releaseYearMax !== undefined) n++;
  if (filters.reviewYear !== undefined) n++;
  if (filters.reviewWindow !== undefined) n++;
  return n;
}

function currentReviewDateKey(filters: FilmFilters): string {
  if (filters.reviewYear !== undefined) return String(filters.reviewYear);
  if (filters.reviewWindow === "12mo") return "12mo";
  return "all";
}

// ─── Inline styles ────────────────────────────────────────────────

const chipBaseStyle: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 12,
  letterSpacing: "0.04em",
  padding: "6px 12px",
  borderRadius: 999,
  border: "1px solid var(--border-default)",
  cursor: "pointer",
  whiteSpace: "nowrap",
  transition: "background 0.12s, color 0.12s, border-color 0.12s",
  outlineColor: "var(--border-focus)",
};

const sortSelectStyle: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 12,
  padding: "6px 8px",
  border: "1px solid var(--border-default)",
  borderRadius: "var(--border-radius-sm)",
  background: "var(--surface-page)",
  color: "var(--text-body)",
  cursor: "pointer",
  width: "100%",
  outlineColor: "var(--border-focus)",
};

const triggerButtonStyle: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 12,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  padding: "8px 16px",
  borderRadius: "var(--border-radius-sm)",
  border: "1px solid var(--border-interactive)",
  background: "var(--surface-page)",
  color: "var(--text-body)",
  cursor: "pointer",
  outlineColor: "var(--border-focus)",
};

const resultCountStyle: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 12,
  color: "var(--text-caption)",
  letterSpacing: "0.04em",
};

const clearAllButtonStyle: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 12,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  color: "var(--text-action)",
  background: "none",
  border: "none",
  padding: 0,
  cursor: "pointer",
  textDecoration: "underline",
  outlineColor: "var(--border-focus)",
};

// Drawer occupies the full viewport — large enough that the user
// has space to scan all filters at once, with the close button
// pinned at the top so it's always reachable.
const drawerOverlayStyle: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 50,
  background: "var(--surface-page)",
  display: "flex",
  flexDirection: "column",
};

const drawerHeaderStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "16px 20px",
  borderBottom: "1px solid var(--border-default)",
  background: "var(--surface-page)",
};

const drawerTitleStyle: CSSProperties = {
  fontFamily: "var(--font-primary)",
  fontSize: "var(--p-lg-font-size)",
  lineHeight: 1.2,
  color: "var(--text-heading)",
  margin: 0,
};

const drawerCloseButtonStyle: CSSProperties = {
  width: 40,
  height: 40,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "var(--border-radius-sm)",
  border: "1px solid var(--border-interactive)",
  background: "var(--surface-page)",
  color: "var(--text-body)",
  cursor: "pointer",
  fontSize: 16,
  outlineColor: "var(--border-focus)",
};

const drawerBodyStyle: CSSProperties = {
  flex: 1,
  overflowY: "auto",
  padding: "20px",
};
