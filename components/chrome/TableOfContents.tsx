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
      let current = ids[0] ?? "";
      // Walk top-to-bottom; the LAST id whose top has scrolled past
      // the offset is the section the user is currently reading.
      for (const id of ids) {
        const el = document.getElementById(id);
        if (!el) continue;
        if (el.getBoundingClientRect().top - topOffset <= 0) current = id;
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
    el.scrollIntoView({ behavior: "smooth", block: "start" });
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
