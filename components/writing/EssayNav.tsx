// ─────────────────────────────────────────────────────────────────
// EssayNav — bottom-of-essay navigation to the essays either side of
// this one. Mirrors CaseStudyNav (and the NeighborLink pattern in
// /films/[slug] and /music/[playlistId]): newer LEFT, older RIGHT,
// with an aria-hidden placeholder for a missing direction so the
// grid keeps its two columns at md+ and the "right = older" reading
// model survives on the first and last essay.
//
// WHY THIS IS A CLIENT COMPONENT, and why both neighbour sets arrive
// as props. The reader's route through the corpus is carried in
// `?from=` — the listing their card sat on. Scoping the neighbours to
// that listing means asking a query param, and an essay page may NOT
// read `searchParams`: /essays/[pillar]/[slug] prerenders every essay
// at build (dynamicParams = false + generateStaticParams), and static
// serving is a deliberate performance/SEO position on this site.
// Reading searchParams on the page would opt the whole route out of
// it.
//
// So the page computes BOTH sets at build time — the whole corpus and
// this essay's pillar — and this component picks between them on the
// client. Six essays and four pillars, so computing every scope costs
// nothing.
//
// The pair rendered here is deliberately split from the picker below
// it: EssayNavCards takes no hooks, so the page can render it as the
// Suspense fallback with the global set. That matters because
// useSearchParams on a prerendered route pushes everything up to the
// nearest Suspense boundary to client-only rendering — with
// `fallback={null}` (the pattern the back-links use) these links would
// be absent from the built HTML, and they are the essay's outbound
// internal links. The fallback carries the correct default; the
// hydrated picker swaps in the pillar-scoped set when `?from=` asks
// for it.
// ─────────────────────────────────────────────────────────────────

"use client";

import NextLink from "next/link";
import { useSearchParams } from "next/navigation";
import { Stack } from "@/components/layout/Stack";
import { Kicker } from "@/components/typography/Kicker";

/** One neighbour, flattened to plain data.
 *
 *  Deliberately NOT the `Essay` type: an Essay carries its `Body`
 *  component, which cannot cross the server→client boundary, and its
 *  date needs formatting through lib/writing/essays.ts — a module that
 *  imports all six essay bodies and has no business in a client bundle.
 *  The page formats and flattens; this side renders strings. */
export interface EssayNavItem {
  /** Route to the essay, WITHOUT any `?from=` — added here per click
   *  target so the reader's scope travels with them. */
  href: string;
  title: string;
  /** The card's second line: the essay's own one-to-two sentence
   *  summary, same string the hub and pillar cards show. */
  description: string;
  /** Pre-formatted publication date (the page owns the formatting). */
  dateLabel: string;
}

/** The essays either side of the current one. A missing side is a
 *  boundary of the scope, not an error. */
export interface EssayNavNeighbors {
  newer?: EssayNavItem;
  older?: EssayNavItem;
}

// ─── EssayNavCards ───────────────────────────────────────────────
// The rendered pair. No hooks, so it is safe as a Suspense fallback
// (see the header note) as well as inside the picker.

export function EssayNavCards({
  neighbors,
  fromParam,
}: {
  neighbors: EssayNavNeighbors;
  /** Already-encoded listing URL to re-attach to each neighbour link,
   *  so hop after hop stays inside the list the reader is walking.
   *  Undefined → context-free links (the corpus-wide default). */
  fromParam?: string;
}) {
  const { newer, older } = neighbors;
  // Nothing either side — a pillar holding a single essay, which is
  // three of the four today. Render nothing rather than an empty grid
  // with a <nav> landmark a screen reader would announce and find bare.
  if (!newer && !older) return null;

  return (
    // No reading measure: two cards read left-to-right are page
    // geometry, not prose (see MEASURE.md §1). The width is the essay
    // column ArticleContainer already set, so the cards line up with
    // the article above them.
    <nav
      aria-label="Adjacent essays"
      className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6"
    >
      {newer ? (
        <NeighborCard item={newer} direction="newer" fromParam={fromParam} />
      ) : (
        // Placeholder holds the right-hand column so "right = older"
        // still reads on the newest essay in a scope.
        <span aria-hidden="true" />
      )}
      {older ? (
        <NeighborCard item={older} direction="older" fromParam={fromParam} />
      ) : (
        <span aria-hidden="true" />
      )}
    </nav>
  );
}

// ─── EssayNav ────────────────────────────────────────────────────
// The picker. Reads `?from=` and chooses which set of neighbours the
// reader is actually walking.

