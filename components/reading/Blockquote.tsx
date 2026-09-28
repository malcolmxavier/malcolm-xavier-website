// ─────────────────────────────────────────────────────────────────
// Blockquote — an extended block quotation for the long-form academic
// pieces under /projects. The MSL papers quote statute, case law, and
// scholarship at length; this sets those passages off from the running
// argument with a left rule and a small indent, the way a printed law
// review offsets a block quote.
//
// Semantic <blockquote> so assistive tech announces the quotation
// boundary. Children are the quoted paragraphs (and, for statutory
// text, the numbered factors rendered as plain paragraphs so the
// source's own "(1)…(4)" numbering is preserved verbatim).
// ─────────────────────────────────────────────────────────────────

// USE THIS ONLY FOR SOMEONE ELSE'S WORDS. <blockquote> tells assistive
// tech the content is quoted from another source, so a passage of the
// author's own prose does not belong here however much it wants setting
// off — that is what Callout is for, and it shares this exact
// treatment so the two look identical and mean different things.
// A line of the author's own prose REPEATED from the paragraph above is
// a third thing again: Pullquote.

import type { ReactNode } from "react";
import { SET_OFF } from "./Callout";

export function Blockquote({ children }: { children: ReactNode }) {
  return (
    <blockquote
      className={SET_OFF}
      style={{ borderColor: "var(--border-default)" }}
    >
      {children}
    </blockquote>
  );
}
