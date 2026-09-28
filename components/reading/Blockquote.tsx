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

import type { ReactNode } from "react";

export function Blockquote({ children }: { children: ReactNode }) {
  return (
    <blockquote
      className="m-0 flex flex-col gap-3 border-l-2 pl-5 md:pl-6 text-[15px] md:text-[17px] leading-[1.6] text-[var(--text-body)] [&>p]:m-0"
      style={{ borderColor: "var(--border-default)" }}
    >
      {children}
    </blockquote>
  );
}
