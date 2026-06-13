// ─────────────────────────────────────────────────────────────────
// ClusterRail — inline cluster sub-navigation (Overview / Reviews).
//
// Lives INSIDE the hero column on a cluster's hub pages (the editorial
// landing + the reviews corpus, and the stats dashboard once Phase 2
// ships) — directly beneath the lede + follow link — rather than as a
// separate full-width bar. Keeping it in the hero column means the
// editorial copy + the local nav form one block, and on the reviews
// page the left column's full height (copy + nav) is what the stats
// chart on the right stretches to match.
//
// Plain server component: the tabs are real <NextLink>s and the active
// tab is passed in by the page, so the links are crawlable in the
// server-rendered HTML and there's no client JS.
//
// Visual language is intentionally DISTINCT from AllOrWatchingToggle
// (the grid-scoped All/Watching control), which uses an underline
// treatment. This rail uses a filled-pill active state so that on
// /television/reviews — where both appear — they read as two clearly
// different levels of navigation rather than one confusing double row.
//
// Tabs are Overview + Reviews + "The numbers" (the stats dashboard,
// added in WS5 once the page became real — it was held back under the
// no-placeholder rule until then).
//
// (Earlier this was a sticky frosted bar that measured the global nav
// height. It was moved into the hero column on 2026-06-03 — a short
// editorial hero next to the tall stats panel left a large void, and
// pulling the nav into the column fixed the height imbalance at the
// root. The sticky/measurement machinery is gone with it.)
// ─────────────────────────────────────────────────────────────────

import type { CSSProperties, ComponentType, SVGProps } from "react";
import NextLink from "next/link";
import {
  IconChartBar,
  IconHome,
  IconLink,
  IconStar,
} from "@/components/icons";

type SubBrand = "film" | "tv" | "music";

type ClusterTab = "overview" | "reviews" | "numbers";

// Leading glyph per tab, so the rail reads as navigation at a glance and
// the labels carry less weight. Decorative (aria-hidden via the icon
// defaults) — each tab's text is the accessible name. The Connected
// `extra` pill uses the link glyph.
type Glyph = ComponentType<SVGProps<SVGSVGElement> & { size?: number }>;
const TAB_ICON: Record<ClusterTab, Glyph> = {
  overview: IconHome,
  reviews: IconStar,
  numbers: IconChartBar,
};

export function ClusterRail({
  base,
  active,
  subbrand,
  label,
  className = "",
  extra,
}: {
  /** Cluster root path, e.g. "/films" or "/television". Tab hrefs are
   *  built from this (Overview → base, Reviews → `${base}/reviews`). */
  base: string;
  /** Which tab is the current page. Drives the filled active state
   *  and aria-current. */
  active: ClusterTab;
  /** Sub-brand slug. Re-asserted as data-subbrand on the nav so the
   *  rail resolves the cluster's color tokens even if it were ever
   *  rendered outside the page's data-subbrand wrapper (harmless when
   *  nested — it just re-declares the same vars). */
  subbrand: SubBrand;
  /** Accessible name for the landmark, e.g. "Films sections". Keeps
   *  this <nav> distinguishable from the global "Primary" nav and the
   *  footer nav for assistive tech. */
  label: string;
  /** Optional utility classes merged onto the <nav> (e.g. top spacing
   *  to separate the nav from the editorial copy above it). */
  className?: string;
  /** An optional extra pill after the three tabs — used by the stats
   *  pages to surface the cross-brand /stats/connected dashboard inline
   *  with the rail (it's a sibling destination, never an active tab). */
  extra?: { label: string; href: string };
}) {
  const tabs: { key: ClusterTab; label: string; href: string }[] = [
    { key: "overview", label: "Overview", href: base },
    { key: "reviews", label: "Reviews", href: `${base}/reviews` },
    // "The numbers" joins in WS5 now that the stats dashboard is real
    // (was omitted under the no-placeholder rule).
    { key: "numbers", label: "The numbers", href: `${base}/stats` },
  ];

  return (
    <nav aria-label={label} data-subbrand={subbrand} className={className}>
      <ul style={listStyle}>
        {tabs.map((tab) => {
          const isActive = tab.key === active;
          const Icon = TAB_ICON[tab.key];
          return (
            <li key={tab.key} style={{ margin: 0, padding: 0 }}>
              <NextLink
                href={tab.href}
                aria-current={isActive ? "page" : undefined}
                style={isActive ? activeTabStyle : tabStyle}
                // The active pill needs white label text on its filled
                // accent. The sub-brand link cascade in components.css
                // (`[data-subbrand] a { color … !important }`) would
                // otherwise force the cluster link color onto it
                // (orange-on-orange, invisible), so the active tab carries
                // a marker class that a matching-!important rule in
                // components.css uses to pin the label white. Inactive
                // tabs keep the cascade's cluster color (AA on the page).
                className={`transition-colors motion-reduce:transition-none hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2${
                  isActive ? " cluster-rail-tab--active" : ""
                }`}
              >
                <Icon size={14} style={{ flex: "none" }} />
                {tab.label}
              </NextLink>
            </li>
          );
        })}
        {/* Cross-brand sibling (e.g. /stats/connected) — a plain inactive
            pill inline with the tabs; never carries the active state. */}
        {extra ? (
          <li style={{ margin: 0, padding: 0 }}>
            <NextLink
              href={extra.href}
              style={tabStyle}
              className="transition-colors motion-reduce:transition-none hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              <IconLink size={14} style={{ flex: "none" }} />
              {extra.label}
            </NextLink>
          </li>
        ) : null}
      </ul>
    </nav>
  );
}

