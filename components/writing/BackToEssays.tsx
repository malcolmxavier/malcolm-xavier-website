// ─────────────────────────────────────────────────────────────────
// BackToEssays — the "← All essays" link at the top of an essay.
//
// It points at the listing the reader actually arrived from, carried in
// `?from=` by the card they clicked: the hub, or this essay's pillar
// page. No `from` (a search result, a shared link, a bookmark) → the
// hub, which is the honest default for a visitor who was never on a
// listing.
//
// NOT router.back(). Neighbour browsing at the foot of the page means a
// reader can be three essays deep, where "back" walks to the previous
// essay rather than out to the listing — the same reason
// components/feeds/BackToCluster abandoned it. This is a plain link
// rather than BackToCluster itself because that component belongs to the
// feeds clusters: it pushes through the router, strips a `?ref=`
// back-nav marker, and appends a `#grid` anchor that no /essays listing
// has. An essay needs none of that, and a real <a href> works under a
// middle-click and without JavaScript.
//
// WHY IT IS A CLIENT COMPONENT: reading `?from=` on the page itself
// would mean reading `searchParams` there, which opts
// /essays/[pillar]/[slug] out of static prerendering — a deliberate
// performance/SEO position on this site. The page passes in the two
// facts this needs and the param is read on the client.
// ─────────────────────────────────────────────────────────────────

"use client";

import NextLink from "next/link";
import { useSearchParams } from "next/navigation";

/** The hub — where an essay reached from anywhere but a pillar page
 *  sends the reader back to. */
const HUB_HREF = "/essays";
const HUB_LABEL = "← All essays";

export function BackToEssays({
  pillarHref,
  pillarLabel,
}: {
  /** This essay's pillar listing, e.g. "/essays/craft".
   *
   *  It doubles as the guard on `from`. An essay's card appears on
   *  exactly two listings — the hub and its own pillar page — so this is
   *  the only `/essays/…` value a legitimate `from` can hold, and an
   *  exact match validates it. Everything else falls back to the hub:
   *  a relative value, an off-site URL, another pillar, a stale param.
   *  The rule BackToCluster states is the same one — only an
   *  absolute path under this cluster may become a destination — and an
   *  exact match is the strictest form of it. Never trust `from` to name
   *  a page; a query param is the visitor's to write. */
  pillarHref: string;
  /** The pillar's display label, e.g. "Craft". Passed in rather than
   *  looked up: the lookup table lives in lib/writing/essays.ts, which
   *  imports all six essay bodies and does not belong in a client
   *  bundle. */
  pillarLabel: string;
}) {
  const from = useSearchParams().get("from");
  const fromPillar = from === pillarHref;
  return (
    <BackLink
      href={fromPillar ? pillarHref : HUB_HREF}
      label={fromPillar ? `← All ${pillarLabel} essays` : HUB_LABEL}
    />
  );
}

/** The default state, rendered with no hooks.
 *
 *  useSearchParams on a prerendered route pushes its subtree up to the
 *  nearest Suspense boundary into client-only rendering, so the page
 *  wraps BackToEssays in one — and this is its fallback, which puts a
 *  real, crawlable link in the built HTML instead of the empty
 *  `fallback={null}` the feeds clusters use for their back-links. */
export function BackToEssaysFallback() {
  return <BackLink href={HUB_HREF} label={HUB_LABEL} />;
}

// ─── BackLink ────────────────────────────────────────────────────
// Presentation only. Styling matches BackToCluster so the back
// affordance reads identically on an essay, a film, and a show.

function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <NextLink
      href={href}
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: "var(--p-xs-font-size)",
        lineHeight: "var(--p-xs-line-height)",
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: "var(--text-action)",
        textDecoration: "none",
        outlineColor: "var(--border-focus)",
        // Pad the target to clear the 24×24 floor of SC 2.5.8 without
        // shifting the text baseline (12px font / 18px line-height +
        // 3px top and bottom = 24px). inline-block keeps the focus ring
        // hugging the text.
        paddingBlock: "3px",
        display: "inline-block",
      }}
      className="rounded-sm hover:underline focus-visible:outline-2 focus-visible:outline-offset-2"
    >
      {label}
    </NextLink>
  );
}
