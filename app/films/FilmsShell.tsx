// ─────────────────────────────────────────────────────────────────
// FilmsShell — client wrapper for the /films grid + filter UI.
//
// Layout:
//   • md+ (≥768px): two-column grid — filter sidebar on the left
//     (sticky-positioned so it stays visible during long-page
//     scrolls), film grid + pagination on the right.
//   • <md: a "Filters (N)" trigger sits above the grid; tapping it
//     opens a full-screen fly-in drawer that contains the same
//     filter content as the desktop sidebar. The drawer has a
//     sticky "Show N films" CTA at the bottom that closes the
//     drawer so the user can see the updated grid without hunting
//     for the close button. Esc closes; body scroll is locked
//     while open; focus moves to the close button on open and back
//     to the trigger on close.
//   • Above the grid (both viewports): an active-filter chip rail
//     with per-filter × dismissers. Renders only when 1+ filter
//     is active or the sort is non-default. Doubles as recovery
//     affordance in the empty state.
//   • Mode-switch toast (transient, fixed-position): when the user
//     toggles between rolling-window and discrete-year filters
//     (mutually exclusive), a 4-second cue announces the
//     destructive transition so state doesn't disappear silently.
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
//   ?watchedYear=2026,2024  per-review watched-year multi-select
//                            (CSV, like ?rating= and ?genre=)
//   ?watchedWindow=12mo  per-review rolling 12-month window
//                        (mutually exclusive with watchedYear)
//   ?sort=...           — sort dimension (omitted = default)
//   ?page=N             — current page (reset to 1 on any filter change)
//   (?ref=internal — meta-state added by FilmCard for back-nav,
//    stripped by BackToFilms on detail-page mount; never reaches the
//    listing surface in steady state)
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
import { track } from "@vercel/analytics";
import { Stack } from "@/components/layout/Stack";
import { Headline } from "@/components/typography/Headline";
import { Kicker } from "@/components/typography/Kicker";
import { InfoToast } from "@/components/primitives/InfoToast";
import { Pagination } from "@/components/primitives/Pagination";
import { ANALYTICS_EVENTS } from "@/lib/analytics";
import type {
  AppliedFilm,
  FilmFilters,
  FilmSort,
} from "@/lib/feeds/letterboxd-utils";
import { FilmCard } from "./FilmCard";

const RATING_VALUES = [
  0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5,
] as const;

// Order: most-recent-watch (default) first, then watched/release/
// review dimensions in newest-first/oldest-first pairs, then rating
// pair, then review-publication pair last. The first-review pair was
// previously omitted from the <select> even though it's a valid
// FilmSort URL value — closing films-sort-options-missing-first-review.
// Labels parallel the watched/rating/release/review chip-rail
// vocabulary: "watched" matches the watched-year filter,
// "released" matches the release-year range, "review" matches
// review publication. Past tense throughout so the sort and
// filter terminology read as one system, not two.
const SORT_OPTIONS: { value: FilmSort; label: string }[] = [
  { value: "latest-watched-desc", label: "Most recently watched" },
  { value: "latest-watched-asc", label: "Earliest watched" },
  { value: "rating-desc", label: "Highest rated" },
  { value: "rating-asc", label: "Lowest rated" },
  { value: "release-year-desc", label: "Newest released" },
  { value: "release-year-asc", label: "Oldest released" },
  { value: "latest-review-desc", label: "Most recently reviewed" },
  // "First-reviewed" hyphenated as a compound adjective so the
  // user reads "the most-recently-published first-time review" as
  // one concept, not "Latest" + "first review" (which read as two
  // unrelated qualifiers in the unhyphenated form).
  { value: "first-review-desc", label: "Most recently first-reviewed" },
  { value: "first-review-asc", label: "Earliest first-reviewed" },
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
  /** Watched years present in the snapshot, sorted desc. Derived at
   *  request time from each film's pre-computed watchedYearSet
   *  (sourced from review.watchedDate) so the chip rail expands
   *  automatically as Malcolm's watch history grows into new years
   *  and the displayed year always matches what the watchedYear
   *  filter actually compares against. */
  availableWatchedYears: number[];
  /** When the shell is mounted from a /films/genre/<slug> route,
   *  this is the genre name pinned by that route. The shell uses
   *  it to seed query-string params on every nav so the genre
   *  persists as the user composes additional filters, AND to
   *  flip the target path to /films (the dedicated genre route
   *  is single-genre-only; multi-filter combos live in
   *  query-string mode at /films?...). Undefined when the shell
   *  is mounted from /films directly. */
  routeGenre?: string;
};

