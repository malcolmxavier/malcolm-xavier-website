// ─────────────────────────────────────────────────────────────────
// ClusterGridNav — the grid-header view switcher shared by a cluster's
// reviews / watching / collections surfaces.
//
//   Television:  All (N) · Watching (N) · Collections · Lists
//   Films:       All (N) · Collections · Lists    (no "watching" for film)
//
// The Lists tab only renders when `showLists` is true (the cluster has
// published lists) or when it's the active surface — so it stays hidden
// on a cluster with no lists rather than linking to an empty hub.
//
// Each surface mounts this with its own `active` tab; the others render
// as links, so the control doubles as the navigation INTO collections
// (sitting next to Watching / next to All, as Malcolm specified) AND the
// way back OUT of it (the collections page drops the filter grid but keeps
// this nav at the top, linking to All — and Watching on TV).
//
// Generalized from the former TV-only AllOrWatchingToggle. Same visual
// grammar: fieldset+legend for SR, mono uppercase labels, a 2px sub-brand
// underline on the active tab, WCAG 2.5.8 target size (≥24px tall before
// the underline). Real <NextLink>s (crawlable, ⌘-click correct), not
// onClick buttons — these are route changes.
// ─────────────────────────────────────────────────────────────────

"use client";

import NextLink from "next/link";
import type { ReactNode } from "react";
import { track } from "@vercel/analytics";
import { ANALYTICS_EVENTS } from "@/lib/analytics";

type Cluster = "films" | "television";
type Tab = "all" | "watching" | "collections" | "lists";

// Append `#grid` to a URL, splicing in front of any existing hash, so a
// user switching back to "All" lands at the grid row rather than the page
// hero (they've already seen it). Collections/Watching omit the anchor —
// those are fresh-context entries whose hero framing is worth showing.
function withGridAnchor(href: string): string {
  const hashIdx = href.indexOf("#");
  if (hashIdx === -1) return `${href}#grid`;
  return `${href.slice(0, hashIdx)}#grid`;
}

export function ClusterGridNav({
  cluster,
  active,
  allCount,
  watchingCount,
  /** Show the Lists tab. True when the cluster has published lists; the
   *  tab also shows whenever Lists is the active surface. */
  showLists = false,
  /** Override the "All" href to preserve query-string filters when
   *  switching back from a filtered view. Defaults to the cluster's
   *  reviews grid. */
  allHref,
  /** Analytics surface label — the page the nav is mounted on. */
  from = "listing",
}: {
  cluster: Cluster;
  active: Tab;
  /** Total reviews count, shown next to "All". Hidden when zero. */
  allCount: number;
  /** In-progress count, shown next to "Watching" (television only).
   *  Hidden when zero. */
  watchingCount?: number;
  showLists?: boolean;
  allHref?: string;
  from?: string;
}) {
  const reviewsHref = allHref ?? `/${cluster}/reviews`;
  const collectionsHref = `/${cluster}/collections`;
  const listsHref = `/${cluster}/lists`;
  const legend = cluster === "films" ? "Films view" : "Television view";

  return (
    <fieldset
      className="flex items-center gap-6"
      style={{ border: 0, padding: 0, margin: 0 }}
    >
      <legend className="sr-only">{legend}</legend>
      <NavLink
        href={withGridAnchor(reviewsHref)}
        active={active === "all"}
        from={from}
        to="all"
      >
        All{allCount > 0 ? ` (${allCount.toLocaleString()})` : ""}
      </NavLink>
      {cluster === "television" ? (
        <NavLink
          href="/television/watching"
          active={active === "watching"}
          from={from}
          to="watching"
        >
          Watching
          {watchingCount && watchingCount > 0
            ? ` (${watchingCount.toLocaleString()})`
            : ""}
        </NavLink>
      ) : null}
      <NavLink
        href={collectionsHref}
        active={active === "collections"}
        from={from}
        to="collections"
      >
        Collections
      </NavLink>
      {showLists || active === "lists" ? (
        <NavLink
          href={listsHref}
          active={active === "lists"}
          from={from}
          to="lists"
        >
          Lists
        </NavLink>
      ) : null}
    </fieldset>
  );
}

function NavLink({
  href,
  active,
  children,
  from,
  to,
}: {
  href: string;
  active: boolean;
  children: ReactNode;
  from: string;
  to: Tab;
}) {
  return (
    <NextLink
      href={href}
      onClick={() => track(ANALYTICS_EVENTS.WATCHING_TAB_CLICK, { from, to })}
      // aria-current names the active route for AT users — the visual
      // underline is decorative; this is the semantic signal.
      aria-current={active ? "page" : undefined}
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: "var(--p-xs-font-size)",
        lineHeight: "var(--p-xs-line-height)",
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        color: active ? "var(--text-action)" : "var(--text-caption)",
        textDecoration: "none",
        // 4px vertical padding keeps the link ≥24px tall before the
        // underline (matches /music's WCAG 2.5.8 posture).
        padding: "4px 0",
        borderBottom: active
          ? "2px solid var(--text-action)"
          : "2px solid transparent",
        outlineColor: "var(--border-focus)",
      }}
      className="transition-colors motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-4"
    >
      {children}
    </NextLink>
  );
}
