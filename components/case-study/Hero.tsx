// ─────────────────────────────────────────────────────────────────
// CaseStudyHero — the article opener. Mono kicker + dateline row,
// editorial display H1, subtitle paragraph, italic intro lede.
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
    // `relative` + `isolation: isolate` create a stacking context
    // bounded to this section so the .cs-hero-tint child below
    // (z-index: -1) sits behind the hero's content but doesn't punch
    // through to the page background. `cs-hero-section` is the hook
    // for the [data-cs-accent] background-tint rule in
    // app/components.css — non-themed case studies don't render the
    // tint at all (CSS gates it on the data attribute).
    <section
      id={id}
      className={`cs-hero-section relative ${CASE_STUDY_WIDTH} scroll-mt-28 pt-9 pb-6 md:pt-14 md:pb-8`}
      style={{ isolation: "isolate" }}
    >
      {/* Decorative accent-tinted background. CSS gates visibility on
          [data-cs-accent] — visually a no-op on non-work case studies
          (the freelance/personal trio), and a faint employer-color
          atmosphere wash on the work studies. aria-hidden because
          there's no semantic content here, only decoration. */}
      <div className="cs-hero-tint" aria-hidden="true" />
      <div className="flex items-baseline justify-between gap-4 mb-3">
        {/* cs-hero-kicker hooks into the [data-cs-accent] rule that
            tints the "CASE STUDY" eyebrow to the employer brand
            color. Only the left/lede kicker carries the class —
            the right metadata kicker (read time + updated date) stays
            in --text-caption so the brand color doesn't overload the
            row with two heavy hits. */}
        <CaseStudyKicker className="cs-hero-kicker">{kicker}</CaseStudyKicker>
        <CaseStudyKicker>
          {readMin} min read ·{" "}
          {/* white-space: nowrap covers the whole "Updated [date]"
              phrase so it wraps as a single unit — no orphaned year
              after the comma, and no orphaned date alone with
              "Updated" stranded on the previous line. The natural
              break point becomes the "·" boundary between read time
              and the update phrase, which reads as one editorial
              chunk anyway. Same orphan-prevention principle we apply
              to hyphenated terms (U+2011) and trailing arrows (NBSP). */}
          <span style={{ whiteSpace: "nowrap" }}>
            Updated{" "}{updatedDate}
          </span>
        </CaseStudyKicker>
      </div>
      {/* font-medium dropped — Instrument Serif loads weight 400
          only; the browser-synthesized 500 rendered inconsistently
          across engines at display sizes. Closes
          m-instrument-serif-medium from the 2026-04-29 /full-review. */}
      <h1 className="m-0 mb-3 md:mb-4 text-[54px] md:text-[72px] lg:text-[84px] leading-none tracking-[-0.035em] text-[var(--text-heading)]">
        {title}
      </h1>
      {/* The subtitle is editorial chrome — visually a subheading, but
          semantically a tagline beneath the title, NOT a section
          heading. Rendering it as a <p> keeps the document outline
          clean: one <h1> per page (the title), and the case-study
          beats below own all the <h2>s. The visual treatment is
          unchanged. */}
      <p className="m-0 mb-6 md:mb-8 text-[24px] md:text-[32px] lg:text-[36px] leading-[1.15] tracking-[-0.015em] text-[var(--text-caption)]">
        {subtitle}
      </p>
      {/* div, not p — case studies (e.g. muck-rack) embed block-level
          elements like the resume-backlink kicker inside this lede.
          A <p> wrapper would split the accessibility tree at any
          block-level child. div preserves the visual treatment
          (italic Instrument Serif at body size) without imposing
          paragraph semantics on consumers. */}
      <div
        className="italic-kern m-0 text-[19px] md:text-[21px] leading-[1.4] text-[var(--text-caption)]"
        style={{
          fontFamily: "var(--font-primary)",
          fontStyle: "italic",
        }}
      >
        {children}
      </div>
    </section>
  );
}
