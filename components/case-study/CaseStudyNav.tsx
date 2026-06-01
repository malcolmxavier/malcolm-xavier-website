// ─────────────────────────────────────────────────────────────────
// CaseStudyNav — bottom-of-article navigation between adjacent
// case studies. Mirrors the NeighborLink pattern in /films/[slug]
// and /music/[playlistId]: newer LEFT, older RIGHT, with a
// placeholder for the missing direction so the grid layout stays
// balanced.
//
// Two correctness rules driving the design:
//
//   1. Bidirectional, not "next case study." Linking from the
//      newest study to the next-in-sort would point at an OLDER
//      study, which is "previous" in publication time. The
//      newer/older framing is honest about that.
//
//   2. Type-filtered. Work case studies (people-inc, muck-rack,
//      user-interviews) and project case studies (architecture-
//      under-contract, building-this-site, basecamp-coffee) serve
//      distinct audiences — recruiters evaluating PM experience
//      vs readers interested in Claude Code methodology. The
//      chronology only connects same-type studies; a recruiter
//      finishing muck-rack should land on user-interviews, not
//      basecamp-coffee.
//
// Sitewide across all 6 case studies (architecture-under-contract
// included per the 2026-05-31 redesign — the off-site curatorial
// CTAs on that study coexist with the same-cluster Nav for
// surface consistency).
// ─────────────────────────────────────────────────────────────────

import type { ResumeCaseStudy } from "@/app/resume/resume-data";
import {
  CASE_STUDIES,
  sortedCaseStudiesNewestFirst,
} from "@/app/resume/resume-data";
import { Link } from "@/components/primitives/Link";
import { TrackOnClick } from "@/components/analytics/TrackOnClick";
import { ANALYTICS_EVENTS } from "@/lib/analytics";
import { CASE_STUDY_WIDTH, CaseStudyKicker } from "./primitives";

interface CaseStudyNavProps {
  /** Slug of the current case study; used to find its newer/older
   *  same-type neighbors. Must match a `slug` in CASE_STUDIES. */
  currentSlug: string;
}

export function CaseStudyNav({ currentSlug }: CaseStudyNavProps) {
  const current = CASE_STUDIES.find((s) => s.slug === currentSlug);
  if (!current) return null;

  // Work studies carry an `employer` field; project studies don't.
  // The filter splits the catalog along that axis so navigation
  // stays within audience.
  const isWork = !!current.employer;
  const sameTypeStudies = CASE_STUDIES.filter(
    (s) => !!s.employer === isWork,
  );
  const sorted = sortedCaseStudiesNewestFirst(sameTypeStudies);
  const currentIndex = sorted.findIndex((s) => s.slug === currentSlug);

  // In a newest-first array, the item AT a lower index is newer.
  // newer = published more recently than current.
  // older = published earlier than current.
  const newer = currentIndex > 0 ? sorted[currentIndex - 1] : null;
  const older =
    currentIndex >= 0 && currentIndex < sorted.length - 1
      ? sorted[currentIndex + 1]
      : null;

  if (!newer && !older) return null;

  return (
    // Width and horizontal padding inherit from CASE_STUDY_WIDTH so
    // the neighbor cards share the article's reading column at every
    // breakpoint (560/880/1024 with matching px-7/px-10). Previously
    // this used a bespoke max-w-[920px] with px-4 md:px-0, which left
    // the cards flush to the viewport on tablets between 768px and
    // 920px — no padding to anchor against the edge. Inheriting from
    // CASE_STUDY_WIDTH eliminates the magic number and keeps the nav
    // visually anchored to the article above it.
    <nav
      aria-label="Adjacent case studies"
      className={`${CASE_STUDY_WIDTH} my-12 md:my-16 grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6`}
    >
      {newer ? (
        <NeighborLink
          study={newer}
          direction="newer"
          currentSlug={currentSlug}
        />
      ) : (
        // Placeholder keeps the older card pinned to the right
        // column at md+ so the "right = older" reading model is
        // preserved on boundary studies.
        <span aria-hidden="true" />
      )}
      {older ? (
        <NeighborLink
          study={older}
          direction="older"
          currentSlug={currentSlug}
        />
      ) : (
        <span aria-hidden="true" />
      )}
    </nav>
  );
}

// ─── NeighborLink ────────────────────────────────────────────────
// One side of the adjacent-case-study pair. Visual rhythm mirrors
// the NeighborLink components in /films/[slug] and
// /music/[playlistId] so the cross-surface "what's next?"
// affordance reads identically regardless of which cluster the
// visitor is browsing. Whole card is clickable via the wrapping
// Link primitive (quiet variant — no loud underline beneath the
// title, since the card surface IS the affordance).

function NeighborLink({
  study,
  direction,
  currentSlug,
}: {
  study: ResumeCaseStudy;
  direction: "newer" | "older";
  currentSlug: string;
}) {
  const kicker =
    direction === "newer"
      ? "← Newer case study"
      : "Older case study →";
  // Analytics surfaces match the existing case-study CTA naming
  // convention. The trailing -newer / -older distinguishes this
  // directional affordance from the close CTAs (-close) above it.
  const trackingSurface = `case-study-${currentSlug}-${direction}`;
  const trackingDestination = `case-study-${study.slug}`;

  return (
    <TrackOnClick
      event={ANALYTICS_EVENTS.CASE_STUDY_CTA_CLICK}
      eventData={{
        surface: trackingSurface,
        destination: trackingDestination,
      }}
    >
      <Link
        href={study.href}
        quiet
        className="case-glass block p-5 md:p-6 rounded-[22px] border border-[var(--border-default)] no-underline transition-colors motion-reduce:transition-none hover:border-[var(--border-interactive)] group"
      >
        <CaseStudyKicker as="p">{kicker}</CaseStudyKicker>
        {/* Rendered as <p>, not <h3>, because the CaseStudyNav lives at
            the bottom of the article — after the final Beat's <h2> —
            with no parent <h2> for an <h3> to anchor under. A screen
            reader navigating by heading would hit an orphan <h3>. The
            wrapping <Link> carries the navigation semantics; the title
            is the card's visible label, not a section heading. The
            <nav aria-label="Adjacent case studies"> on the outer wrapper
            still provides landmark context. */}
        <p className="m-0 mt-2 text-[22px] md:text-[26px] leading-[1.2] tracking-[-0.015em] text-[var(--text-heading)] group-hover:text-[var(--text-action)] transition-colors motion-reduce:transition-none">
          {study.title}
        </p>
        {/* Prefer the short `navPreview` (sized to fit two lines on
            a half-width card without truncation) over the longer
            `description` (sized for the /case-studies index and the
            /resume carousel). Falls back to description so a missing
            navPreview degrades gracefully rather than rendering
            nothing. */}
        <p className="m-0 mt-2 text-[14px] md:text-[15px] leading-[1.5] text-[var(--text-caption)]">
          {study.navPreview ?? study.description}
        </p>
      </Link>
    </TrackOnClick>
  );
}
