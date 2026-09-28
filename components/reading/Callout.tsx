// ─────────────────────────────────────────────────────────────────
// Callout — a passage of the author's OWN prose, set apart because it
// is the important bit.
//
// This exists because there were three jobs and only two components,
// and the third kept being done by the wrong one. The set:
//
//   Blockquote — someone ELSE'S words. A source quoted at length:
//     statute, case law, Baudrillard. New text the reader has not seen,
//     at body size because it is meant to be read as part of the
//     argument. Semantically <blockquote>, which is what tells a screen
//     reader the content comes from another source.
//
//   Pullquote — the author's own line, REPEATED. Already sitting in the
//     paragraph above, lifted out and set large. Carries no new
//     information; it is a magazine device for slowing the eye.
//
//   Callout (this) — the author's own prose, appearing ONCE, set apart
//     for weight. Neither quoted nor repeated.
//
// The two /writing essays both wanted the third and both got the first:
// the data primer's "Hint:" passage and this piece's capital-T /
// lowercase-t thesis were wrapped in <blockquote>, announcing to
// assistive tech that Malcolm's own original sentences were quoted from
// somewhere else. That is a semantics bug, not a styling preference.
//
// NO ROLE, deliberately. <aside> and role="note" both mean "ancillary
// or parenthetical", which fits the primer's "Hint:" and is flatly
// wrong for the TPM thesis — that passage is the central claim of its
// essay, the thing everything above builds to. A wrapper that called it
// an aside would be a second mislabelling to replace the first. The
// emphasis here is visual; the text stays in normal reading order,
// which is what a screen reader should get.
//
// Visually identical to Blockquote on purpose, sharing SET_OFF below so
// the two cannot drift. A reader does not need to be told which of the
// two they are looking at — the distinction is for the machine and for
// whoever edits the page next.
// ─────────────────────────────────────────────────────────────────

import type { ReactNode } from "react";

/** The shared "set off from the running prose" treatment: a left rule
 *  at the default border colour, a small indent, and body-size type.
 *  Imported by Blockquote so one edit moves both. */
export const SET_OFF =
  "m-0 flex flex-col gap-3 border-l-2 pl-5 md:pl-6 text-[15px] md:text-[17px] leading-[1.6] text-[var(--text-body)] [&>p]:m-0";

export function Callout({ children }: { children: ReactNode }) {
  return (
    <div className={SET_OFF} style={{ borderColor: "var(--border-default)" }}>
      {children}
    </div>
  );
}