export function EssayNav({
  global,
  scoped,
  scopedFrom,
}: {
  /** Neighbours across the whole corpus — the default, and what a
   *  reader arriving from the hub, a search result, or a shared link
   *  should get. */
  global: EssayNavNeighbors;
  /** Neighbours within this essay's own pillar. */
  scoped: EssayNavNeighbors;
  /** The listing URL that `scoped` corresponds to, e.g. "/essays/craft".
   *
   *  This is also the guard. It is the ONE pillar listing this essay's
   *  card appears on, so an exact match is both the scope test and a
   *  validation of `from`: any other value — another pillar, a relative
   *  path, an off-site URL, a stale param — falls through to the global
   *  set and a link with no `from` on it. Nothing unvalidated is ever
   *  re-encoded into a href. */
  scopedFrom: string;
}) {
  const from = useSearchParams().get("from");

  // A pillar scope only counts while it has somewhere to go. Three of the
  // four pillars hold one essay today, so a reader inside one of those
  // scopes has no scoped neighbour in either direction — and honouring
  // the scope literally would end the essay on nothing at all, replacing
  // the one outbound link it used to have.
  //
  // Falling back to the whole corpus is the house pattern rather than a
  // second meaning for "scope": /films/[slug] does the same when its
  // `?from=` replay yields nothing usable. It is also nearly unreachable
  // by clicking, because a pillar page is only LINKED once it holds three
  // essays (see pillarLinkReady) — so an empty scope arrives by a typed or
  // stale URL, and a dead end is the worse answer there.
  const scopeHasSomewhereToGo = Boolean(scoped.newer || scoped.older);
  const inPillarScope = from === scopedFrom && scopeHasSomewhereToGo;

  return (
    <EssayNavCards
      neighbors={inPillarScope ? scoped : global}
      // Re-encode the origin onto each neighbour link so older → older
      // → older stays inside the pillar instead of silently widening to
      // the whole corpus after one hop (the same forwarding
      // /films/[slug]'s NeighborLink does). Only the validated value is
      // carried; arriving from the hub needs no param, since the global
      // set is what a bare essay URL already gets.
      fromParam={inPillarScope ? encodeURIComponent(scopedFrom) : undefined}
    />
  );
}

// ─── NeighborCard ────────────────────────────────────────────────
// One side of the pair. Card-shaped affordance — the whole tile is the
// link — matching the neighbour cards on /films/[slug] and
// /television/[showSlug] so the "what's next" affordance reads the
// same wherever a reader meets it.

function NeighborCard({
  item,
  direction,
  fromParam,
}: {
  item: EssayNavItem;
  direction: "newer" | "older";
  fromParam?: string;
}) {
  // The arrow points at where the card itself sits in the grid: newer
  // is the left column, older the right.
  const kicker = direction === "newer" ? "← Newer essay" : "Older essay →";
  const href = fromParam ? `${item.href}?from=${fromParam}` : item.href;

  return (
    <NextLink
      href={href}
      style={{
        textDecoration: "none",
        display: "block",
        padding: "var(--scale-400)",
        border: "1px solid var(--border-default)",
        borderRadius: "var(--border-radius-md)",
        outlineColor: "var(--border-focus)",
        color: "inherit",
      }}
      className="group transition-colors motion-reduce:transition-none hover:[border-color:var(--text-action)] focus-visible:outline-2 focus-visible:outline-offset-2"
    >
      <Stack gap="100">
        <Kicker>{kicker}</Kicker>
        {/* A <p>, not a heading. This nav sits after the essay's last
            section <h2>, with no parent <h2> for an <h3> to anchor
            under, so a reader navigating by heading would land on an
            orphan. The wrapping link carries the navigation semantics
            and the <nav aria-label> carries the landmark context. Same
            call as CaseStudyNav. */}
        <p
          style={{
            fontFamily: "var(--font-primary)",
            fontSize: "var(--p-lg-font-size)",
            lineHeight: "var(--p-lg-line-height)",
            color: "var(--text-heading)",
            margin: 0,
          }}
          className="transition-colors motion-reduce:transition-none group-hover:[color:var(--text-action)]"
        >
          {item.title}
        </p>
        <p
          style={{
            fontFamily: "var(--font-primary)",
            fontSize: "var(--p-sm-font-size)",
            lineHeight: "var(--p-sm-line-height)",
            color: "var(--text-caption)",
            margin: 0,
          }}
        >
          {item.description}
        </p>
        <p
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "var(--p-xs-font-size)",
            lineHeight: "var(--p-xs-line-height)",
            letterSpacing: "0.04em",
            color: "var(--text-caption)",
            margin: 0,
          }}
        >
          {item.dateLabel}
        </p>
      </Stack>
    </NextLink>
  );
}
