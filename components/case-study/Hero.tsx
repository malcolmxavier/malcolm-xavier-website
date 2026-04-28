// ─────────────────────────────────────────────────────────────────
// CaseStudyHero — the article opener. Mono kicker + dateline row,
// editorial display H1, body H2, italic intro lede.
//
// Usage:
//
//     <CaseStudyHero
//       title="Claude x Growth PM"
//       subtitle="Basecamp Rewards: A Turnaround"
//       readMin={10}
//       updatedDate={formatLastUpdated()}
//     >
//       This page is an overview of two things at once. First and
//       foremost, this is documentation of …{' '}
//       <Link href="…">The quiz ↗</Link>{' '}
//       is the prototype that came out of it.
//     </CaseStudyHero>
//
// The intro paragraph is provided as `children` so case studies can
// embed inline links, emphasis, etc. without escaping anything.
//
// `kicker` defaults to "Case Study" — override for variants like
// "Postmortem", "Teardown", etc.
//
// Section id is "intro" by convention so the TOC's "↑ Top" entry
// can anchor to it. Override via `id` if a case study needs a
// different anchor.
// ─────────────────────────────────────────────────────────────────

import type { ReactNode } from "react";
import { CASE_STUDY_WIDTH, CaseStudyKicker } from "./primitives";

interface CaseStudyHeroProps {
  title: string;
  subtitle: string;
  /** Estimated reading time in minutes — rendered as "N min read · …". */
  readMin: number;
  /** Pre-formatted "updated" date string (e.g. "Apr 26, 2026"). Caller decides format. */
  updatedDate: string;
  /** Intro lede content. Italic serif body voice. */
  children: ReactNode;
  /** Defaults to "Case Study". */
  kicker?: string;
  /** Defaults to "intro" so the TOC's "↑ Top" entry can anchor to it. */
  id?: string;
}

export function CaseStudyHero({
  title,
  subtitle,
  readMin,
  updatedDate,
  children,
  kicker = "Case Study",
  id = "intro",
}: CaseStudyHeroProps) {
  return (
    <section
      id={id}
      className={`${CASE_STUDY_WIDTH} scroll-mt-28 pt-9 pb-6 md:pt-14 md:pb-8`}
    >
      <div className="flex items-baseline justify-between gap-4 mb-3">
        <CaseStudyKicker>{kicker}</CaseStudyKicker>
        <CaseStudyKicker tone="muted">
          {readMin} min read · Updated {updatedDate}
        </CaseStudyKicker>
      </div>
      <h1 className="m-0 mb-3 md:mb-4 font-medium text-[54px] md:text-[72px] lg:text-[84px] leading-none tracking-[-0.035em] text-[var(--text-heading)]">
        {title}
      </h1>
      <h2 className="m-0 mb-6 md:mb-8 font-medium text-[24px] md:text-[32px] lg:text-[36px] leading-[1.15] tracking-[-0.015em] text-[var(--text-caption)]">
        {subtitle}
      </h2>
      <p
        className="m-0 text-[19px] md:text-[21px] leading-[1.4] tracking-[-0.005em] text-[var(--text-caption)]"
        style={{
          fontFamily: "var(--font-primary), serif",
          fontStyle: "italic",
        }}
      >
        {children}
      </p>
    </section>
  );
}
