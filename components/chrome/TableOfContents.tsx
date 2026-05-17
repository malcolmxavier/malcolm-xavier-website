// ─────────────────────────────────────────────────────────────────
// TableOfContents — sticky in-page nav with scroll-spy.
//
// Used on long-read surfaces (the recruiter resume and case-study
// pages) so visitors always know where they are and can jump
// between sections without losing their place.
//
// Behavior:
//   - Renders an aria-labelled <nav> with a heading + ordered list
//     of anchor links. Anchor tags so URLs are copy-pasteable, the
//     hash updates on click, and keyboard users get native focus.
//   - Tracks scroll position; the section whose heading is closest
//     to (but not below) the topOffset is marked active. The active
//     item gets a green left-border + green text + medium weight,
//     so it reads against the dim/muted inactive states.
//   - Click intercepts scroll-into-view with `behavior: "smooth"`
//     and respects each section's `scroll-margin-top` so jumps
//     land below the sticky Nav, not behind it.
//
// Positioning (sticky vs fixed, hidden-below-x-breakpoint, etc.) is
// the consumer's responsibility — they wrap this component in
// whatever container fits their layout. Keeps the component
// portable.
// ─────────────────────────────────────────────────────────────────

"use client";

import { useEffect, useState, type MouseEvent as ReactMouseEvent } from "react";
import "./TableOfContents.css";

export type TocItem = {
  /** Hash anchor href, e.g. "#work-experience" or "#top". */
  href: string;
  /** Display label, e.g. "Work experience" or "↑ Top". */
  label: string;
  /** Optional eyebrow / number prefix, e.g. "01". Rendered in mono. */
  prefix?: string;
  /**
   * Optional aria-label override for the rendered <a>. Use when the
   * visible label contains a glyph or symbol that screen readers will
   * announce literally (e.g. "↑ Top" announces as "upwards arrow Top"
   * in punctuation-verbose modes). If omitted, "↑ Top" auto-falls-back
   * to "Back to top"; other glyph labels can set this explicitly.
   */
  ariaLabel?: string;
};

interface TableOfContentsProps {
  items: TocItem[];
  /** Top offset (px) for scroll-spy. Defaults to 120, ≈ sticky Nav height. */
  topOffset?: number;
  /** Heading text above the list. Defaults to "On this page". */
  heading?: string;
  /** aria-label on the inner <nav>. Falls back to heading. */
  ariaLabel?: string;
}

