// ─────────────────────────────────────────────────────────────────
// Note — a section-scoped aside, marked with a symbol rather than a
// number and sitting at the foot of the section it belongs to.
//
// This is deliberately NOT the Footnotes system next door. That one is
// built for the MSL papers: dozens of citations, numbered once across
// the whole document, collected into a single endnotes list at the
// foot of the article, each with a ↩ backref. It is a citation
// apparatus.
//
// The data primer's notes are a different shape. Its markers are `*`
// and `†`, they RESET per section — Completeness has a `*`, Accuracy
// has its own `*`, Legibility has both a `*` and a `†` — and each note
// is read immediately after the section that raised it, never at the
// end of the piece. Wiring those into a document-wide numbered endnote
// list would renumber the author's own markers and move the notes
// several thousand words away from the sentence they qualify.
//
// So there is no jump link and no backref, on purpose: the note is
// already a few lines below its marker, and a round trip to somewhere
// the reader can see without scrolling is apparatus for its own sake.
//
// The marker inside the prose is just the author's own character,
// typed where it belongs. Nothing to render for it.
// ─────────────────────────────────────────────────────────────────

import type { ReactNode } from "react";

export function Note({
  marker,
  children,
}: {
  /** The symbol this note answers to, e.g. "*" or "†". */
  marker: string;
  children: ReactNode;
}) {
  return (
    <p
      className="m-0 text-[var(--text-caption)]"
      style={{ fontSize: "0.85rem", lineHeight: 1.55 }}
    >
      {/* The marker is aria-hidden and the note opens with a spoken
          label instead. A screen reader announcing "asterisk" tells a
          listener nothing, while "Note:" says what the passage is. */}
      <span aria-hidden="true">{marker}</span>
      <span className="sr-only">Note: </span>
      {children}
    </p>
  );
}
