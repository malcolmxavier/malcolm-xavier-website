// ─────────────────────────────────────────────────────────────────
// StatsFilterControls — the client island that drives a stats dashboard's
// filters (STATS-FILTERS §4/§9). Cluster-agnostic: films, television, and
// connected each pass their own rails, summary dimensions, and omnibox
// endpoint.
//
// Two layers, by design (see the placement note in the build thread):
//   • Sticky SUMMARY BAR — always shows the "Filter" trigger and the live
//     recomputed count; once any filter is active it also shows the active
//     values as chips (high-cardinality AND bounded, so the always-visible
//     bar is the at-a-glance state) plus "Clear all".
//   • Summoned PANEL — the heavy input surface (omnibox + tri-state rails)
//     flies in from the right on desktop / bottom-sheets on mobile, so the
//     stats bands aren't shoved down the page by an always-open rail.
//
// State is URL-driven (§9): this island never holds filter state of its
// own. It reads the current params, and every control writes the next
// param value back via router.replace, which re-renders the server
// component over the narrowed corpus. The mutation math lives in the pure
// filter-url-state helpers (reused, not reforked); this component only
// wires them to controls + navigation.
// ─────────────────────────────────────────────────────────────────

"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { track } from "@vercel/analytics";
import { ANALYTICS_EVENTS } from "@/lib/analytics";
import { Stack } from "@/components/layout/Stack";
import { Kicker } from "@/components/typography/Kicker";
import { FilterRail } from "@/components/filters/FilterRail";
import { FacetAccordion } from "@/components/filters/FacetAccordion";
import { SearchOmnibox } from "@/components/filters/SearchOmnibox";
import { SummaryFilterChip } from "@/components/filters/SummaryFilterChip";
import { DismissableChip } from "@/components/filters/DismissableChip";
import { deslugify } from "@/components/filters/deslugify";
import type { Suggestion } from "@/components/filters/omnibox-types";
import type {
  StatsRail,
  StatsSummaryDim,
} from "@/components/filters/stats-filter-types";
import { parseDimension } from "@/lib/feeds/stats/filter-url";
import {
  cycleDimensionValue,
  dimensionState,
  setDimensionValue,
} from "@/lib/feeds/stats/filter-url-state";

export type StatsFilterControlsProps = {
  /** Bounded tri-state rails (built server-side from the unfiltered corpus). */
  rails: StatsRail[];
  /** High-cardinality dimensions reached through the omnibox. */
  summaryDims: StatsSummaryDim[];
  /** Rail params that belong in the collapsible "More filters" tail
   *  (the rest render inline above it). */
  tailParams?: string[];
  /** Omnibox Route Handler + copy (reuses the reviews facet-search endpoint). */
  omniboxEndpoint: string;
  omniboxLabel: string;
  omniboxPlaceholder: string;
  omniboxAriaLabel: string;
  /** Cluster transition class — "film-filter-chip" / "show-filter-chip". */
  chipClassName: string;
  /** Cluster id namespace for the rails' generated labelIds. */
  idPrefix: string;
  /** Where filter changes navigate, e.g. "/films/stats". */
  basePath: string;
  /** Singular / plural for the count + CTA, e.g. {singular:"film", plural:"films"}. */
  noun: { singular: string; plural: string };
  /** The recomputed corpus size for the active predicate (the live n). */
  totalResults: number;
  /** Which dashboard this drives — tags the STATS_FILTER_APPLIED events
   *  so the dashboard can compare filter engagement across clusters. */
  cluster: "films" | "television" | "connected";
};

const PANEL_ID = "stats-filter-panel";

// The sticky bar pins this far below the viewport top (clears the h-16 site
// nav). Single source of truth: barStyle.top reads it, and the stuck-state
// observer offsets its root by the same amount so the two can't drift.
const STICKY_TOP_PX = 64;

