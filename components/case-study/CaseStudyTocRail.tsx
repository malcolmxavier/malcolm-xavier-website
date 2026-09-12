// ─────────────────────────────────────────────────────────────────
// CaseStudyTocRail — the TOC rail for case-study pages.
//
//   • lg+ (≥1024px): a sticky sidebar in the first column of the
//     page's grid. `position: sticky` inside a CSS grid column is
//     naturally bounded by the column's height, so it clamps to the
//     article's bottom without any special handling and never
//     overlaps the footer.
//
//   • <lg (<1024px): not rendered. The article runs full width and
//     the reader uses the collapsible Contents disclosure the page
//     renders inside the column instead.
//
// There used to be a second variant for xl+ that hung the rail in
// the left viewport margin, absolutely positioned inside the page's
// `relative` wrapper. It existed because the article was a narrow
// centred column with a wide empty margin beside it. Now that a case
// study sits in the site's content well like every other page there
// is no margin to hang anything in — at a 1280px viewport the well
// *is* the viewport — so the rail lives in the column at every size
// that shows it, and the page needs no positioning context.
//
// Required parent shape: a grid whose first column is the rail.
//
//     <Container className="lg:grid lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-16">
//       <CaseStudyTocRail items={TOC_ITEMS} ariaLabel="Article sections" />
//       <article>...</article>
//     </Container>
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
  // Scroll-spy for the active item. Lifted here rather than left
  // inside TableOfContents so the rail owns one rAF-throttled scroll
  // listener no matter how the page renders it.
  const activeId = useScrollSpy(items);

  // Resolve the case study to share from its slug (same registry the
  // rest of the case-study chrome reads).
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
    // No aria-label on the <aside>. The inner <TableOfContents>
    // renders a <nav aria-label={ariaLabel}> that carries the landmark
    // name, and labelling both produced duplicate landmarks with
    // identical names in the JAWS/NVDA landmark list ("Article
    // sections (complementary)" followed by "Article sections
    // (navigation)"), which reads as confusing rather than
    // disambiguating. The complementary role on <aside> is
    // self-describing when it wraps a labelled <nav>.
    <aside className="hidden lg:block">
      {/* Bounded to the viewport (top-24 = 6rem offset, ~2rem bottom
          gap) and laid out as a flex column so a long TOC plus the
          share bar can't overflow past the fold: the TOC list becomes
          the scroll region (min-h-0 lets it shrink below its content;
          overscroll-contain stops its scroll from chaining to the
          page) while the share bar stays pinned and reachable at the
          bottom. Short case studies never hit the cap. */}
      <div className="sticky top-24 flex max-h-[calc(100vh-8rem)] flex-col">
        <div className="min-h-0 overflow-y-auto overscroll-contain">
          <TableOfContents items={items} ariaLabel={ariaLabel} activeId={activeId} />
        </div>
        {share}
      </div>
    </aside>
  );
}
