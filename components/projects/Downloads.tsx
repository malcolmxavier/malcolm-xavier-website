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

/** What the Contents rail calls this block. Deliberately NOT the block's
 *  own heading, which is editorial ("Take it with you", "Read the full
 *  work") and reads in a list of section titles as though it were one.
 *  The rail is a set of destinations, so the entry names the action.
 *  Fixed rather than per-item: every version of this block does the same
 *  thing, whatever its heading says. */
export const DOWNLOADS_TOC_LABEL = "Download";

/** The heading an item gets when it sets no `downloadsHeading`. */
const DEFAULT_HEADING = "Read the full work";

export function Downloads({
  heading = DEFAULT_HEADING,
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
          // The rest colour lives on the <li> so the anchor's
          // `color: inherit` resolves to it — link-heading sets that
          // colour with !important, which a class on the anchor can't
          // beat, and inheriting is how the rule is meant to be driven.
          <li
            key={item.href}
            className="flex flex-col gap-0.5 text-[var(--text-heading)]"
          >
            {/* link-heading, the shared heading-link treatment: neutral
                at rest, action green on hover AND keyboard focus. This
                used to hover to --text-action-hover, which resolves to
                #000 on the light recruiter cluster — the same value as
                the rest colour, so the hover did nothing at all, and in
                dark went white → #d7dad7, a greyer white. Same wrong
                token the heading links had. */}
            <a
              href={item.href}
              target="_blank"
              rel="noopener noreferrer"
              className="link-heading w-fit"
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
