// ─────────────────────────────────────────────────────────────────
// TelevisionShell — client wrapper for the /television grid + filter UI.
//
// Mirrors FilmsShell's architecture: filter sidebar on md+ (sticky),
// fly-in drawer on <md, chip rail above grid for active filters,
// pagination preserved across filter changes. Filter state lives in
// URL params — every control change calls router.replace, which
// re-runs page.tsx, which runs applyCompletedCardFilters and passes
// a new card slice down.
//
// URL params owned here:
//   ?rating=4,4.5,5     — per-review rating multiselect
//   ?genre=Drama,Comedy — per-show genre multiselect
//   ?watchedYear=2026,2024  per-review watched-year multi-select (CSV)
//   ?sort=...           — sort dimension (omitted = default)
//   ?page=N             — current page (reset to 1 on any filter change)
//
// Phase 1 scope: parity with /films minus the rolling 12-month
// window + mode-switch toast (those compose two mutually-exclusive
// modes and the TV cluster doesn't need that complexity until the
// "Past 12 months" affordance lands). Adding them later is a
// straightforward port from FilmsShell.
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
import { SegmentedButton } from "@/components/primitives/SegmentedButton";
import { ANALYTICS_EVENTS } from "@/lib/analytics";
import type {
  CompletedCard,
  ShowFilters,
  ShowSort,
} from "@/lib/feeds/serializd-utils";
import { slugifyEntity, type FacetGroup } from "@/lib/feeds/slug";
import { ClusterGridNav } from "@/components/feeds/ClusterGridNav";
import { useScrollRestoration } from "@/components/feeds/useScrollRestoration";
import { ShowCard } from "./ShowCard";

const RATING_VALUES = [
  0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5,
] as const;

// Most-recent-activity (default) → year/rating/name dimensions.
// Past tense throughout so vocabulary matches the filter chips
// ("Watched", "Rated"). Mirrors /films's SORT_OPTIONS posture.
const SORT_OPTIONS: { value: ShowSort; label: string }[] = [
  { value: "latest-activity-desc", label: "Most recent activity" },
  { value: "latest-activity-asc", label: "Earliest activity" },
  { value: "rating-desc", label: "Highest rated" },
  { value: "rating-asc", label: "Lowest rated" },
  { value: "premiere-year-desc", label: "Newest premiered" },
  { value: "premiere-year-asc", label: "Oldest premiered" },
  { value: "show-name-asc", label: "A → Z" },
];

const DRAWER_ID = "television-filter-drawer";

type Props = {
  cards: CompletedCard[];
  totalPages: number;
  currentPage: number;
  totalResults: number;
  filters: ShowFilters;
  sort: ShowSort;
  /** Genres in the snapshot, sorted by usage descending. */
  availableGenres: string[];
  /** Canonical primary networks in the snapshot, sorted by usage desc. */
  availableNetworks: string[];
  /** TMDB series types in the snapshot, sorted by usage desc. */
  availableTypes: string[];
  /** Watched years in the snapshot, sorted desc. */
  availableWatchedYears: number[];
  /** Wave B low-cardinality facet groups (language, country, network
   *  group, decade) — labelled chip rails whose values are entity slugs.
   *  Same vocabulary the stats tiles deep-link with. */
  entityFacets: FacetGroup[];
  /** Genre pinned by the route (when mounted from /television/
   *  genre/<slug>). Drives query-string seeding so multi-filter
   *  combos retarget back to /television. */
  routeGenre?: string;
  /** Wave B facet route pin (network/type are name-based; creator, actor,
   *  language, country, decade are slug-based) — seeded into the query on
   *  every nav so the facet survives the hand-off to /television/reviews.
   *  network and type carry canonical names as their value; the rest carry
   *  slugs. (TV has no param-less facet, unlike film's director.) */
  routePin?: { param: string; value: string };
  /** slug → canonical name for the route's pinned facet (actor, creator),
   *  so its active chip shows the real name even off the sidebar rails. */
  entityNameHints?: Record<string, string>;
  /**
   * Source listing URL (relative, including any active query
   * params) — passed down to each ShowCard so the detail page
   * can compute filter-aware adjacent-show neighbors. Computed
   * by the parent page from its own URL state. When undefined,
   * detail pages fall back to latestActivityDate ordering.
   */
  originHref?: string;
  /**
   * In-progress show count. Surfaces as a parenthetical on the
   * "Watching" tab of the All/Watching toggle so the user can
   * tell at a glance how much is on the other view. Falsy /
   * zero hides the count.
   */
  watchingCount: number;
  /**
   * Pre-filter completed-card count for the "All" tab parity
   * count — i.e. allCards.length at the page level before
   * applyCompletedCardFilters runs. Same posture as watchingCount
   * (hidden when zero).
   */
  allCount: number;
};

