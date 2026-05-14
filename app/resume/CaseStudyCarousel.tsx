// ─────────────────────────────────────────────────────────────────
// CaseStudyCarousel — horizontal case-study strip on /resume.
//
// Renders the three most recent case studies (sorted newest-first
// by publishedAt) as a swipe-and-scroll carousel, plus an overflow
// CTA card when the catalog grows past three. Per-breakpoint
// `grid-auto-columns` is sized so the next card always peeks past
// the right edge — the carousel reads as scrollable at rest.
//
// Why a client component: the arrow controls track scroll state
// (canScrollLeft / canScrollRight) and call `scrollBy` on the
// scroll container, both of which need a DOM ref and React state.
// The card sub-components below are pure presentational and could
// live anywhere, but keeping them in the same module keeps the
// carousel surface self-contained.
//
// Native horizontal scrollbar is hidden via the `.no-scrollbar`
// class (see app/components.css). The arrow buttons are the
// primary visible scroll affordance; touch swipe and the visible
// peek of the next card are the secondary ones.
// ─────────────────────────────────────────────────────────────────

"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { Card } from "@/components/primitives/Card";
import { Link } from "@/components/primitives/Link";
import { Body } from "@/components/typography/Body";
import { Headline } from "@/components/typography/Headline";
import { Kicker } from "@/components/typography/Kicker";
import { Stack } from "@/components/layout/Stack";

import {
  sortedCaseStudiesNewestFirst,
  type ResumeCaseStudy,
} from "./resume-data";

// ─── Static carousel data ────────────────────────────────────────
//
// The carousel surfaces personal / site case studies only. Work
// case studies (those with an `employer` set) live in the relevant
// role's footer link on /resume (via `relatedCaseStudies`) and on
// the /case-studies index; pulling them into the carousel would
// double-surface them and dilute the "selected projects" framing.
// See app/resume/SURFACES.md → Case studies.
//
// CASE_STUDIES is a static import — sort + filter + slice run once
// at module load. Computing these inside the component re-allocates
// them on every state update (canScrollLeft / canScrollRight fire
// on every scroll), which has no functional cost over ~5 items but
// adds noise to the React Profiler and obscures intent. Module-
// scope constants make it clear the data never varies.
const SORTED_STUDIES = sortedCaseStudiesNewestFirst().filter(
  (s) => !s.employer,
);
const VISIBLE_STUDIES = SORTED_STUDIES.slice(0, 3);
const OLDER_COUNT = Math.max(0, SORTED_STUDIES.length - 3);

// ─── Public component ────────────────────────────────────────────

/**
 * Top-level carousel. Owns the section's <Stack> rhythm so the
 * page can drop it in directly without a wrapping kicker row.
 *
 * `kickerLabel` is the section heading text (e.g. "03 · Case
 * studies"). Rendered as the section's <h2>; the carousel arrows
 * sit on the same baseline, right-aligned.
 */
