// ─────────────────────────────────────────────────────────────────
// Downloads — the "read the full work" block at the foot of a
// /research page.
//
// It used to have a sibling, CompanionSlot, which rendered a dashed box
// for an artifact that wasn't available yet. Deleted 2026-09-27: its only
// purpose was a coming-soon notice, which this site doesn't ship.
//
// Downloads are static files under public/projects/<slug>/, so each
// row is a PLAIN anchor opening in a new tab — never the Link
// primitive, which routes internal hrefs through next/link and would
// try to client-navigate (and prefetch) a non-route .pdf. Opening
// in-tab lets the browser's PDF viewer handle view-or-save rather than
// forcing a download.
// ─────────────────────────────────────────────────────────────────

import type { ProjectDownload } from "@/lib/projects/types";

/** The anchor id the block carries, so a sectioned piece's Contents
 *  rail can list it alongside the paper's own sections. Exported so the
 *  page composing that rail and the block itself cannot drift apart —
 *  see the toc assembly in app/research/[slug]/page.tsx. */
export const DOWNLOADS_ANCHOR_ID = "downloads";

/** The heading an item gets when it sets no `downloadsHeading`. Exported
 *  for the same reason the id is: the Contents entry has to read exactly
 *  what the block it points at reads. */
export const DOWNLOADS_DEFAULT_HEADING = "Read the full work";

export function Downloads({
  heading = DOWNLOADS_DEFAULT_HEADING,
  items,
}: {
  heading?: string;
  items: ProjectDownload[];
}) {
  if (items.length === 0) return null;
  return (
    <section
      // `id` is the jump target; `scroll-mt` clears the fixed nav, the
      // same offset ProjectSection uses for the paper's own headings.
      id={DOWNLOADS_ANCHOR_ID}
      aria-labelledby="downloads-heading"
      className="flex flex-col gap-4 rounded-lg p-5 md:p-6 scroll-mt-28"
      style={{
        border: "1px solid var(--border-default)",
        background: "var(--surface-muted)",
      }}
    >
      <h2
        id="downloads-heading"
        className="m-0 text-[var(--text-caption)]"
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "var(--p-xs-font-size)",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
        }}
      >
        {heading}
      </h2>
      <ul className="m-0 flex list-none flex-col gap-3 p-0">
        {items.map((item) => (
          <li key={item.href} className="flex flex-col gap-0.5">
            <a
              href={item.href}
              target="_blank"
              rel="noopener noreferrer"
              className="w-fit text-[var(--text-heading)] underline decoration-2 underline-offset-4 hover:[color:var(--text-action-hover)]"
              style={{ fontFamily: "var(--font-primary)", fontSize: "1.05rem" }}
            >
              {item.label} ↓<span className="sr-only"> (opens in new tab)</span>
            </a>
            {item.meta && (
              <span
                className="text-[var(--text-caption)]"
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "var(--p-xs-font-size)",
                }}
              >
                {item.meta}
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