// ─── Styles ───────────────────────────────────────────────────────

// Inline pill row, left-aligned. No padding/background/border on the
// row itself — it sits in the hero Stack and picks up that Stack's gap
// for separation from the follow link above it.
const listStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  listStyle: "none",
  margin: 0,
  padding: 0,
};

// Shared tab geometry. ~40px tall (10px block padding + ~20px line
// box) — comfortably clears the WCAG 2.5.8 AA target floor (24px) and
// approaches the 44px AAA target.
const tabBaseStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  fontFamily: "var(--font-mono)",
  fontSize: 12,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  padding: "10px 16px",
  borderRadius: "var(--border-radius-sm)",
  textDecoration: "none",
  whiteSpace: "nowrap",
  outlineColor: "var(--border-focus)",
};

// Inactive tab: outlined, body-text color. --border-interactive clears
// SC 1.4.11 (3:1) for the boundary; matches the filter chips' posture.
const tabStyle: CSSProperties = {
  ...tabBaseStyle,
  background: "transparent",
  color: "var(--text-body)",
  border: "1px solid var(--border-interactive)",
};

// Exported so sibling navs that aren't a cluster rail — notably the
// connected dashboard's "back to the film / television numbers" pills —
// match the inactive-pill look exactly instead of re-deriving it.
export const railPillStyle: CSSProperties = tabStyle;

// Active tab: a filled accent pill, AA-safe in BOTH themes.
//
// Deliberately theme-INDEPENDENT. The earlier approach paired a
// theme-flipping fill with `color: var(--surface-page)` text — but
// --surface-page doesn't resolve inside this nav's re-asserted
// [data-subbrand] scope (it chains through --neutral-white, which isn't
// defined here), so the text color collapsed onto the fill: orange-on-
// orange, ~1:1, invisible. (Same footgun as the --text-action alias bug
// in sub-brand inline styles.)
//
// Fix: anchor to tokens that ALWAYS resolve. --primary-700 is the
// cluster's -700 ramp step (orange-700 #8f5912 / blue-700), dark in
// both themes; --foundation-white is a root constant (#fff). White-on-
// orange-700 = 5.82:1, white-on-blue-700 higher — both clear SC 1.4.3,
// identically in light and dark. The pill reads the same in both modes
// (a standard filled-accent control) rather than flipping.
const activeTabStyle: CSSProperties = {
  ...tabBaseStyle,
  background: "var(--primary-700)",
  color: "var(--foundation-white)",
  border: "1px solid var(--primary-700)",
};