export function CaseStudyCarousel({ kickerLabel }: { kickerLabel: string }) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  // Per-breakpoint slot widths. The 2.25 divisor at sm+ encodes
  // "two full cards plus a clean ~25% tease of the third"; mobile
  // uses `100% - 3rem` so a single card occupies most of the
  // viewport with a clear peek of the next card on the right.
  const slotWidth =
    "auto-cols-[calc(100%-3rem)] " +
    "sm:auto-cols-[calc((100%-2rem)/2.25)] " +
    "lg:auto-cols-[calc((100%-3rem)/2.25)]";

  // Update arrow enabled state from current scroll position. Run
  // on mount + scroll + resize so the buttons stay in sync with
  // the actual overflow (a wider viewport could fit everything,
  // disabling both arrows; a layout reflow could re-introduce
  // overflow). The `1px` slack accounts for sub-pixel scroll
  // positions where scrollLeft + clientWidth comes within rounding
  // distance of scrollWidth but is reported as not-quite-equal.
  const updateScrollState = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const maxScrollLeft = el.scrollWidth - el.clientWidth;
    setCanScrollLeft(el.scrollLeft > 1);
    setCanScrollRight(el.scrollLeft < maxScrollLeft - 1);
  }, []);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    updateScrollState();
    el.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", updateScrollState);
    return () => {
      el.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
    };
  }, [updateScrollState]);

  // Scroll by exactly one card-plus-gap. Reads card width and
  // column gap from the DOM at click time so per-breakpoint slot
  // widths always work, no hardcoded number per breakpoint. The
  // browser honors `scroll-snap-type: x mandatory` on the
  // container so the destination snaps to the next card boundary
  // even if the computed delta is slightly off.
  //
  // Reduced-motion handling: most evergreen browsers downgrade
  // `behavior: "smooth"` to instant under prefers-reduced-motion
  // automatically, but we don't rely on that — we check the media
  // query explicitly and pass "auto" so the scroll lands instantly
  // for users who've opted out of animation.
  const scrollByCard = useCallback((direction: "left" | "right") => {
    const el = scrollerRef.current;
    if (!el) return;
    const firstSlot = el.firstElementChild as HTMLElement | null;
    if (!firstSlot) return;
    const slotWidthPx = firstSlot.getBoundingClientRect().width;
    const columnGapPx = parseFloat(getComputedStyle(el).columnGap) || 0;
    const delta = (slotWidthPx + columnGapPx) * (direction === "right" ? 1 : -1);
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({
      left: delta,
      behavior: prefersReducedMotion ? "auto" : "smooth",
    });
  }, []);

  return (
    <Stack gap="600">
      <header className="flex items-end justify-between gap-4">
        <Kicker as="h2">{kickerLabel}</Kicker>
        <CarouselControls
          canScrollLeft={canScrollLeft}
          canScrollRight={canScrollRight}
          onScrollLeft={() => scrollByCard("left")}
          onScrollRight={() => scrollByCard("right")}
        />
      </header>

      <div
        ref={scrollerRef}
        className={
          "no-scrollbar grid grid-flow-col gap-4 lg:gap-6 overflow-x-auto " +
          // snap-mandatory keeps swipe + arrow scrolls landing on
          // a card boundary regardless of how precisely the click
          // delta matches a slot width.
          "snap-x snap-mandatory " +
          // pb-2 leaves room below cards so a focus-visible ring
          // on the bottom edge of a card isn't clipped by the
          // scroll container. Without the visible scrollbar, the
          // padding is pure focus-ring breathing room.
          "pb-2 " +
          slotWidth
        }
        style={{
          // Keyboard users tabbing between cards: the browser
          // brings the focused card into view; this padding keeps
          // its focus ring breathing room from the container edge.
          scrollPaddingLeft: "0.25rem",
        }}
      >
        {VISIBLE_STUDIES.map((study) => (
          <div key={study.slug} className="snap-start">
            <CaseStudyCard study={study} />
          </div>
        ))}
        {OLDER_COUNT > 0 && (
          <div className="snap-start">
            <CaseStudyOverflowCard olderCount={OLDER_COUNT} />
          </div>
        )}
      </div>
    </Stack>
  );
}

// ─── Arrow controls ──────────────────────────────────────────────

/**
 * Left / right arrow buttons. Mono-uppercase glyphs in
 * `--text-action`, mirroring the Pagination Prev/Next pattern so
 * carousel and pagination read as the same control vocabulary.
 *
 * Each button always renders (never conditionally hidden) so the
 * controls don't shift around when scroll state changes. Disabled
 * state drops opacity and removes click handlers; aria-disabled
 * keeps screen readers in sync.
 */
function CarouselControls({
  canScrollLeft,
  canScrollRight,
  onScrollLeft,
  onScrollRight,
}: {
  canScrollLeft: boolean;
  canScrollRight: boolean;
  onScrollLeft: () => void;
  onScrollRight: () => void;
}) {
  return (
    <div className="flex items-center gap-1">
      <ArrowButton
        direction="left"
        disabled={!canScrollLeft}
        onClick={onScrollLeft}
      />
      <ArrowButton
        direction="right"
        disabled={!canScrollRight}
        onClick={onScrollRight}
      />
    </div>
  );
}