export function TelevisionShell({
  cards,
  totalPages,
  currentPage,
  totalResults,
  allCount,
  filters,
  sort,
  availableGenres,
  availableNetworks,
  availableTypes,
  availableWatchedYears,
  entityFacets,
  routeGenre,
  routePin,
  entityNameHints,
  originHref,
  watchingCount,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Restore the exact scroll position when returning from a detail page
  // (the back-link push doesn't get native scroll restoration).
  useScrollRestoration();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Transient toast for the watched-date mode-switch — set on
  // destructive transitions between rolling-window and discrete-
  // year modes (the two are mutually exclusive per the
  // discriminated-union shape of WatchedDateFilter). aria-live
  // lets SR users hear the announcement; the auto-clear timer
  // mirrors /films's 4s window. Closes the parallel of
  // films-watched-mode-switch-silent-destruction.
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  useEffect(() => {
    if (!toastMessage) return;
    const t = setTimeout(() => setToastMessage(null), 4000);
    return () => clearTimeout(t);
  }, [toastMessage]);

  // Drawer-open side effects — focus management, scroll lock,
  // Esc dismissal, inert on the global <nav>, and a Tab focus-
  // trap that keeps keyboard focus cycling inside the drawer.
  // role="dialog" aria-modal="true" hints to AT users that the
  // dialog is modal but doesn't actually trap keyboard focus —
  // that's the JS responsibility below. The existing
  // inert={drawerOpen} on the desktop layout wrapper covers the
  // filter sidebar / grid subtree, and the navEl.setAttribute
  // covers the global Nav, but the listing hero / catalog Kicker
  // / mobile SummaryPanel siblings of TelevisionShell stay
  // focusable — without the Tab trap, Tab from the last drawer
  // focusable (the "Show results" button) escapes there.
  // Cleanup restores tab order. Same convention applied to
  // FilmsShell so the two clusters' drawers behave identically
  // for keyboard + AT users.
  useEffect(() => {
    if (!drawerOpen) return;
    closeButtonRef.current?.focus();
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const navEl = document.querySelector("nav");
    navEl?.setAttribute("inert", "");
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setDrawerOpen(false);
        triggerRef.current?.focus();
        return;
      }
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
        // Shift+Tab from first focusable (or focus already
        // outside the dialog) → cycle to last.
        if (active === first || !dialog.contains(active as Node)) {
          e.preventDefault();
          last.focus();
        }
      } else {
        // Tab from last focusable (or focus already outside)
        // → cycle to first.
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

  // String-form memo dep so a fresh ReadonlyURLSearchParams reference
  // doesn't bust the memo when the URL hasn't changed. Same trick as
  // FilmsShell.
  const searchParamsString = searchParams.toString();
  const preserveParams = useMemo(() => {
    const out: Record<string, string> = {};
    for (const [k, v] of searchParams.entries()) {
      if (k === "page" || k === "ref" || k === "from") continue;
      out[k] = v;
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParamsString]);

  function navigate(updates: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams.toString());
    if (routeGenre && !params.has("genre")) {
      params.set("genre", routeGenre);
    }
    // Carry a Wave B facet route's pin forward (see routePin prop docs).
    if (routePin && !params.has(routePin.param)) {
      params.set(routePin.param, routePin.value);
    }
    for (const [k, v] of Object.entries(updates)) {
      if (v === undefined || v === "") {
        params.delete(k);
      } else {
        params.set(k, v);
      }
    }
    const onlyPage = Object.keys(updates).every((k) => k === "page");
    if (!onlyPage) params.delete("page");
    // Fire SHOW_FILTER_APPLIED for non-page navigations so the
    // dashboard reports which filter dimensions earn their UI
    // real-estate. dimension is derived from the keys touched —
    // mirrors FilmsShell's pickFilterDimension shape (with
    // cardKind added since TV has the Show/Season segmented
    // control Films doesn't). Page-only navigations don't fire
    // (pagination clicks are not filter changes; they get their
    // own event when PAGINATION_CLICK lands at the primitive).
    if (!onlyPage) {
      const dimension = pickFilterDimension(Object.keys(updates));
      if (dimension) {
        track(ANALYTICS_EVENTS.SHOW_FILTER_APPLIED, { dimension });
      }
    }
    // Multi-filter combos from a genre route land on the corpus grid
    // at /television/reviews (the cluster root /television is now the
    // editorial landing). The non-genre branch uses pathname, already
    // /television/reviews when mounted there.
    const targetBase = routeGenre || routePin ? "/television/reviews" : pathname;
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
    navigate({ rating: next.length > 0 ? next.join(",") : undefined });
  }

  function toggleGenre(genre: string) {
    const current = filters.genres ?? [];
    const next = current.includes(genre)
      ? current.filter((g) => g !== genre)
      : [...current, genre];
    navigate({ genre: next.length > 0 ? next.join(",") : undefined });
  }

  function toggleNetwork(network: string) {
    const current = filters.networks ?? [];
    const next = current.includes(network)
      ? current.filter((n) => n !== network)
      : [...current, network];
    navigate({ network: next.length > 0 ? next.join(",") : undefined });
  }

  function toggleType(type: string) {
    const current = filters.types ?? [];
    const next = current.includes(type)
      ? current.filter((t) => t !== type)
      : [...current, type];
    navigate({ type: next.length > 0 ? next.join(",") : undefined });
  }

  // Generic toggle for every Wave B entity facet (language, country,
  // network group, decade). Chip value is an entity slug; `key` is the
  // ShowFilters array, `param` the URL param. OR within a facet.
  function toggleEntityFacet(param: string, key: string, slug: string) {
    const current =
      ((filters as Record<string, unknown>)[key] as string[] | undefined) ?? [];
    const next = current.includes(slug)
      ? current.filter((s) => s !== slug)
      : [...current, slug];
    navigate({ [param]: next.length > 0 ? next.join(",") : undefined });
  }

  function toggleWatchedYear(year: number) {
    // Mode-switch handling: when the user is currently in
    // rolling-window mode and clicks a year chip, the year click
    // is destructive (it clears the window). Set a transient
    // toast so the silent state loss surfaces, then switch
    // modes. Otherwise toggle the year in/out of the array.
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
    // destroys the year set. Surface the destructive transition
    // before flipping modes.
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

  /**
   * Set the card-kind scope. "both" clears the filter so the URL
   * stays shareable without a redundant `?cardKind=both` param;
   * "show" / "season" narrow the grid to that level. The
   * SummaryPanel's mode toggle is intentionally NOT synced — the
   * grid-vs-chart split is preserved per the ShowFilters.cardKind
   * comment in serializd-utils.
   */
  function setCardKind(value: "both" | "show" | "season") {
    navigate({ cardKind: value === "both" ? undefined : value });
  }

  function handleSortChange(value: ShowSort) {
    navigate({
      sort: value === "latest-activity-desc" ? undefined : value,
    });
  }

  // Title search (?title=). Value arrives already trimmed from
  // SearchInput; "" clears the param. navigate() handles empty→delete +
  // page reset + analytics ("search" dimension via pickFilterDimension).
  function handleTitleChange(value: string) {
    navigate({ title: value || undefined });
  }

  function clearAll() {
    router.replace(pathname, { scroll: false });
  }

  const activeFilterCount = countActiveFilters(filters);
  const sortIsDefault = sort === "latest-activity-desc";
  const anyControlChangedFromDefault =
    activeFilterCount > 0 || !sortIsDefault;

  const sharedFilterContentProps = {
    filters,
    sort,
    availableGenres,
    availableNetworks,
    availableTypes,
    availableWatchedYears,
    entityFacets,
    anyControlChangedFromDefault,
    totalResults,
    onToggleRating: toggleRating,
    onToggleGenre: toggleGenre,
    onToggleNetwork: toggleNetwork,
    onToggleType: toggleType,
    onToggleWatchedYear: toggleWatchedYear,
    onSetWatched12Mo: setWatched12Mo,
    onClearWatchedDate: clearWatchedDate,
    onToggleEntityFacet: toggleEntityFacet,
    onSortChange: handleSortChange,
    onTitleChange: handleTitleChange,
    onSetCardKind: setCardKind,
    onClearAll: clearAll,
  };
  const sidebarFilterContent = (
    <FilterContent {...sharedFilterContentProps} showClearAll={false} />
  );
  const drawerFilterContent = (
    <FilterContent {...sharedFilterContentProps} />
  );

  return (
    <>
      {/* ─── Single result-count live region ─────────────────────
          One sr-only live region at the Shell root carries the
          announcement for AT, regardless of viewport. The two
          visible result-count surfaces below (mobile trigger row,
          desktop FilterContent footer) duplicate the text for
          sighted users but no longer carry aria-live themselves
          — across a viewport-resize the prior pair could
          double-announce as both rendered briefly during the
          transition (SC 4.1.3 timing risk). */}
      <div role="status" aria-live="polite" className="sr-only">
        {totalResults.toLocaleString()}{" "}
        {resultNoun(filters.cardKind, totalResults)}
      </div>

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
        <span style={resultCountStyle}>
          {totalResults.toLocaleString()}{" "}
          {resultNoun(filters.cardKind, totalResults)}
        </span>
      </div>

      {/* ─── Mobile drawer ─────────────────────────────────── */}
      {drawerOpen ? (
        <div
          id={DRAWER_ID}
          role="dialog"
          aria-modal="true"
          aria-labelledby="television-filter-drawer-title"
          className="md:hidden"
          style={drawerOverlayStyle}
        >
          <header style={drawerHeaderStyle}>
            <h2 id="television-filter-drawer-title" style={drawerTitleStyle}>
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
              {resultNoun(filters.cardKind, totalResults)}
            </button>
          </div>
        </div>
      ) : null}

      {/* ─── Desktop/tablet layout (md+) ─────────────────────── */}
      <div
        className="md:grid md:gap-8 md:grid-cols-[280px_1fr] lg:gap-10 lg:grid-cols-[320px_1fr]"
        inert={drawerOpen}
      >
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

        <div>
          <Headline level={2} className="sr-only">
            Television reviews
          </Headline>
          {/* All / Watching toggle — sits above the grid so the
              user can switch views without leaving the listing
              context. The "All" link inherits originHref so any
              active filters carry forward; "Watching" hops to
              the in-progress route. Placement matches the
              /music shell's All/Collections toggle.
              id="grid" + scroll-margin-top is the anchor target
              the toggle's hrefs append (#grid) — so switching
              views lands the user at this row, not at the page
              hero, even after a long-page scroll. */}
          <div
            id="grid"
            style={{ marginBottom: 16, scrollMarginTop: "5rem" }}
          >
            <ClusterGridNav
              cluster="television"
              active="all"
              watchingCount={watchingCount}
              allCount={allCount}
              allHref={originHref ?? "/television/reviews"}
              from={routeGenre ? "genre" : "listing"}
            />
          </div>
          {(anyControlChangedFromDefault || toastMessage) ? (
            <div style={{ marginBottom: 16 }}>
              <ActiveFilterChips
                filters={filters}
                sort={sort}
                entityFacets={entityFacets}
                onRemoveRating={toggleRating}
                onRemoveGenre={toggleGenre}
                onRemoveNetwork={toggleNetwork}
                onRemoveType={toggleType}
                onRemoveWatchedYear={toggleWatchedYear}
                onClearWatchedWindow={clearWatchedDate}
                onResetCardKind={() => setCardKind("both")}
                onRemoveTitle={() => handleTitleChange("")}
                onRemoveEntityFacet={toggleEntityFacet}
                onResetSort={() => handleSortChange("latest-activity-desc")}
                onClearAll={clearAll}
                entityNameHints={entityNameHints}
              />
              {/* Inline mode-switch toast — sits below the chip
                  rail on md+ so a destructive transition stays
                  visible without shifting the grid. The mobile
                  variant is fixed-positioned inside InfoToast and
                  ignores this DOM placement. */}
              <InfoToast
                message={toastMessage}
                mobileBottomOffset={drawerOpen ? 96 : 24}
              />
            </div>
          ) : null}
          {cards.length > 0 ? (
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
              {cards.map((card) => (
                <li
                  key={`${card.show.id}#${card.review.id}`}
                >
                  <ShowCard card={card} originHref={originHref} />
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
              ariaLabel="Television review pages"
              surface={routeGenre ? "television-genre" : routePin ? "television-facet" : "television"}
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
  availableNetworks,
  availableTypes,
  availableWatchedYears,
  entityFacets,
  anyControlChangedFromDefault,
  totalResults,
  onToggleRating,
  onToggleGenre,
  onToggleNetwork,
  onToggleType,
  onToggleWatchedYear,
  onSetWatched12Mo,
  onClearWatchedDate,
  onToggleEntityFacet,
  onSortChange,
  onTitleChange,
  onSetCardKind,
  onClearAll,
  showClearAll = true,
}: {
  filters: ShowFilters;
  sort: ShowSort;
  availableGenres: string[];
  availableNetworks: string[];
  availableTypes: string[];
  availableWatchedYears: number[];
  entityFacets: FacetGroup[];
  anyControlChangedFromDefault: boolean;
  totalResults: number;
  onToggleRating: (r: number) => void;
  onToggleGenre: (g: string) => void;
  onToggleNetwork: (n: string) => void;
  onToggleType: (t: string) => void;
  onToggleWatchedYear: (y: number) => void;
  /** Set the rolling 12-month window mode. Mutually exclusive
   *  with watchedYears — see the toggleWatchedYear /
   *  setWatched12Mo handlers in TelevisionShell. */
  onSetWatched12Mo: () => void;
  /** Clear both watchedYears and watchedWindow so the dimension
   *  reads as "all time." */
  onClearWatchedDate: () => void;
  onToggleEntityFacet: (param: string, key: string, slug: string) => void;
  onSortChange: (v: ShowSort) => void;
  /** Push a new title query (already trimmed; "" clears it). */
  onTitleChange: (v: string) => void;
  /** Set the card-kind scope. "both" clears the filter; "show" /
   *  "season" narrows the grid. Three-state segmented control
   *  rather than two checkboxes so the mutually-exclusive nature
   *  of the scope is obvious from the UI. */
  onSetCardKind: (v: "both" | "show" | "season") => void;
  onClearAll: () => void;
  /** Hide inline "Clear all" button when the chip rail above the
   *  grid carries the bulk-clear affordance. */
  showClearAll?: boolean;
}) {
  const cardKind = filters.cardKind ?? "both";
  return (
    <Stack gap="500">
      {/* Search leads the rail — title only (TV has no director field).
          Debounced, writes ?title=. */}
      <SearchInput
        value={filters.titleQuery ?? ""}
        onSearch={onTitleChange}
        label="Title"
        placeholder="Search titles"
        ariaLabel="Search shows by title"
      />

      <div>
        <Kicker>Sort</Kicker>
        <select
          value={sort}
          onChange={(e) => {
            const match = SORT_OPTIONS.find(
              (o) => o.value === e.target.value,
            );
            if (match) onSortChange(match.value);
          }}
          aria-label="Sort television by"
          style={{ ...sortSelectStyle, marginTop: 8 }}
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {/* Card-kind scope — segmented control. Default label "All"
          reads as the unfiltered state (matches surrounding "all
          reviews" vocabulary); "Shows" and "Seasons" narrow. The
          internal cardKind value stays "both" — only the user-
          facing label is "All", so existing shared URLs with
          ?cardKind=both still resolve. Same visual language as
          the SummaryPanel's mode toggle so the two read as
          siblings even though they're independent (grid scope vs.
          chart scope; see ShowFilters.cardKind comment in
          serializd-utils). */}
      <div role="group" aria-labelledby="tv-shell-card-scope-label">
        <Kicker id="tv-shell-card-scope-label">Scope</Kicker>
        <div
          style={{
            display: "flex",
            gap: 4,
            marginTop: 8,
            padding: 4,
            background: "var(--surface-default)",
            border: "1px solid var(--border-default)",
            borderRadius: "var(--border-radius-sm)",
          }}
        >
          <SegmentedButton
            active={cardKind === "both"}
            onClick={() => onSetCardKind("both")}
          >
            All
          </SegmentedButton>
          <SegmentedButton
            active={cardKind === "show"}
            onClick={() => onSetCardKind("show")}
          >
            Shows
          </SegmentedButton>
          <SegmentedButton
            active={cardKind === "season"}
            onClick={() => onSetCardKind("season")}
          >
            Seasons
          </SegmentedButton>
        </div>
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
            the year multi-select; the toggleWatchedYear /
            setWatched12Mo handlers fire a toast on the
            destructive transition so the silent state loss is
            visible. */}
        <Chip
          isActive={
            (filters.watchedYears ?? []).length === 0 &&
            filters.watchedWindow === undefined
          }
          onClick={onClearWatchedDate}
          ariaLabel="All time"
        >
          All time
        </Chip>
        <Chip
          isActive={filters.watchedWindow === "12mo"}
          onClick={onSetWatched12Mo}
          ariaLabel="Filter watched-date to past 12 months"
        >
          Past 12 months
        </Chip>
        {availableWatchedYears.map((y) => (
          <Chip
            key={y}
            isActive={(filters.watchedYears ?? []).includes(y)}
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

      {availableNetworks.length > 0 ? (
        <FilterRow label="Network">
          {availableNetworks.map((n) => (
            <Chip
              key={n}
              isActive={(filters.networks ?? []).includes(n)}
              onClick={() => onToggleNetwork(n)}
              ariaLabel={`Filter to ${n}`}
            >
              {n}
            </Chip>
          ))}
        </FilterRow>
      ) : null}

      {availableTypes.length > 0 ? (
        <FilterRow label="Type">
          {availableTypes.map((t) => (
            <Chip
              key={t}
              isActive={(filters.types ?? []).includes(t)}
              onClick={() => onToggleType(t)}
              ariaLabel={`Filter to ${t}`}
            >
              {t}
            </Chip>
          ))}
        </FilterRow>
      ) : null}

      {/* Wave B low-cardinality facets — one always-visible chip rail per
          group (language, country, network group, decade). Chip value is
          an entity slug; OR within a facet. Same vocabulary as the stats
          tiles, so a tile deep-link selects the same chip here. */}
      {entityFacets.map((fg) => {
        if (fg.options.length === 0) return null;
        const active =
          ((filters as Record<string, unknown>)[fg.key] as string[] | undefined) ??
          [];
        return (
          <FilterRow key={fg.param} label={fg.label}>
            {fg.options.map(([name]) => {
              const slug = slugifyEntity(name);
              return (
                <Chip
                  key={slug}
                  isActive={active.includes(slug)}
                  onClick={() => onToggleEntityFacet(fg.param, fg.key, slug)}
                  ariaLabel={`Filter to ${name}`}
                >
                  {name}
                </Chip>
              );
            })}
          </FilterRow>
        );
      })}

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
        <span style={resultCountStyle}>
          {totalResults.toLocaleString()}{" "}
          {resultNoun(filters.cardKind, totalResults)}
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
  const labelId = `television-filter-row-${label
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
        borderColor: isActive
          ? "var(--text-action)"
          : "var(--border-interactive)",
      }}
      // .show-filter-chip class carries the transition + paired
      // prefers-reduced-motion override (added in components.css
      // alongside .film-filter-chip).
      className="show-filter-chip hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2"
    >
      {children}
    </button>
  );
}

function ActiveFilterChips({
  filters,
  sort,
  entityFacets,
  onRemoveRating,
  onRemoveGenre,
  onRemoveNetwork,
  onRemoveType,
  onRemoveWatchedYear,
  onClearWatchedWindow,
  onResetCardKind,
  onRemoveTitle,
  onRemoveEntityFacet,
  onResetSort,
  onClearAll,
  entityNameHints,
}: {
  filters: ShowFilters;
  sort: ShowSort;
  entityFacets: FacetGroup[];
  onRemoveRating: (r: number) => void;
  onRemoveGenre: (g: string) => void;
  onRemoveNetwork: (n: string) => void;
  onRemoveType: (t: string) => void;
  onRemoveWatchedYear: (y: number) => void;
  onClearWatchedWindow: () => void;
  onResetCardKind: () => void;
  onRemoveTitle: () => void;
  onRemoveEntityFacet: (param: string, key: string, slug: string) => void;
  onResetSort: () => void;
  onClearAll: () => void;
  /** slug → canonical name for route/deep-link facets not in the rails
   *  (actor, creator), so their chip shows the real name. */
  entityNameHints?: Record<string, string>;
}) {
  const ratings = filters.ratings ?? [];
  const genres = filters.genres ?? [];
  const networks = filters.networks ?? [];
  const types = filters.types ?? [];
  const watchedYears = filters.watchedYears ?? [];
  const sortIsDefault = sort === "latest-activity-desc";
  const cardKindActive = filters.cardKind !== undefined;

  // Active Wave B entity-facet selections → dismissable descriptors,
  // across EVERY slug-based facet (not just the sidebar rails), so a
  // route-pinned or deep-linked actor/creator shows a chip too. Name
  // resolves: route hint → rail option list → de-slugified fallback.
  // (network + type are name-based and chipped separately below.)
  const railOptions = new Map(entityFacets.map((fg) => [fg.key, fg.options]));
  const entityActive = TV_CHIP_FACETS.flatMap(({ key, param, label }) => {
    const selected = (filters[key] as string[] | undefined) ?? [];
    return selected.map((slug) => ({
      param,
      key,
      label,
      slug,
      name:
        entityNameHints?.[slug] ??
        railOptions.get(key)?.find(([n]) => slugifyEntity(n) === slug)?.[0] ??
        deslugify(slug),
    }));
  });

  const watchedWindowActive = filters.watchedWindow !== undefined;
  const dismissableCount =
    ratings.length +
    genres.length +
    networks.length +
    types.length +
    watchedYears.length +
    entityActive.length +
    (cardKindActive ? 1 : 0) +
    (watchedWindowActive ? 1 : 0) +
    (filters.titleQuery ? 1 : 0) +
    (sortIsDefault ? 0 : 1);

  if (dismissableCount === 0) return null;

  return (
    <div
      role="group"
      aria-label="Active filters"
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: 8,
      }}
    >
      {filters.titleQuery ? (
        <DismissableChip
          label={`Title: “${filters.titleQuery}”`}
          ariaLabel={`Clear title search for ${filters.titleQuery}`}
          onDismiss={onRemoveTitle}
        />
      ) : null}
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
      {networks.map((n) => (
        <DismissableChip
          key={`network-${n}`}
          label={n}
          ariaLabel={`Remove ${n} network filter`}
          onDismiss={() => onRemoveNetwork(n)}
        />
      ))}
      {types.map((t) => (
        <DismissableChip
          key={`type-${t}`}
          label={t}
          ariaLabel={`Remove ${t} type filter`}
          onDismiss={() => onRemoveType(t)}
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
      {watchedWindowActive ? (
        <DismissableChip
          label="Past 12 months"
          ariaLabel="Remove past-12-months filter"
          onDismiss={onClearWatchedWindow}
        />
      ) : null}
      {entityActive.map((e) => (
        <DismissableChip
          key={`${e.param}-${e.slug}`}
          label={`${e.label}: ${e.name}`}
          ariaLabel={`Remove ${e.name} ${e.label} filter`}
          onDismiss={() => onRemoveEntityFacet(e.param, e.key, e.slug)}
        />
      ))}
      {cardKindActive ? (
        <DismissableChip
          label={
            filters.cardKind === "show" ? "Shows only" : "Seasons only"
          }
          ariaLabel="Reset scope to both shows and seasons"
          onDismiss={onResetCardKind}
        />
      ) : null}
      {!sortIsDefault ? (
        <DismissableChip
          label={`Sort: ${labelForSort(sort)}`}
          ariaLabel="Reset sort to most recent activity"
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
    </div>
  );
}

/** Debounced search box for the reviews grid. Owns local input state
 *  for responsive typing and pushes the trimmed value to the URL ~300ms
 *  after the last keystroke. Re-syncs from `value` on external changes
 *  (chip dismiss, Clear all). Rendered in both the sidebar and the
 *  drawer. Mirrors FilmsShell's SearchInput (TV searches title only —
 *  the Serializd snapshot has no director field). */
function SearchInput({
  value,
  onSearch,
  label,
  placeholder,
  ariaLabel,
}: {
  value: string;
  onSearch: (v: string) => void;
  label: string;
  placeholder: string;
  ariaLabel: string;
}) {
  const [local, setLocal] = useState(value);
  const lastPushed = useRef(value);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (value !== lastPushed.current) {
      lastPushed.current = value;
      setLocal(value);
    }
  }, [value]);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  function handleChange(next: string) {
    setLocal(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const trimmed = next.trim();
      lastPushed.current = trimmed;
      onSearch(trimmed);
    }, 300);
  }

  return (
    <div>
      <Kicker>{label}</Kicker>
      <input
        type="search"
        value={local}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        className="reviews-search-input focus-visible:outline-2 focus-visible:outline-offset-2"
        style={{ ...searchInputStyle, marginTop: 8 }}
      />
    </div>
  );
}

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
        background: "var(--text-action)",
        color: "var(--surface-page)",
        borderColor: "var(--text-action)",
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
      }}
      className="show-filter-chip hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2"
    >
      <span>{label}</span>
      <span aria-hidden="true" style={{ fontSize: 14, lineHeight: 1 }}>
        ✕
      </span>
    </button>
  );
}

function labelForSort(sort: ShowSort): string {
  return SORT_OPTIONS.find((o) => o.value === sort)?.label ?? sort;
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
        Nothing here matches. Try clearing a filter or two.
      </p>
      <button
        type="button"
        onClick={onClearAll}
        className="focus-visible:outline-2 focus-visible:outline-offset-2"
        style={{ marginTop: 12, ...clearAllButtonStyle }}
      >
        Clear all filters
      </button>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────

function countActiveFilters(filters: ShowFilters): number {
  let n = 0;
  if (filters.ratings && filters.ratings.length > 0) n++;
  if (filters.genres && filters.genres.length > 0) n++;
  if (filters.networks && filters.networks.length > 0) n++;
  if (filters.types && filters.types.length > 0) n++;
  if (
    (filters.watchedYears && filters.watchedYears.length > 0) ||
    filters.watchedWindow !== undefined
  ) {
    n++;
  }
  if (filters.cardKind !== undefined) n++;
  if (filters.titleQuery) n++;
  // Each active Wave B facet counts as one slot.
  for (const key of [
    "actors",
    "creators",
    "conglomerates",
    "languages",
    "countries",
    "decades",
  ] as const) {
    const v = filters[key];
    if (v && v.length > 0) n++;
  }
  return n;
}

/** Title-case a slug for a chip label when no canonical name is available
 *  (a deep-linked facet value without a hint). The route pin passes the
 *  exact name via a hint. */
function deslugify(slug: string): string {
  return slug
    .split("-")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

// Slug-based Wave B facets that earn a dismissable chip. network + type are
// name-based and chipped separately (their WS3 handlers); these are the
// rest, so a route-pinned actor/creator shows a chip like the rail facets.
const TV_CHIP_FACETS: { key: keyof ShowFilters; param: string; label: string }[] = [
  { key: "actors", param: "actor", label: "Actor" },
  { key: "creators", param: "creator", label: "Creator" },
  { key: "conglomerates", param: "conglomerate", label: "Network group" },
  { key: "languages", param: "language", label: "Language" },
  { key: "countries", param: "country", label: "Country" },
  { key: "decades", param: "decade", label: "Decade" },
];

/**
 * Singular/plural noun for the result count, scoped to the active
 * cardKind filter. Reads as one coherent unit:
 *   • undefined / both → "review" / "reviews"
 *   • "show"           → "show review" / "show reviews"
 *   • "season"         → "season review" / "season reviews"
 *
 * The grammar mirrors how Malcolm would describe the slice in
 * conversation — "I have 11 show reviews" reads more naturally
 * than "I have 11 cards."
 */
function resultNoun(
  cardKind: ShowFilters["cardKind"],
  count: number,
): string {
  const singular =
    cardKind === "show"
      ? "show review"
      : cardKind === "season"
        ? "season review"
        : "review";
  return count === 1 ? singular : `${singular}s`;
}

/**
 * Map the URL keys touched in a navigate() call to a single
 * SHOW_FILTER_APPLIED dimension label. Mirrors FilmsShell's
 * pickFilterDimension contract so cross-cluster comparisons stay
 * clean — same vocabulary on both sides ("rating", "genre",
 * "watched", "sort"). TV adds "cardKind" for the Show/Season
 * segmented control films doesn't have.
 *
 * watchedYear and watchedWindow collapse into one "watched"
 * dimension since they're mutually exclusive (the
 * setWatched12Mo / toggleWatchedYear handlers always clear the
 * other side). Returns null when the navigate is a side-effect
 * like a pure pagination click so the caller can skip firing.
 *
 * First-match precedence: when multiple keys are touched in one
 * navigate() call (e.g. a hypothetical "apply preset" button
 * that sets rating AND genre simultaneously), only the first
 * branch above wins and that single dimension fires. This is
 * intentional — the precedence mirrors FilmsShell's contract,
 * keeps the dashboard's per-dimension funnel data clean
 * (one event per user action), and avoids over-counting on
 * compound interactions. Current call sites never compound;
 * if a future preset / multi-action surface lands and needs
 * compound dimension reporting, refactor to return string[]
 * and update both clusters in lockstep.
 */
function pickFilterDimension(keys: string[]): string | null {
  if (keys.includes("rating")) return "rating";
  if (keys.includes("genre")) return "genre";
  if (keys.includes("network")) return "network";
  if (keys.includes("type")) return "type";
  if (keys.includes("watchedYear") || keys.includes("watchedWindow"))
    return "watched";
  if (keys.includes("cardKind")) return "cardKind";
  if (keys.includes("title")) return "search";
  if (keys.includes("sort")) return "sort";
  // Wave B entity facets — report the param name as the dimension.
  for (const k of ["actor", "creator", "conglomerate", "language", "country", "decade"]) {
    if (keys.includes(k)) return k;
  }
  return null;
}

// ─── Inline styles ────────────────────────────────────────────────

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

// Search box — matches the sort <select> vocabulary with text-entry
// padding. Placeholder color via .reviews-search-input in components.css.
const searchInputStyle: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 12,
  padding: "8px 12px",
  border: "1px solid var(--border-interactive)",
  borderRadius: "var(--border-radius-sm)",
  background: "var(--surface-page)",
  color: "var(--text-body)",
  width: "100%",
  outlineColor: "var(--border-focus)",
};

const sortSelectStyle: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 12,
  padding: "6px 8px",
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
  border: "1px solid var(--text-action)",
  background: "var(--text-action)",
  color: "var(--surface-page)",
  cursor: "pointer",
  outlineColor: "var(--border-focus)",
};

