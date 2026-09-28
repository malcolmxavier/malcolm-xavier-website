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
//
// The highlight comes from the sitewide useScrollSpy hook. This file
// used to run its own IntersectionObserver with a
// `rootMargin: "-96px 0px -66% 0px"` active band, and that band has a
// structural hole: a final entry whose section is shorter than the dead
// zone at the foot of the viewport can NEVER activate, because the page
// runs out of scroll before the section reaches the band. Adding the
// downloads box to the contents on 2026-09-27 hit it — a short block at
// the very end of a long paper, so every sibling lit up and it never
// did. useScrollSpy's reading-point rule was written for exactly this
// class of bug (see its header) and maps scroll progress onto the
// document, so the last entry is active at the bottom of the page by
// construction. One implementation of "which section am I in" instead
// of two that disagree.
// ─────────────────────────────────────────────────────────────────

import { type MouseEvent as ReactMouseEvent, useMemo } from "react";
import type { ProjectTocItem } from "@/lib/projects/types";
import { scrollToHash } from "@/components/chrome/scrollToHash";
import { useScrollSpy } from "@/components/chrome/useScrollSpy";

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
  // useScrollSpy takes the sitewide TocItem shape (href, not id) and
  // keeps `items` in an effect dependency, so memoize — an array rebuilt
  // every render would tear the listener down and set it up again on
  // each one.
  const spyItems = useMemo(
    () => items.map((it) => ({ href: `#${it.id}`, label: it.label })),
    [items],
  );
  const activeId = useScrollSpy(spyItems);

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