function ArrowButton({
  direction,
  disabled,
  onClick,
}: {
  direction: "left" | "right";
  disabled: boolean;
  onClick: () => void;
}) {
  const glyph = direction === "left" ? "←" : "→"; // ← / →
  const ariaLabel =
    direction === "left"
      ? "Scroll case studies left"
      : "Scroll case studies right";
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      // aria-disabled (not the native `disabled` attribute) keeps the
      // button focusable so keyboard users at the start/end of the
      // carousel still encounter it on Tab and hear the "dimmed" state
      // announced. Native `disabled` removes the element from the tab
      // order entirely, making the visual dimmed treatment invisible
      // to assistive tech. The onClick guard above stays — clicks on
      // a focused aria-disabled button still fire, so we no-op them
      // here rather than letting the carousel scroll past its bounds.
      aria-disabled={disabled}
      aria-label={ariaLabel}
      className="inline-flex items-center justify-center min-w-11 min-h-11 transition-opacity focus-visible:outline-2 focus-visible:outline-offset-4"
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: "var(--p-xs-font-size)",
        lineHeight: "var(--p-xs-line-height)",
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        // --text-action carries the dark/sub-brand cascade so the
        // glyph stays AA-contrast in every theme; bypassing to a
        // raw --primary-* token would fail in dark+sub-brand
        // combinations. Same pattern Pagination uses.
        color: disabled ? "var(--text-disabled)" : "var(--text-action)",
        background: "none",
        border: "none",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.4 : 1,
        // outlineColor lives in the inline style (matching Pagination
        // + Link + Button primitives) rather than as a Tailwind
        // `focus-visible:outline-[var(--border-focus)]` class.
        // Tailwind v4's arbitrary-value handling for CSS function
        // values (var(...)) can fall back to generating the `outline`
        // shorthand instead of `outline-color`, which sets outline-
        // width to a token reference and produces an invisible ring.
        // The inline-style form sidesteps that ambiguity.
        outlineColor: "var(--border-focus)",
      }}
    >
      <span aria-hidden="true">{glyph}</span>
    </button>
  );
}

// ─── Card sub-components ─────────────────────────────────────────

/**
 * Case-study card — links to the curated write-up on malxavi.com,
 * and (when the underlying project still has a live demo) carries
 * a secondary link to that live artifact too. `h-full` lets
 * adjacent cards stretch to the tallest sibling so the carousel
 * row reads as one shelf rather than a ragged baseline.
 */
function CaseStudyCard({ study }: { study: ResumeCaseStudy }) {
  return (
    <Card accent={study.accent} className="h-full">
      <Stack gap="300">
        <Kicker>Case study</Kicker>
        <Headline
          level={3}
          style={{
            fontSize: "var(--h5-font-size)",
            lineHeight: "var(--h5-line-height)",
          }}
        >
          {study.title}
        </Headline>
        <Body size="md">{study.description}</Body>
        <Link href={study.href}>Read the case study →</Link>
        {study.liveHref && (
          <Link href={study.liveHref} quiet>
            Visit the live project ↗
          </Link>
        )}
      </Stack>
    </Card>
  );
}

/**
 * Overflow card — appears at the end of the carousel only when
 * more than three studies exist. Hands older studies off to the
 * /case-studies index so the resume strip never grows past four
 * total slots.
 */
function CaseStudyOverflowCard({ olderCount }: { olderCount: number }) {
  const label =
    olderCount === 1 ? "1 more case study" : `${olderCount} more case studies`;
  return (
    <Card className="h-full">
      <Stack gap="300">
        <Kicker>More work</Kicker>
        <Headline
          level={3}
          style={{
            fontSize: "var(--h5-font-size)",
            lineHeight: "var(--h5-line-height)",
          }}
        >
          {label}
        </Headline>
        <Body size="md">
          Older studies live on the case studies index. Same shape, longer
          archive.
        </Body>
        <Link href="/case-studies">Visit case studies →</Link>
      </Stack>
    </Card>
  );
}