export function StatsFilterControls({
  rails,
  summaryDims,
  tailParams = [],
  omniboxEndpoint,
  omniboxLabel,
  omniboxPlaceholder,
  omniboxAriaLabel,
  chipClassName,
  idPrefix,
  basePath,
  noun,
  totalResults,
  cluster,
}: StatsFilterControlsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Panel (fly-in / bottom-sheet) state + the focus pair the dialog
  // contract moves between (trigger ⇄ close button).
  const [panelOpen, setPanelOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // "Stuck" = the bar has scrolled up to its pinned position with dashboard
  // content passing beneath it. Only then does it earn a separating edge (a
  // soft shadow + faint hairline); at rest it stays clean, so the at-rest
  // stack (lede rule → bar → corpus-label rule) isn't over-ruled. A zero-
  // height sentinel just above the bar reports the transition.
  const [stuck, setStuck] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // slug → display name for high-cardinality values picked via the omnibox
  // this session. After router.replace the chip re-renders from the URL slug
  // alone, so this restores the real name (deslugify is the fallback for a
  // value that arrived by deep-link with no hint).
  const [pickerHints, setPickerHints] = useState<Record<string, string>>({});

  // ─── Dialog contract (mirrors the reviews drawer) ────────────────
  // On open: focus the close button, lock body scroll, inert the site nav
  // so Tab can't escape upward; Esc closes and restores focus to the
  // trigger; a JS focus-trap cycles Tab inside the panel.
  useEffect(() => {
    if (!panelOpen) return;
    closeButtonRef.current?.focus();
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const navEl = document.querySelector("nav");
    navEl?.setAttribute("inert", "");

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setPanelOpen(false);
        triggerRef.current?.focus();
        return;
      }
      if (e.key !== "Tab") return;
      const dialog = document.getElementById(PANEL_ID);
      if (!dialog) return;
      const focusable = Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
        // Skip controls that aren't rendered (the collapsed accordion tail).
        // getClientRects() — not offsetParent — because the panel is
        // position:fixed, and some browsers report offsetParent as null for
        // descendants of a fixed ancestor, which would wrongly drop visible
        // controls from the trap. getClientRects is robust under fixed.
      ).filter((el) => el.getClientRects().length > 0);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (e.shiftKey) {
        if (active === first || !dialog.contains(active as Node)) {
          e.preventDefault();
          last.focus();
        }
      } else if (active === last || !dialog.contains(active as Node)) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = originalOverflow;
      navEl?.removeAttribute("inert");
    };
  }, [panelOpen]);

  // ─── Stuck-state detection (sticky bar elevation) ────────────────
  // Watch the sentinel that sits at the bar's natural top. Shrinking the
  // observer root's top edge by STICKY_TOP_PX puts the trip line exactly at
  // the pinned position: once the sentinel scrolls above it, it stops
  // intersecting and the bar is stuck. No scroll listener, so no per-frame
  // work. Falls back to "never stuck" where IntersectionObserver is absent.
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      ([entry]) => setStuck(!entry.isIntersecting),
      { rootMargin: `-${STICKY_TOP_PX}px 0px 0px 0px`, threshold: 0 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // ─── URL writer ──────────────────────────────────────────────────
  // The single mutation primitive: set (or delete, when empty) one param,
  // then navigate. scroll:false keeps the viewport put through the
  // server round-trip, like the reviews shell.
  const getRaw = (param: string) => searchParams.get(param) ?? "";
  function writeParam(param: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(param, value);
    else params.delete(param);
    const qs = params.toString();
    router.replace(qs ? `${basePath}?${qs}` : basePath, { scroll: false });
    // A non-empty value added/changed the dimension; an empty one cleared
    // its last value. Single choke point for every per-dimension control
    // (rail cycle, chip toggle/remove, omnibox add, director query).
    track(ANALYTICS_EVENTS.STATS_FILTER_APPLIED, {
      cluster,
      dimension: param,
      action: value ? "apply" : "clear",
    });
  }

  // Rail chip cycles neutral → include → exclude → neutral (Style A).
  const onCycle = (param: string, slug: string) =>
    writeParam(param, cycleDimensionValue(getRaw(param), slug));
  // Summary chip body flips include ⇄ exclude (Style B).
  const onToggleChip = (param: string, slug: string, excluded: boolean) =>
    writeParam(
      param,
      setDimensionValue(getRaw(param), slug, excluded ? "include" : "exclude"),
    );
  // Summary chip × (and rail "remove") drops the value to neutral.
  const onRemoveChip = (param: string, slug: string) =>
    writeParam(param, setDimensionValue(getRaw(param), slug, "neutral"));

  // Route an omnibox selection (reuses the rebuilt reviews typeahead):
  //   • a Title jumps to its detail page;
  //   • a slug facet (actor / writer / studio / conglomerate / language /
  //     country) is added as an include and remembered for its chip label;
  //   • the fuzzy ?director= suggestion (param but no facetKey, value = the
  //     canonical name) sets the free-text director query. It's include-only
  //     — a fuzzy text match can't carry exclusion — so it renders as a plain
  //     removable chip, not a tri-state one.
  function onOmniboxSelect(s: Suggestion) {
    if (s.href) {
      router.push(s.href);
      return;
    }
    if (s.param === "director" && s.value && !s.facetKey) {
      writeParam("director", s.value);
      return;
    }
    if (s.param && s.facetKey && s.value) {
      const slug = s.value;
      setPickerHints((h) => ({ ...h, [slug]: s.label }));
      writeParam(s.param, setDimensionValue(getRaw(s.param), slug, "include"));
    }
  }

  function clearAll() {
    router.replace(basePath, { scroll: false });
    track(ANALYTICS_EVENTS.STATS_FILTER_APPLIED, {
      cluster,
      dimension: "all",
      action: "clear-all",
    });
  }

  // ─── Derive view state from the URL ──────────────────────────────
  // Each rail value's tri-state is read from its param string.
  const railsWithState = rails.map((r) => {
    const raw = getRaw(r.param);
    return {
      ...r,
      values: r.values.map((v) => ({
        ...v,
        state: dimensionState(raw, v.slug),
      })),
    };
  });

  // Active chips across EVERY dimension (bounded rails + high-card summary
  // dims), so the always-visible bar reflects the full predicate. Bounded
  // values resolve their label from the rail's value map; high-card values
  // from the omnibox hint, falling back to a de-slugified name.
  const railLabel = new Map(
    rails.map((r) => [r.param, new Map(r.values.map((v) => [v.slug, v.label]))]),
  );
  // The high-card dimensions' human label ("Actor", "Studio", "Country"),
  // used to prefix their chips below.
  const summaryLabel = new Map(summaryDims.map((d) => [d.param, d.label]));
  const dims = [
    ...rails.map((r) => ({ param: r.param, isRail: true })),
    ...summaryDims.map((d) => ({ param: d.param, isRail: false })),
  ];
  const activeChips = dims.flatMap((d) => {
    const { include, exclude } = parseDimension(getRaw(d.param));
    const nameFor = (slug: string) =>
      d.isRail
        ? (railLabel.get(d.param)?.get(slug) ?? deslugify(slug))
        : (pickerHints[slug] ?? deslugify(slug));
    // Entity-facet chips (actor / writer / studio / language / country / …)
    // carry a "Type: Name" prefix so a bare name — a person's especially —
    // reads unambiguously. This matches the reviews shell's active-chip
    // convention (ActiveFilterChips renders `${label}: ${name}`). Bounded
    // rail values (a genre, a star rating) are self-describing and stay bare.
    const chipLabel = (slug: string) => {
      const name = nameFor(slug);
      if (d.isRail) return name;
      const type = summaryLabel.get(d.param);
      return type ? `${type}: ${name}` : name;
    };
    return [
      ...include.map((slug) => ({
        param: d.param,
        slug,
        label: chipLabel(slug),
        excluded: false,
      })),
      ...exclude.map((slug) => ({
        param: d.param,
        slug,
        label: chipLabel(slug),
        excluded: true,
      })),
    ];
  });

  // The fuzzy director query is its own include-only string param (not a
  // slug-encoded dimension), so it's tracked alongside the tri-state chips.
  const directorQuery = searchParams.get("director") ?? "";

  const activeCount = activeChips.length + (directorQuery ? 1 : 0);
  const countText = `${totalResults.toLocaleString()} ${
    totalResults === 1 ? noun.singular : noun.plural
  }`;

  // Split rails into the inline primary set and the collapsible tail.
  const tail = new Set(tailParams);
  const primaryRails = railsWithState.filter((r) => !tail.has(r.param));
  const tailRails = railsWithState.filter((r) => tail.has(r.param));

  return (
    <>
      {/* Trip wire just above the bar — its exit past the pinned line flips
          `stuck`. It needs real height: Chrome's IntersectionObserver reports a
          zero-area target as NOT intersecting, which would read as "stuck" at
          rest. 1px tall with a -1px margin nets zero layout impact. aria-hidden:
          purely a layout probe. */}
      <div
        ref={sentinelRef}
        aria-hidden="true"
        style={{ height: 1, marginBottom: -1 }}
      />
      {/* ─── Sticky summary bar ──────────────────────────────────── */}
      <div
        style={stuck ? { ...barStyle, ...barStuckStyle } : barStyle}
        className="stats-filter-bar"
      >
        <div style={barTopRowStyle}>
          <button
            ref={triggerRef}
            type="button"
            onClick={() => setPanelOpen(true)}
            aria-expanded={panelOpen}
            aria-controls={PANEL_ID}
            // Spell the count into the accessible name so AT hears "Filter, 3
            // active" rather than the visual "Filter · 3" (where the middot
            // reads as "dot" or drops out).
            aria-label={activeCount > 0 ? `Filter, ${activeCount} active` : "Filter"}
            style={triggerStyle}
            className={`${chipClassName} focus-visible:outline-2 focus-visible:outline-offset-2`}
          >
            Filter{activeCount > 0 ? ` · ${activeCount}` : ""}
          </button>
          {/* The live n — the single most important affordance (§4): it
              warns before a selection thins the page into collapse.
              aria-live announces the recompute for non-sighted users. */}
          <span style={countStyle} aria-live="polite">
            {countText}
          </span>
        </div>

        {activeCount > 0 ? (
          // The summary is more than a chip dump: a labelled group whose
          // chips are the live readback (tap a body to flip include⇄exclude,
          // the corner × to remove) with a bulk Clear all.
          <div role="group" aria-label="Active filters">
            <Kicker>Active filters</Kicker>
            <div style={chipsRowStyle}>
              {activeChips.map((c) => (
                <SummaryFilterChip
                  key={`${c.param}-${c.slug}`}
                  label={c.label}
                  excluded={c.excluded}
                  onToggle={() => onToggleChip(c.param, c.slug, c.excluded)}
                  onRemove={() => onRemoveChip(c.param, c.slug)}
                  chipClassName={chipClassName}
                />
              ))}
              {/* Fuzzy director — include-only, so a plain removable chip. */}
              {directorQuery ? (
                <DismissableChip
                  label={`Director: “${directorQuery}”`}
                  ariaLabel={`Remove director search for ${directorQuery}`}
                  onDismiss={() => writeParam("director", "")}
                  chipClassName={chipClassName}
                />
              ) : null}
              <button
                type="button"
                onClick={clearAll}
                style={clearAllStyle}
                aria-label="Clear all filters"
                className="focus-visible:outline-2 focus-visible:outline-offset-2"
              >
                Clear all
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {/* ─── Summoned panel (fly-in desktop / bottom-sheet mobile) ── */}
      {panelOpen ? (
        <>
          {/* Backdrop — click to dismiss. A presentational div, not a button:
              it's aria-hidden and off the tab order, and the labelled dismiss
              paths are the close button + Esc, so exposing it as a control was
              wrong. The pointer-dismiss is a redundant convenience. */}
          <div
            aria-hidden="true"
            onClick={() => {
              setPanelOpen(false);
              triggerRef.current?.focus();
            }}
            style={backdropStyle}
          />
          <div
            id={PANEL_ID}
            role="dialog"
            aria-modal="true"
            aria-labelledby="stats-filter-panel-title"
            // Bottom sheet on mobile; right-side fly-in on md+. Tailwind owns
            // the responsive position switch; inline styles own the tokens.
            // md:inset-y-0 pins the desktop rail top AND bottom to the viewport
            // so it has a definite height — that bounded height is what lets the
            // body scroll. (Do NOT add md:bottom-auto here: it cancels the
            // bottom pin, the panel grows to its content, and scroll dies.)
            className="fixed z-50 inset-x-0 bottom-0 max-h-[85dvh] rounded-t-2xl md:inset-y-0 md:left-auto md:right-0 md:w-[380px] md:max-h-none md:rounded-none flex flex-col"
            style={panelStyle}
          >
            <header style={panelHeaderStyle}>
              <h2 id="stats-filter-panel-title" style={panelTitleStyle}>
                Filters
              </h2>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={() => {
                  setPanelOpen(false);
                  triggerRef.current?.focus();
                }}
                aria-label="Close filters"
                style={panelCloseStyle}
                className="focus-visible:outline-2 focus-visible:outline-offset-2"
              >
                <span aria-hidden="true">✕</span>
              </button>
            </header>

            <div style={panelBodyStyle}>
              <Stack gap="500">
                {/* How the tri-state filters work. Exclusion isn't obvious
                    from the chips alone (one tap includes, a second excludes),
                    so the panel spells the interaction out in words. */}
                <p style={panelHintStyle}>
                  Select a filter once to include it, again to exclude it
                  (marked with − and a strike-through), and a third time to
                  clear it.
                </p>
                {/* Omnibox leads — the only way to reach the high-card
                    dimensions (people / studios / networks). */}
                <SearchOmnibox
                  endpoint={omniboxEndpoint}
                  label={omniboxLabel}
                  placeholder={omniboxPlaceholder}
                  ariaLabel={omniboxAriaLabel}
                  onSelect={onOmniboxSelect}
                />

                {primaryRails.map((r) => (
                  <FilterRail
                    key={r.param}
                    label={r.label}
                    idPrefix={idPrefix}
                    chipClassName={chipClassName}
                    values={r.values}
                    onCycle={(slug) => onCycle(r.param, slug)}
                  />
                ))}

                {tailRails.length > 0 ? (
                  <FacetAccordion label="More filters" collapsible>
                    {tailRails.map((r) => (
                      <FilterRail
                        key={r.param}
                        label={r.label}
                        idPrefix={idPrefix}
                        chipClassName={chipClassName}
                        values={r.values}
                        onCycle={(slug) => onCycle(r.param, slug)}
                      />
                    ))}
                  </FacetAccordion>
                ) : null}
              </Stack>
            </div>

            {/* Sticky footer — "Show N" closes the panel so the user sees the
                updated dashboard without hunting for the close button. */}
            <div style={panelFooterStyle}>
              <button
                type="button"
                onClick={() => {
                  setPanelOpen(false);
                  triggerRef.current?.focus();
                }}
                style={showResultsStyle}
                className="hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2"
              >
                Show {countText}
              </button>
            </div>
          </div>
        </>
      ) : null}
    </>
  );
}

// ─── Inline styles (all cluster-scoped tokens) ──────────────────────

const barStyle: CSSProperties = {
  position: "sticky",
  top: STICKY_TOP_PX, // clears the sticky site nav (h-16)
  zIndex: 30,
  background: "var(--surface-page)",
  // No bottom divider AT REST: the bordered Section above already draws the
  // single rule separating this strip from the lede, and a second line here
  // bracketed the filter in two dividers right next to the corpus-band rule.
  // The separating edge only appears once pinned (barStuckStyle), by which
  // point the corpus rule has scrolled away, so the two never crowd.
  padding: "12px 0",
  display: "flex",
  flexDirection: "column",
  gap: 12,
  // The shadow/border fade as the bar pins lives in the `.stats-filter-bar`
  // CSS class (app/components.css), NOT here: an inline transition can't be
  // reached by a prefers-reduced-motion media query, and this is a visible
  // positional elevation shift that should drop for reduced-motion users.
  // Reserve the 1px edge up front (transparent at rest) so pinning doesn't
  // shift layout. Driven as LONGHANDS, not the `borderBottom` shorthand: the
  // stuck style only flips borderBottomColor, and mixing shorthand-here with
  // longhand-there left the color reverting to currentColor (an opaque line)
  // instead of transparent when un-pinning after a scroll.
  borderBottomWidth: 1,
  borderBottomStyle: "solid",
  borderBottomColor: "transparent",
};

// Applied only while the bar is pinned: a soft downward shadow reads as
// "content passes under a floating bar." The --shadow-sticky token carries a
// black-alpha shadow on light and a light-channel glow on dark, so the pinned
// state reads as a frosted floating bar in both themes (not just a hairline).
const barStuckStyle: CSSProperties = {
  borderBottomColor: "var(--border-default)",
  boxShadow: "var(--shadow-sticky)",
};

const barTopRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 16,
};

const triggerStyle: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 13,
  letterSpacing: "0.04em",
  padding: "8px 16px",
  borderRadius: 999,
  border: "1px solid var(--border-interactive)",
  background: "var(--surface-page)",
  color: "var(--text-body)",
  cursor: "pointer",
  outlineColor: "var(--border-focus)",
};

