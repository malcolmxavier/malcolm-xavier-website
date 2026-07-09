// ─────────────────────────────────────────────────────────────────
// CaseStudyTocRail — dual-mode TOC chrome for case-study pages.
//
// Bundles the two positioning patterns case studies need:
//
//   • xl+ (≥1280px): rendered as a sticky rail in the left viewport
//     margin. Absolutely positioned inside the page's (relative)
//     wrapping div so that the sticky's bounding parent matches the
//     <article>'s vertical extent. As the user scrolls past the
//     article into the footer, the sticky TOC slides up out of view
//     alongside the article — it never visually overlaps the footer.
//
//   • lg-but-not-xl (1024–1279px): rendered inside the case-study
//     page's grid container as a sticky-top sidebar in the first
//     column. `position: sticky` inside a CSS grid column is
//     naturally bounded by the column's height, so this variant
//     clamps cleanly to the article's bottom without any special
//     handling.
//
//   • <lg (<1024px): not rendered. The article runs full width and
//     the reader uses scroll alone — no TOC chrome.
//
// Required parent shape: the wrapping div around <CaseStudyTocRail />
// and <article> MUST have `relative` so the xl+ rail's absolute
// positioning is anchored to the right element. The case-study
// page's existing wrapper has `lg:grid lg:grid-cols-[14rem_minmax(0,1fr)]
// lg:gap-16 xl:block` — add `relative` at the front:
//
//     <div className="relative lg:grid lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-16 xl:block">
//       <CaseStudyTocRail items={TOC_ITEMS} ariaLabel="Article sections" />
//       <article>...</article>
//     </div>
//
// Without `relative` on the parent, the xl+ rail will anchor to the
// nearest positioned ancestor (likely <main> or the viewport), which
// breaks the sticky's bounding behavior and lets the TOC overlap the
// footer again.
// ─────────────────────────────────────────────────────────────────

"use client";

import { CASE_STUDIES } from "@/app/resume/resume-data";
import { TableOfContents, type TocItem } from "@/components/chrome/TableOfContents";
import { useScrollSpy } from "@/components/chrome/useScrollSpy";
import { ShareBar } from "@/components/share/ShareBar";

interface CaseStudyTocRailProps {
  items: TocItem[];
  /** Forwarded to TableOfContents. Defaults to "Article sections". */
  ariaLabel?: string;
  /** Slug of the current case study. When set, a compact share
   *  affordance renders under the TOC inside the sticky rail — so a
   *  reader can share from any scroll position (this is a desktop-only
   *  surface; the rail isn't rendered below lg, where the page's
   *  under-hero fallback ShareBar covers mobile/tablet instead). */
  shareSlug?: string;
}

export function CaseStudyTocRail({
  items,
  ariaLabel = "Article sections",
  shareSlug,
}: CaseStudyTocRailProps) {
  // Single scroll-spy listener shared across both breakpoint-
  // conditional TOC variants. CSS `hidden` removes one variant from
  // the a11y tree but does NOT unmount it, so without this lift each
  // child TableOfContents would register its own rAF-throttled scroll
  // listener and race the other's activeId state at lg+ viewports.
  const activeId = useScrollSpy(items);

  // Resolve the case study to share from its slug (same registry the
  // rest of the case-study chrome reads). One share element, rendered
  // inside both breakpoint variants below (only one aside is visible at
  // a time, so only one is exposed to AT — same pattern as the TOC).
  const study = shareSlug
    ? CASE_STUDIES.find((s) => s.slug === shareSlug)
    : undefined;
  const share = study ? (
    // flex-none so a long TOC scroll region never squeezes the share bar
    // out — the TOC list shrinks and scrolls, the share stays put.
    <div className="mt-6 flex-none border-t border-[var(--border-default)] pt-5">
      <ShareBar
        path={study.href}
        title={study.title}
        emphasis="professional"
        surface="case-study"
        campaign={`case-study-${study.slug}`}
        variant="compact"
        label="Share"
        labelPlacement="block"
      />
    </div>
  ) : null;

  return (
    <>
      {/* xl+ rail. The outer <aside> is absolutely positioned within
          the page's (relative) wrapping div, spanning its full height
          (top-0) minus a bottom buffer (bottom-8 = 32px). The bottom
          buffer keeps the sticky child's clamp window 32px above the
          article's bottom edge, so the TOC's active-item left rail
          never visually kisses the footer divider. The clearance is
          a constant 32px regardless of TOC item count — works for any
          length case study (an 8-item TOC and a 14-item TOC both clamp
          with the same gap). pointer-events-none on the outer aside
          keeps the empty column from blocking clicks on the article
          below; pointer-events-auto on the sticky child restores
          clicks where the actual TOC content lives.

          No aria-label on the <aside> wrappers. The inner
          <TableOfContents> renders a <nav aria-label={ariaLabel}>
          that carries the landmark name. Previously the asides
          also passed aria-label as a defensive fallback against
          both asides being simultaneously exposed by a stylesheet
          override, but the cost was duplicate landmarks with
          identical labels showing up in JAWS/NVDA landmark lists
          ("Article sections (complementary)" + "Article sections
          (navigation)" back-to-back, which reads as confusing
          rather than disambiguating). The complementary role on
          <aside> is self-describing when it wraps a labelled
          <nav>; the label only needs to live on the nav itself. */}
      <aside
        className="hidden xl:block absolute top-0 bottom-8 left-0 w-[180px] 2xl:w-[220px] z-30 pointer-events-none"
      >
        {/* Bounded to the viewport (top-32 = 8rem offset, ~2rem bottom
            gap) and laid out as a flex column so a long TOC + the share
            bar can't overflow past the fold: the TOC list becomes the
            scroll region (min-h-0 lets it shrink below its content;
            overscroll-contain stops its scroll from chaining to the
            page) while the share bar stays pinned and reachable at the
            bottom. Short case studies never hit the cap, so they render
            exactly as before. */}
        <div className="sticky top-32 ml-4 2xl:ml-8 pointer-events-auto flex max-h-[calc(100vh-10rem)] flex-col">
          <div className="min-h-0 overflow-y-auto overscroll-contain">
            <TableOfContents items={items} ariaLabel={ariaLabel} activeId={activeId} />
          </div>
          {share}
        </div>
      </aside>

      {/* lg-but-not-xl in-grid sticky rail. position: sticky inside
          the parent grid column is naturally bounded by the column's
          height = the article's height. No special handling needed —
          this variant already clamped correctly before. */}
      <aside className="hidden lg:block xl:hidden">
        {/* Same viewport-bounded flex-column treatment as the xl rail
            (top-24 = 6rem offset here), so the TOC list scrolls and the
            share bar stays pinned rather than being pushed below the fold
            on a long TOC. */}
        <div className="sticky top-24 pl-4 flex max-h-[calc(100vh-8rem)] flex-col">
          <div className="min-h-0 overflow-y-auto overscroll-contain">
            <TableOfContents items={items} ariaLabel={ariaLabel} activeId={activeId} />
          </div>
          {share}
        </div>
      </aside>
    </>
  );
}
