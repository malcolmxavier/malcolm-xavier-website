"use client";

// ─────────────────────────────────────────────────────────────────
// TocDisclosure — a collapsible "Contents" list for narrow viewports.
//
// The mobile companion to the sticky TableOfContents rail: on phones
// and small tablets there's no room for a persistent side rail, so a
// long, sectioned read gets a native <details> disclosure at the top
// of the article instead. Sitewide primitive — used by /projects and
// (where a desktop-only TOC rail otherwise leaves mobile with no jump
// nav) case studies and the résumé.
//
// Positioning and breakpoint visibility are the CONSUMER's job (pass a
// className like "lg:hidden"); this component only owns the disclosure
// itself. Built on <details>/<summary> so it's keyboard-operable and
// screen-reader-announced with zero JS; the smooth-scroll-on-click is
// progressive enhancement via the shared scrollToHash helper.
// ─────────────────────────────────────────────────────────────────

import { type MouseEvent as ReactMouseEvent } from "react";
import type { TocItem } from "./TableOfContents";
import { scrollToHash } from "./scrollToHash";

interface TocDisclosureProps {
  items: TocItem[];
  /** Summary label and default aria-label. Defaults to "Contents". */
  heading?: string;
  /** aria-label on the inner <nav>. Falls back to `heading`. */
  ariaLabel?: string;
  /** Consumer-owned positioning / visibility (e.g. "lg:hidden"). */
  className?: string;
}

export function TocDisclosure({
  items,
  heading = "Contents",
  ariaLabel,
  className = "",
}: TocDisclosureProps) {
  function handleClick(
    e: ReactMouseEvent<HTMLAnchorElement>,
    href: string,
  ): void {
    // Smooth-scroll to the target and keep the URL hash current; only
    // suppress the default jump when the helper actually handled it.
    if (scrollToHash(href)) e.preventDefault();
  }

  return (
    <details
      className={`group rounded-lg ${className}`}
      style={{ border: "1px solid var(--border-default)" }}
    >
      {/* list-none hides the native disclosure triangle; the rotating
          chevron below is the open/closed affordance instead. */}
      <summary
        className="flex cursor-pointer list-none items-center justify-between p-4 text-[var(--text-caption)]"
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "var(--p-xs-font-size)",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
        }}
      >
        {heading}
        {/* Chevron rotates 180° when the disclosure is open. aria-hidden
            because the <summary>'s expanded/collapsed state is already
            conveyed natively to assistive tech. */}
        <svg
          className="transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </summary>
      <nav aria-label={ariaLabel ?? heading}>
        <ol className="m-0 flex list-none flex-col gap-2.5 p-0 px-4 pb-4 pt-0">
          {items.map((item) => (
            <li key={item.href} className="flex items-baseline gap-2.5">
              {item.prefix && (
                <span
                  className="text-[var(--text-caption)]"
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "10px",
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                  }}
                >
                  {item.prefix}
                </span>
              )}
              <a
                href={item.href}
                onClick={(e) => handleClick(e, item.href)}
                aria-label={
                  item.ariaLabel ??
                  (item.label.startsWith("↑") ? "Back to top" : undefined)
                }
                className="text-[0.95rem] text-[var(--text-action)] underline decoration-1 underline-offset-2 hover:[color:var(--text-action-hover)]"
              >
                {item.label}
              </a>
            </li>
          ))}
        </ol>
      </nav>
    </details>
  );
}
