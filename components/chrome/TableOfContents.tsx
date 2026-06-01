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

import { type MouseEvent as ReactMouseEvent } from "react";
import { useScrollSpy } from "./useScrollSpy";
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
  /**
   * Controlled-mode active id. Pass when a parent renders multiple
   * TableOfContents (e.g. breakpoint-conditional duplicates) and
   * wants them to share a single scroll-spy listener — call
   * useScrollSpy(items) once at the parent and thread the result
   * through this prop. Omit for the common single-instance case;
   * the component falls back to its own useScrollSpy call.
   */
  activeId?: string;
}

export function TableOfContents({
  items,
  topOffset = 120,
  heading = "On this page",
  ariaLabel,
  activeId: activeIdProp,
}: TableOfContentsProps) {
  // Self-spy when uncontrolled (single-instance callers), defer to
  // the parent-supplied id when controlled (CaseStudyTocRail's
  // lg-vs-xl duplicate-render case). The `enabled` flag short-
  // circuits the hook's listener setup when controlled, so we don't
  // pay for two listeners on the same page.
  const isControlled = activeIdProp !== undefined;
  const selfActiveId = useScrollSpy(items, topOffset, !isControlled);
  const activeId = isControlled ? activeIdProp : selfActiveId;

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