const countStyle: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 14,
  color: "var(--text-body)",
  fontVariantNumeric: "tabular-nums",
};

const chipsRowStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: 10,
  marginTop: "var(--scale-200)", // kicker-to-row gap; --scale-200 = 8px
};

const clearAllStyle: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 12,
  letterSpacing: "0.04em",
  padding: "6px 12px",
  borderRadius: 999,
  border: "1px solid var(--border-interactive)",
  background: "transparent",
  color: "var(--text-body)",
  cursor: "pointer",
  outlineColor: "var(--border-focus)",
};

const backdropStyle: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 40,
  // A plain dark scrim is near-invisible over the dark-mode page (dark on
  // dark). Pairing the scrim with a small backdrop blur dims the page content
  // regardless of luminance, so the modal reads as modal in both themes — the
  // same backdrop-filter trick the Nav and case-study glass already use.
  background: "rgba(0,0,0,0.5)",
  backdropFilter: "blur(2px)",
  WebkitBackdropFilter: "blur(2px)",
  border: "none",
  padding: 0,
  cursor: "pointer",
};

const panelStyle: CSSProperties = {
  background: "var(--surface-page)",
  borderColor: "var(--border-default)",
  borderWidth: 1,
  borderStyle: "solid",
  // Per-theme elevation token (upward cast for this bottom-anchored panel);
  // light-channel in dark so the panel separates from the near-black page.
  boxShadow: "var(--shadow-panel)",
};

const panelHeaderStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "16px 20px",
  borderBottom: "1px solid var(--border-default)",
};

const panelHintStyle: CSSProperties = {
  margin: 0,
  fontFamily: "var(--font-mono)",
  fontSize: 12,
  lineHeight: 1.5,
  color: "var(--text-caption)",
};

const panelTitleStyle: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 14,
  letterSpacing: "0.04em",
  color: "var(--text-body)",
  margin: 0,
};

const panelCloseStyle: CSSProperties = {
  width: 32,
  height: 32,
  borderRadius: 999,
  border: "1px solid var(--border-interactive)",
  background: "var(--surface-page)",
  color: "var(--text-body)",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  outlineColor: "var(--border-focus)",
};

const panelBodyStyle: CSSProperties = {
  padding: 20,
  overflowY: "auto",
  flex: 1,
  // A flex child only scrolls if it's allowed to shrink below its content
  // height — without min-height:0 it grows to fit and the panel overflows
  // its own bounds instead of scrolling. This is the fix for the
  // "can't scroll the open panel" report.
  minHeight: 0,
};

const panelFooterStyle: CSSProperties = {
  padding: 16,
  borderTop: "1px solid var(--border-default)",
};

const showResultsStyle: CSSProperties = {
  width: "100%",
  fontFamily: "var(--font-mono)",
  fontSize: 14,
  letterSpacing: "0.04em",
  padding: "12px 16px",
  borderRadius: "var(--border-radius-sm)",
  border: "none",
  background: "var(--text-action)",
  color: "var(--surface-page)",
  cursor: "pointer",
  outlineColor: "var(--border-focus)",
};