export function FilmsShell({
  films,
  totalPages,
  currentPage,
  totalResults,
  filters,
  sort,
  availableGenres,
  availableWatchedYears,
  routeGenre,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Drawer (mobile fly-in) state.
  const [drawerOpen, setDrawerOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Transient mode-switch toast. The watched-date controls are
  // mutually exclusive (rolling window xor specific years), so a
  // chip click can silently destroy the other dimension's state.
  // We set this on the destructive transition and let the timer
  // clear it; aria-live lets SR users hear the cue too. Closes
  // films-watched-mode-switch-silent-destruction (option B —
  // chosen over composing the two dimensions, per the editorial
  // call: composability adds combinatorial complexity to the chip
  // rail's mental model and the rolling-window + discrete-year
  // compose case is rare in real cultural-curious browsing).
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  useEffect(() => {
    if (!toastMessage) return;
    const t = setTimeout(() => setToastMessage(null), 4000);
    return () => clearTimeout(t);
  }, [toastMessage]);

  // All drawer-open side effects live in one place so the open/close
  // contract is readable as a single block:
  //   • move focus to the close button (predictable target),
  //   • lock body scroll so the page underneath doesn't pan,
  //   • Esc dismisses and restores focus to the trigger.
  // Cleanup runs in reverse order so scroll restores before focus
  // moves.
  useEffect(() => {
    if (!drawerOpen) return;
    closeButtonRef.current?.focus();
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // Inert the global <nav> so keyboard users can't Tab out of
    // the open drawer into the sticky site nav. The
    // inert={drawerOpen} on the desktop layout wrapper covers the
    // sidebar / grid subtree but not <nav>, which lives in
    // layout.tsx outside this component's render. Class-audited
    // from TelevisionShell's drawer fix (2026-05-07 launch QA).
    const navEl = document.querySelector("nav");
    navEl?.setAttribute("inert", "");
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setDrawerOpen(false);
        triggerRef.current?.focus();
        return;
      }
      // Tab focus-trap — keep focus cycling inside the dialog.
      // role="dialog" aria-modal hints to AT but doesn't actually
      // trap keyboard focus; that's the JS responsibility here.
      // Without this, Tab from the drawer's last focusable
      // ("Show results" button) escapes to the listing hero /
      // mobile SummaryPanel siblings of FilmsShell.
      if (e.key !== "Tab") return;
      const dialog = document.getElementById(DRAWER_ID);
      if (!dialog) return;
      const focusable = Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => el.offsetParent !== null);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (e.shiftKey) {
        if (active === first || !dialog.contains(active as Node)) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (active === last || !dialog.contains(active as Node)) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = originalOverflow;
      navEl?.removeAttribute("inert");
    };
  }, [drawerOpen]);

  // Memoize so Pagination doesn't see a new identity every render.
  // Strips `page` (Pagination sets its own page param) and the
  // back-nav meta-state markers `ref` / `from` so pagination links
  // don't carry "you arrived from a card click" forward into every
  // page-2/3/4 click.
  //
  // Dep is the serialized URL form (`searchParams.toString()`), not
  // the searchParams object itself: `useSearchParams()` can return a
  // fresh ReadonlyURLSearchParams reference on every render even
  // when the underlying URL hasn't changed, which would defeat the
  // memo. Comparing the string form makes the memo actually hold
  // until the URL changes.
  const searchParamsString = searchParams.toString();
  const preserveParams = useMemo(() => {
    const out: Record<string, string> = {};
    for (const [k, v] of searchParams.entries()) {
      if (k === "page" || k === "ref" || k === "from") continue;
      out[k] = v;
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- searchParams is iterated above; identity stability comes from the string form, not the object reference
  }, [searchParamsString]);

  // Update URL params and navigate. Resets `page` to 1 on any
  // filter/sort change so users don't land on an out-of-range page
  // after narrowing the result set.
  //
  // routeGenre handling: when the shell is mounted from a genre
  // route (/films/genre/<slug>), the genre filter lives in the
  // route param rather than the query string. We seed it into
  // params here so any filter change carries the genre forward
  // (or removes it cleanly if the user toggles the genre off);
  // and we always retarget to /films since the genre route is
  // single-genre-only — multi-filter combos live at /films?...
  function navigate(updates: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams.toString());
    if (routeGenre && !params.has("genre")) {
      params.set("genre", routeGenre);
    }
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
    // Fire FILM_FILTER_APPLIED for non-page navigations so the
    // dashboard reports which filter dimensions earn their UI
    // real-estate. dimension is derived from the keys touched —
    // rating / genre / sort / watched (collapsing watchedYear +
    // watchedWindow into one dimension since they're mutually
    // exclusive). Page-only navigations don't fire (they're not
    // filter changes; they're pagination clicks).
    if (!onlyPage) {
      const dimension = pickFilterDimension(Object.keys(updates));
      if (dimension) {
        track(ANALYTICS_EVENTS.FILM_FILTER_APPLIED, { dimension });
      }
    }
    // On a genre route, always target /films so any composed filter
    // set lands at the canonical query-string surface. On the main
    // listing, stay at the current pathname (preserves e.g. /films
    // → /films behavior).
    // Multi-filter combos from a genre route land on the corpus grid,
    // which now lives at /films/reviews (the cluster root /films is the
    // editorial landing). The non-genre branch uses pathname, which is
    // already /films/reviews when mounted there.
    const targetBase = routeGenre ? "/films/reviews" : pathname;
    const qs = params.toString();
    router.replace(qs ? `${targetBase}?${qs}` : targetBase, {
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

  // Watched-date handlers. Year multi-select + two singletons
  // ("All time" clears, "Past 12 months" sets the rolling window).
  // The singleton chips are mutually exclusive with the year set
  // — clicking either clears the other dimension.
  function toggleWatchedYear(year: number) {
    // If currently in window mode, switch to year mode (clear
    // window, seed the year array with this one). Surface the
    // mode change as a toast so the rolling-window state doesn't
    // disappear silently. Otherwise toggle the year in/out of the
    // array (no destructive transition, no toast).
    if (filters.watchedWindow !== undefined) {
      setToastMessage(
        "Specific year filters cannot be used with the relative past 12 months filter",
      );
      navigate({
        watchedYear: String(year),
        watchedWindow: undefined,
      });
      return;
    }
    const current = filters.watchedYears ?? [];
    const next = current.includes(year)
      ? current.filter((y) => y !== year)
      : [...current, year].sort((a, b) => b - a);
    navigate({
      watchedYear: next.length > 0 ? next.join(",") : undefined,
    });
  }

  function setWatched12Mo() {
    // Tapping past-12-months while specific years are selected
    // destroys the year set. Surface the mode change so the user
    // knows what just happened.
    if (filters.watchedYears && filters.watchedYears.length > 0) {
      setToastMessage(
        "The relative past 12 months filter cannot be used with specific year filters",
      );
    }
    navigate({
      watchedYear: undefined,
      watchedWindow: "12mo",
    });
  }

  function clearWatchedDate() {
    navigate({
      watchedYear: undefined,
      watchedWindow: undefined,
    });
  }

  function handleSortChange(value: FilmSort) {
    navigate({
      sort: value === "latest-watched-desc" ? undefined : value,
    });
  }

  function resetSort() {
    handleSortChange("latest-watched-desc");
  }

  function clearAll() {
    // The shell only ever sees the listing pathname (/films or
    // /films/genre/<slug>) — no `ref`/`from` markers reach this
    // surface (those live on detail-page entry URLs only). A clean
    // pathname is the right "cleared" state.
    router.replace(pathname, { scroll: false });
  }

  const activeFilterCount = countActiveFilters(filters);
  const sortIsDefault = sort === "latest-watched-desc";
  const anyControlChangedFromDefault =
    activeFilterCount > 0 || !sortIsDefault;

  // The desktop sidebar and the mobile drawer both render the same
  // FilterContent. They differ in only two props:
  //   • announceResultCount — which surface owns the live region
  //     for the "{N} films" count. Only the visually-dominant
  //     region per viewport announces; see FilterContent's prop
  //     comment for the per-viewport reasoning.
  //   • showClearAll — the desktop sidebar suppresses its inline
  //     "Clear all" because the active-filter chip rail above the
  //     grid is the contextually-anchored affordance on md+; the
  //     drawer keeps its inline "Clear all" since the chip rail
  //     isn't visible from inside the drawer.
  // Pulling the shared props into one object keeps both branches
  // honest — adding a new filter dimension means one edit, not two.
  const sharedFilterContentProps = {
    filters,
    sort,
    availableGenres,
    availableWatchedYears,
    anyControlChangedFromDefault,
    totalResults,
    onToggleRating: toggleRating,
    onToggleGenre: toggleGenre,
    onToggleWatchedYear: toggleWatchedYear,
    onSetWatched12Mo: setWatched12Mo,
    onClearWatchedDate: clearWatchedDate,
    onSortChange: handleSortChange,
    onClearAll: clearAll,
  };
  const sidebarFilterContent = (
    <FilterContent
      {...sharedFilterContentProps}
      announceResultCount={true}
      showClearAll={false}
    />
  );
  const drawerFilterContent = (
    <FilterContent
      {...sharedFilterContentProps}
      announceResultCount={false}
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
          {activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
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
          // aria-labelledby points at the inner h2 so AT users hear
          // "Filters" once instead of "Filter and sort" + "Filters"
          // (the previous aria-label conflicted with the heading).
          // Closes films-drawer-h2-redundant-aria-label.
          aria-labelledby="films-filter-drawer-title"
          className="md:hidden"
          style={drawerOverlayStyle}
        >
          <header style={drawerHeaderStyle}>
            <h2 id="films-filter-drawer-title" style={drawerTitleStyle}>
              Filters
            </h2>
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
          <div style={drawerBodyStyle}>{drawerFilterContent}</div>
          {/* Sticky footer — single "Show N films" CTA that closes
              the drawer so the user can see the updated grid without
              hunting for the close button. Per-chip taps don't
              auto-close (chosen Booking.com-style behavior so users
              can stack multiple filters before dismissing). Closes
              films-drawer-no-autoclose-mobile (option B). */}
          <div style={drawerFooterStyle}>
            <button
              type="button"
              onClick={() => {
                setDrawerOpen(false);
                triggerRef.current?.focus();
              }}
              style={drawerShowResultsButtonStyle}
              className="hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              Show {totalResults.toLocaleString()}{" "}
              {totalResults === 1 ? "film" : "films"}
            </button>
          </div>
        </div>
      ) : null}

      {/* ─── Desktop/tablet layout (md+) ─────────────────────── */}
      {/* `inert` while the mobile drawer is open removes this
          subtree from the tab order + accessibility tree, so
          keyboard users can't escape the drawer into the grid
          underneath. Browsers (Chrome 102+, Safari 15.5+, Firefox
          112+) honor it natively; SR follows. Closes
          films-mobile-drawer-no-focus-trap. */}
      <div
        // Tailwind arbitrary values render the responsive grid
        // template directly — no inline <style> tag needed.
        // Closes films-pagination-style-tag-antipattern.
        className="md:grid md:gap-8 md:grid-cols-[280px_1fr] lg:gap-10 lg:grid-cols-[320px_1fr]"
        inert={drawerOpen}
      >
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
          {sidebarFilterContent}
        </aside>

        {/* Main content — grid + pagination. */}
        <div>
          <Headline level={2} className="sr-only">
            Film reviews
          </Headline>
          {/* Active-filter chip rail + inline info toast — both share
              one flex-wrap row above the grid so the user always
              sees what's currently filtered AND any transient
              status cue inline with the chips. ActiveFilterChips's
              nav uses display: contents so its <button> children
              flatten into this parent flex; <InfoToast>'s desktop
              variant lands inline alongside them on md+. The mobile
              variant of <InfoToast> is fixed-positioned and ignores
              this DOM placement — it pins to the viewport bottom
              with width matched to the drawer's sticky CTA so the
              two read as a paired unit.

              Closes:
                • films-no-active-filter-summary (legibility)
                • films-empty-state-no-recovery (per-filter
                  dismissers reachable even when result is empty)
                • films-no-active-filter-summary-mobile-multiselect
                  (mobile parity with the desktop sidebar)
              The labelling half of films-stats-orphaned-by-filters
              lands on the SummaryPanel "Lifetime · all N films"
              kicker, which makes the chart's scope explicit. */}
          {(anyControlChangedFromDefault || toastMessage) ? (
            // Block-flow wrapper: chips on the first line, the
            // (md+ inline) toast on its own line below. Pinning the
            // toast to a dedicated line keeps its position from
            // shifting based on the number of active chips or the
            // length of the toast text — a chip-count change
            // shouldn't visually relocate a status cue. The
            // <nav> below is block-level by default; its closing
            // line break naturally pushes the inline-flex toast
            // onto the next line. The mobile floating variant of
            // <InfoToast> is position: fixed and ignores this DOM
            // placement entirely.
            <div style={{ marginBottom: 16 }}>
              <ActiveFilterChips
                filters={filters}
                sort={sort}
                onRemoveRating={toggleRating}
                onRemoveGenre={toggleGenre}
                onRemoveWatchedYear={toggleWatchedYear}
                onClearWatchedWindow={clearWatchedDate}
                onResetSort={resetSort}
                onClearAll={clearAll}
              />
              <InfoToast
                message={toastMessage}
                mobileBottomOffset={drawerOpen ? 96 : 24}
              />
            </div>
          ) : null}
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
              surface={routeGenre ? "films-genre" : "films"}
            />
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
  availableWatchedYears,
  anyControlChangedFromDefault,
  totalResults,
  onToggleRating,
  onToggleGenre,
  onToggleWatchedYear,
  onSetWatched12Mo,
  onClearWatchedDate,
  onSortChange,
  onClearAll,
  announceResultCount,
  showClearAll = true,
}: {
  filters: FilmFilters;
  sort: FilmSort;
  availableGenres: string[];
  availableWatchedYears: number[];
  anyControlChangedFromDefault: boolean;
  totalResults: number;
  onToggleRating: (r: number) => void;
  onToggleGenre: (g: string) => void;
  onToggleWatchedYear: (y: number) => void;
  onSetWatched12Mo: () => void;
  onClearWatchedDate: () => void;
  onSortChange: (v: FilmSort) => void;
  onClearAll: () => void;
  /** Hide the inline "Clear all" button. The desktop sidebar sets
   *  this `false` because the active-filter chip rail above the
   *  grid carries its own clear affordance; the mobile drawer
   *  defaults `true` because the chip rail isn't visible from
   *  inside the drawer. */
  showClearAll?: boolean;
  /**
   * When true, the result-count span carries aria-live="polite" so
   * AT users hear filter-change announcements. Set on the desktop
   * sidebar instance (visually dominant on md+); false on the
   * mobile drawer instance to avoid duplicate announcements with
   * the trigger row's count above. Only one live region per
   * viewport is active at a time — see FilmsShell's two
   * FilterContent renders.
   */
  announceResultCount: boolean;
}) {
  // Singletons (All time, Past 12 months) and multi-select years
  // share the Watched chip rail. Active states derived inline so
  // there's one source of truth per chip.
  const watchedYears = filters.watchedYears ?? [];
  const allTimeActive =
    watchedYears.length === 0 && filters.watchedWindow === undefined;
  const past12moActive = filters.watchedWindow === "12mo";
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
          onChange={(e) => {
            // Validate against SORT_OPTIONS rather than `as FilmSort`
            // so a tampered value (e.g. via DevTools) doesn't smuggle
            // an invalid sort past the type system. SORT_OPTIONS is
            // the runtime source of truth — every value in it is a
            // valid FilmSort by construction.
            const match = SORT_OPTIONS.find((o) => o.value === e.target.value);
            if (match) onSortChange(match.value);
          }}
          // <Kicker> renders as <p>, not <label>, so the visual
          // label isn't programmatically associated. Without
          // aria-label, SR users hear "combo box" with no name.
          // Closes films-sort-select-no-label.
          aria-label="Sort films by"
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

      <FilterRow label="Watched">
        {/* Singletons first — All time clears the dimension; Past
            12 months sets the rolling window. Either click clears
            the year multi-select. */}
        <Chip
          isActive={allTimeActive}
          onClick={onClearWatchedDate}
          // aria-label is just the chip name — aria-pressed carries
          // the toggle state, so the previous "Clear watched-date
          // filter (all time)" verb-phrase conflicted with the
          // pressed state announcement ("Clear ... pressed" reads
          // as a contradiction).
          ariaLabel="All time"
        >
          All time
        </Chip>
        <Chip
          isActive={past12moActive}
          onClick={onSetWatched12Mo}
          ariaLabel="Filter watched-date to past 12 months"
        >
          Past 12 months
        </Chip>
        {/* Year chips — multi-select. Sourced dynamically from the
            snapshot so the rail expands as Malcolm's review history
            grows; clicking switches out of window mode if active;
            otherwise toggles the year in or out of the array. */}
        {availableWatchedYears.map((y) => (
          <Chip
            key={y}
            isActive={watchedYears.includes(y)}
            onClick={() => onToggleWatchedYear(y)}
            ariaLabel={`Filter watched-date to ${y}`}
          >
            {y}
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
          // Conditional aria-live — only the visually dominant
          // region per viewport announces. The mobile trigger row's
          // count carries aria-live="polite" too; this drawer/sidebar
          // span gets it only when it's the dominant surface (sidebar
          // on md+). Stops the same number from being announced
          // 2-3x in sequence on filter changes.
          aria-live={announceResultCount ? "polite" : undefined}
        >
          {totalResults.toLocaleString()}{" "}
          {totalResults === 1 ? "film" : "films"}
        </span>
        {showClearAll && anyControlChangedFromDefault ? (
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
  // Stable id derived from the label slug. role="group" +
  // aria-labelledby give the chip cluster programmatic context for
  // SR users navigating button-by-button — without this, AT users
  // hear each chip's aria-label without knowing the chips belong
  // to a group, which makes multi-select especially confusing
  // ("can I press more than one? are these mutually exclusive?").
  const labelId = `films-filter-row-${label
    .toLowerCase()
    .replace(/\s+/g, "-")}`;
  return (
    <div role="group" aria-labelledby={labelId}>
      <Kicker id={labelId}>{label}</Kicker>
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
        // Inactive borderColor mirrors the chipBaseStyle's border —
        // both must be --border-interactive for SC 1.4.11.
        borderColor: isActive
          ? "var(--text-action)"
          : "var(--border-interactive)",
      }}
      // .film-filter-chip carries the transition + paired
      // prefers-reduced-motion override (see components.css). An
      // inline `transition` on chipBaseStyle would outrank Tailwind's
      // motion-reduce:transition-none class, silently defeating the
      // accessibility guard.
      className="film-filter-chip hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2"
    >
      {children}
    </button>
  );
}

/**
 * Active-filter chip rail. Renders above the grid (above EmptyState
 * too) when at least one filter is active or the sort is non-default.
 * Each chip is a single-action dismisser that removes just one
 * dimension; "Clear all" appears when 2+ items are active so a user
 * with several filters has a one-tap escape. Returns null when
 * nothing is active so the row collapses cleanly.
 *
 * The chips intentionally mirror the underlying URL-param granularity
 * (one chip per rating value, one chip per genre, one chip per
 * year) so a user's single × matches the underlying URL toggle one-
 * to-one — no surprise dependent state changes.
 */
function ActiveFilterChips({
  filters,
  sort,
  onRemoveRating,
  onRemoveGenre,
  onRemoveWatchedYear,
  onClearWatchedWindow,
  onResetSort,
  onClearAll,
}: {
  filters: FilmFilters;
  sort: FilmSort;
  onRemoveRating: (r: number) => void;
  onRemoveGenre: (g: string) => void;
  onRemoveWatchedYear: (y: number) => void;
  onClearWatchedWindow: () => void;
  onResetSort: () => void;
  onClearAll: () => void;
}) {
  const ratings = filters.ratings ?? [];
  const genres = filters.genres ?? [];
  const watchedYears = filters.watchedYears ?? [];
  const sortIsDefault = sort === "latest-watched-desc";

  // Total count of dismissable items — used to decide whether a
  // "Clear all" affordance is worth surfacing here. With one item
  // active the user can dismiss it directly; with two or more the
  // bulk-clear is a meaningful shortcut.
  const dismissableCount =
    ratings.length +
    genres.length +
    watchedYears.length +
    (filters.watchedWindow !== undefined ? 1 : 0) +
    (sortIsDefault ? 0 : 1);

  if (dismissableCount === 0) return null;

  return (
    // Self-contained flex-wrap nav. Block-level outer box so the
    // following sibling (the InfoToast desktop variant) starts on
    // its own line below — see the chip-rail wrapper comment in
    // FilmsShell for the layout reasoning.
    <nav
      aria-label="Active filters"
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: 8,
      }}
    >
      {ratings.map((r) => (
        <DismissableChip
          key={`rating-${r}`}
          label={`${r}★`}
          ariaLabel={`Remove ${r}-star filter`}
          onDismiss={() => onRemoveRating(r)}
        />
      ))}
      {genres.map((g) => (
        <DismissableChip
          key={`genre-${g}`}
          label={g}
          ariaLabel={`Remove ${g} filter`}
          onDismiss={() => onRemoveGenre(g)}
        />
      ))}
      {watchedYears.map((y) => (
        <DismissableChip
          key={`year-${y}`}
          label={String(y)}
          ariaLabel={`Remove ${y} watched-year filter`}
          onDismiss={() => onRemoveWatchedYear(y)}
        />
      ))}
      {filters.watchedWindow === "12mo" ? (
        <DismissableChip
          label="Past 12 months"
          ariaLabel="Remove past-12-months filter"
          onDismiss={onClearWatchedWindow}
        />
      ) : null}
      {!sortIsDefault ? (
        <DismissableChip
          label={`Sort: ${labelForSort(sort)}`}
          ariaLabel="Reset sort to newest watch"
          onDismiss={onResetSort}
        />
      ) : null}
      {dismissableCount >= 2 ? (
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
    </nav>
  );
}

/** Pill-shaped chip with a label and a trailing × dismisser.
 *  Single-button affordance — tapping anywhere on the chip removes
 *  it. Visual treatment matches the active state of FilterContent's
 *  Chip (filled background + page-color text) so the user reads
 *  these as "currently applied" without ambiguity. */
function DismissableChip({
  label,
  ariaLabel,
  onDismiss,
}: {
  label: string;
  ariaLabel: string;
  onDismiss: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onDismiss}
      aria-label={ariaLabel}
      style={{
        ...chipBaseStyle,
        // --text-action is the right token here even for a fill,
        // because the films cluster explicitly bumps --text-action
        // up to --primary-700 (orange-700) so white-on-orange clears
        // SC 1.4.3 (5.82:1, vs --primary-default's 3.61:1). Using
        // --primary-default for the fill would re-introduce the
        // contrast bug AND visually fork the cluster's orange in
        // light mode (links land at orange-700; this fill at
        // orange-500 = the "two oranges" people-eye notice).
        background: "var(--text-action)",
        color: "var(--surface-page)",
        borderColor: "var(--text-action)",
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
      }}
      className="film-filter-chip hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2"
    >
      <span>{label}</span>
      <span aria-hidden="true" style={{ fontSize: 14, lineHeight: 1 }}>
        ✕
      </span>
    </button>
  );
}

/** Look up the user-facing label for a sort value. Mirrors
 *  SORT_OPTIONS but as a plain Map-like read so the chip rail can
 *  use it without iterating the option list. */
function labelForSort(sort: FilmSort): string {
  const opt = SORT_OPTIONS.find((o) => o.value === sort);
  return opt?.label ?? sort;
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
        // focus-visible utilities match every other focusable
        // element in this file. Without them, the browser's
        // default focus indicator was often invisible against the
        // dashed-border empty-state surface.
        className="focus-visible:outline-2 focus-visible:outline-offset-2"
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

/** Map the URL-param keys touched by a navigate() call to a single
 *  analytics dimension label. watchedYear + watchedWindow collapse
 *  to "watched" since they're mutually exclusive in the filter
 *  model. Multiple keys touched in one call (rare; happens only
 *  when toggling watched-mode) report the most-specific dimension.
 *  Returns null when the navigate is purely a side-effect (e.g.
 *  page-only) so the caller can skip firing the event. */
function pickFilterDimension(keys: string[]): string | null {
  if (keys.includes("rating")) return "rating";
  if (keys.includes("genre")) return "genre";
  if (keys.includes("watchedYear") || keys.includes("watchedWindow"))
    return "watched";
  if (keys.includes("sort")) return "sort";
  return null;
}

function countActiveFilters(filters: FilmFilters): number {
  let n = 0;
  if (filters.ratings && filters.ratings.length > 0) n++;
  if (filters.genres && filters.genres.length > 0) n++;
  // releaseYearMin / releaseYearMax intentionally NOT counted here
  // — they're parsed from the URL and respected by applyFilters,
  // but no chip in ActiveFilterChips and no input in FilterContent
  // currently surface them. Counting them would bump the badge
  // without giving the user a chip to dismiss. Add the increments
  // back when (and if) release-year UI ships.
  // Watched date is one filter slot — years and window are
  // mutually exclusive per the discriminated union, so they share
  // a slot in the active-count badge.
  if (
    (filters.watchedYears && filters.watchedYears.length > 0) ||
    filters.watchedWindow !== undefined
  ) {
    n++;
  }
  return n;
}

// ─── Inline styles ────────────────────────────────────────────────

// chipBaseStyle uses --border-interactive (grey-700 on white = ~5:1
// light, grey-600 on black = ~4.35:1 dark). The previous
// --border-default (grey-50 / grey-800 in dark) failed SC 1.4.11
// (3:1 minimum for non-text UI components) — the border is the
// sole visual indicator distinguishing inactive chips from the
// page background, so it has to clear AA. Matches the
// triggerButtonStyle below which already used --border-interactive
// for the same reason.
// Transition lives on the .film-filter-chip class in components.css
// (paired with a prefers-reduced-motion override). Inline styles
// outrank @media-wrapped Tailwind classes, so the previous inline
// `transition` defeated motion-reduce:transition-none silently.
const chipBaseStyle: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 12,
  letterSpacing: "0.04em",
  padding: "6px 12px",
  borderRadius: 999,
  border: "1px solid var(--border-interactive)",
  cursor: "pointer",
  whiteSpace: "nowrap",
  outlineColor: "var(--border-focus)",
};

const sortSelectStyle: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 12,
  padding: "6px 8px",
  // Same SC 1.4.11 fix as chipBaseStyle — the select's border is
  // the only visual boundary distinguishing the control from the
  // page surface.
  border: "1px solid var(--border-interactive)",
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

// Match the chip-rail Kicker register so the drawer's "Filters"
// heading reads as a section label (peer of "Sort", "Rating",
// "Genre", etc.), not a page-level heading. The semantic h2 stays
// for aria-labelledby; only the visual treatment shrinks. Was
// p-lg-font-size in --font-primary (Roboto Slab inside the films
// cluster), which set "Filters" 1.5× larger than its surrounding
// content.
const drawerTitleStyle: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: "var(--p-sm-font-size)",
  lineHeight: 1.4,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "var(--text-caption)",
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

// Sticky drawer footer that holds the "Show N films" CTA on mobile.
// flexShrink: 0 keeps it pinned at the bottom when the body
// scrolls, and the top border separates it from the filter content
// above.
const drawerFooterStyle: CSSProperties = {
  flexShrink: 0,
  padding: "16px 20px",
  borderTop: "1px solid var(--border-default)",
  background: "var(--surface-page)",
};

const drawerShowResultsButtonStyle: CSSProperties = {
  width: "100%",
  fontFamily: "var(--font-mono)",
  fontSize: 13,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  padding: "12px 16px",
  borderRadius: "var(--border-radius-sm)",
  // --text-action is the cluster's contrast-safe interactive orange
  // (orange-700 in films light mode, via the override in globals.css).
  // Using --primary-default here would drop white-on-orange contrast
  // below AA AND visually fork the orange family — see DismissableChip
  // above for the same reasoning.
  border: "1px solid var(--text-action)",
  background: "var(--text-action)",
  color: "var(--surface-page)",
  cursor: "pointer",
  outlineColor: "var(--border-focus)",
};