export function TableOfContents({
  items,
  topOffset = 120,
  heading = "On this page",
  ariaLabel,
}: TableOfContentsProps) {
  const [activeId, setActiveId] = useState<string>("");

  useEffect(() => {
    // Strip the "#" off each href so we can match against DOM ids.
    const ids = items.map((i) => i.href.replace(/^#/, "")).filter(Boolean);
    let rafId: number | null = null;

    function update() {
      rafId = null;

      // Scroll-progress reading-point rule.
      //
      // Earlier rules ("last heading top to cross topOffset," then
      // "section body straddles topOffset") both anchored the active
      // section to a fixed viewport y-line at `topOffset`. That
      // anchor breaks on tall viewports paired with shorter
      // documents — once the document is too short for max-scroll
      // to bring later sections' tops up to the trigger line, those
      // sections can never satisfy the rule and stay bypassed even
      // while the user is clearly reading them. Concrete failure
      // mode on the resume at iPad Pro 12.9" portrait (~1366px
      // viewport, ~3000px doc): Case Studies sits ~2500px into the
      // doc, but max scrollY is ~1634px, so Case Studies' top can
      // only reach ~viewport_y 866 — never the 120px trigger.
      // Education stays active until atBottom forces "Let's talk,"
      // skipping Case Studies entirely.
      //
      // The fix decouples the active-state rule from "where the
      // section is on screen" and ties it instead to "how far the
      // user has scrolled through the document." A reading point
      // (in document coordinates) interpolates linearly from
      // topOffset at scrollProgress=0 to docHeight at
      // scrollProgress=1. The active section is whichever one's
      // document-position range contains the reading point.
      //
      // Side benefit: every section now gets a window of being
      // active proportional to its size in the document, regardless
      // of viewport height. Long docs (case studies on desktop)
      // and short docs (resume on tablet) both behave consistently.
      // Each section's progress range = (its size) / (doc minus
      // topOffset). On the resume with five sections, each gets
      // ~20% of the scroll progress, with proportional adjustments
      // for size differences.
      const docHeight = document.documentElement.scrollHeight;
      const viewportHeight = window.innerHeight;
      const scrollY = window.scrollY;
      const maxScroll = Math.max(0, docHeight - viewportHeight);
      // Clamp progress to [0,1] — Safari's elastic overscroll can
      // push scrollY above maxScroll briefly during inertial bounce.
      const scrollProgress =
        maxScroll > 0
          ? Math.min(1, Math.max(0, scrollY / maxScroll))
          : 0;
      const readingPoint =
        topOffset + scrollProgress * (docHeight - topOffset);

      // Resolve each section's top in DOCUMENT coordinates (rect.top
      // is viewport-relative; add scrollY to get document-relative).
      // We need document coords because readingPoint is also in
      // document coords.
      const tops: { id: string; top: number }[] = [];
      for (const id of ids) {
        const el = document.getElementById(id);
        if (!el) continue;
        tops.push({ id, top: el.getBoundingClientRect().top + scrollY });
      }

      // Walk the sections in document order; find the one whose
      // [start, nextStart) range contains the reading point. The
      // last section's range ends at Infinity so any reading point
      // past its start matches it (handles the boundary case of
      // readingPoint === docHeight at scrollProgress=1).
      let current = tops[0]?.id ?? "";
      for (let i = 0; i < tops.length; i++) {
        const start = tops[i].top;
        const isLast = i === tops.length - 1;
        const end = isLast ? Infinity : tops[i + 1].top;
        if (readingPoint >= start && readingPoint < end) {
          current = tops[i].id;
          break;
        }
      }
      setActiveId(current);
    }

    function onScroll() {
      if (rafId === null) rafId = requestAnimationFrame(update);
    }

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [items, topOffset]);

  function handleClick(
    e: ReactMouseEvent<HTMLAnchorElement>,
    href: string,
  ): void {
    const id = href.replace(/^#/, "");
    const el = document.getElementById(id);
    if (!el) return;
    e.preventDefault();
    // Honor prefers-reduced-motion. The CSS reduced-motion media
    // query doesn't apply to scrollIntoView (it's a JS API), so we
    // check matchMedia explicitly. Closes m-scroll-into-view-prm
    // from the 2026-04-29 /full-review.
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    el.scrollIntoView({
      behavior: reduceMotion ? "instant" : "smooth",
      block: "start",
    });
    // Keep the URL in sync without triggering another browser-managed
    // jump (which would override our smooth scroll above).
    if (typeof window !== "undefined" && window.history?.replaceState) {
      window.history.replaceState(null, "", href);
    }
  }

  return (
    <nav aria-label={ariaLabel ?? heading} className="toc-root">
      <p className="toc-heading">{heading}</p>
      <ol className="toc-list">
        {items.map((item) => {
          const id = item.href.replace(/^#/, "");
          const isActive = id === activeId;
          return (
            <li key={item.href}>
              <a
                href={item.href}
                onClick={(e) => handleClick(e, item.href)}
                className="toc-item"
                data-active={isActive ? "true" : undefined}
                aria-current={isActive ? "location" : undefined}
                aria-label={
                  item.ariaLabel ??
                  (item.label.startsWith("↑") ? "Back to top" : undefined)
                }
              >
                {item.prefix ? (
                  <span className="toc-prefix">{item.prefix}</span>
                ) : null}
                <span className="toc-label">{item.label}</span>
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
