"use client";

// ─────────────────────────────────────────────────────────────────
// ProjectToc — the desktop sticky-rail navigation for a long,
// sectioned /projects piece, with scroll-spy that highlights the
// section currently under the reader and a "Back to top" link at the
// foot of the rail. Hidden below lg.
//
// The mobile companion (a collapsible "Contents" disclosure in the
// reading column) is NOT here — it's the sitewide TocDisclosure
// primitive in components/chrome/, which the /projects page renders
// directly. This file owns only the desktop rail.
//
// Links are plain in-page anchors, so navigation works with zero JS;
// the scroll-spy highlight is progressive enhancement layered on top.
// Sections already carry `scroll-mt` so the jump target clears the
// fixed header.
// ─────────────────────────────────────────────────────────────────

import { type MouseEvent as ReactMouseEvent, useEffect, useState } from "react";
import type { ProjectTocItem } from "@/lib/projects/types";
import { scrollToHash } from "@/components/chrome/scrollToHash";

/** Shared label styling for the "Contents" heading — matches the mono
 *  section labels used elsewhere on the page ("Notes", "Related"). */
const LABEL_CLASS = "m-0 text-[var(--text-caption)]";
const LABEL_STYLE = {
  fontFamily: "var(--font-mono)",
  fontSize: "var(--p-xs-font-size)",
  letterSpacing: "0.08em",
  textTransform: "uppercase" as const,
};

/** Desktop sticky rail with scroll-spy. Hidden below lg. */
export function ProjectToc({ items }: { items: ProjectTocItem[] }) {
  const [activeId, setActiveId] = useState<string>(items[0]?.id ?? "");

  useEffect(() => {
    // Scroll-spy: highlight the section nearest the top of the
    // viewport. The rootMargin pulls the "active" band down from the
    // fixed header (-96px top) and up from the bottom (-66%) so a
    // section lights up as its heading enters the upper third, not
    // when it merely peeks in from the bottom edge.
    const sections = items
      .map((it) => document.getElementById(it.id))
      .filter((el): el is HTMLElement => el !== null);
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Of the sections intersecting the active band, pick the
        // topmost — that's the one the reader is currently in.
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort(
            (a, b) => a.boundingClientRect.top - b.boundingClientRect.top,
          );
        if (visible[0]) setActiveId(visible[0].target.id);
      },
      { rootMargin: "-96px 0px -66% 0px", threshold: 0 },
    );
    sections.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [items]);

  // "Back to top" — smooth-scroll to the page top (reduced-motion aware)
  // and clear the hash, via the shared helper the chrome TOC family uses.
  function handleTop(e: ReactMouseEvent<HTMLAnchorElement>): void {
    if (scrollToHash("#top")) e.preventDefault();
  }

  return (
    <nav
      aria-label="Table of contents"
      className="hidden lg:block lg:sticky lg:top-28 lg:self-start"
    >
      <p className={`${LABEL_CLASS} mb-3`} style={LABEL_STYLE}>
        Contents
      </p>
      <ol className="m-0 flex list-none flex-col gap-2 p-0">
        {items.map((item) => {
          const active = item.id === activeId;
          return (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                aria-current={active ? "location" : undefined}
                // Active section reads in the brand green with a left
                // rule (the same --cs-accent-strong the case-study TOC
                // rail and reading-progress bar use); inactive entries
                // sit quiet in the caption color and warm up toward
                // green on hover. The shift is suppressed under
                // prefers-reduced-motion.
                className="block border-l-2 pl-3 text-[0.9rem] leading-snug transition-colors motion-reduce:transition-none hover:[color:var(--cs-accent-strong)]"
                style={{
                  borderColor: active
                    ? "var(--cs-accent-strong)"
                    : "transparent",
                  color: active
                    ? "var(--cs-accent-strong)"
                    : "var(--text-caption)",
                }}
              >
                {item.label}
              </a>
            </li>
          );
        })}
      </ol>
      {/* Back to top — a quiet caption-weight action set off by a top
          rule, so it reads as chrome distinct from the section links.
          The ↑ is decorative (aria-hidden); the visible text carries
          the accessible name. */}
      <a
        href="#top"
        onClick={handleTop}
        className="mt-4 flex items-center gap-1.5 border-t pt-3 text-[0.8rem] transition-colors motion-reduce:transition-none hover:[color:var(--cs-accent-strong)]"
        style={{
          borderColor: "var(--border-default)",
          color: "var(--text-caption)",
        }}
      >
        <span aria-hidden="true">↑</span> Back to top
      </a>
    </nav>
  );
}
