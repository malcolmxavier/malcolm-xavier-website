// ─────────────────────────────────────────────────────────────────
// Footnotes — a static, explicitly-numbered footnote system for the
// long-form academic pieces under /projects (the two MSL papers carry
// dozens of citations each).
//
// Numbers are passed explicitly rather than auto-incremented. These
// papers are fixed texts whose notes are already numbered at the
// source, so explicit `n` keeps server rendering deterministic (no
// render-order counter, no client state) and lets the inline marker
// and its endnote share a number that survives edits to unrelated
// paragraphs.
//
// Wiring: an inline <Fn n={3} /> renders a linked superscript that
// jumps to <FnItem n={3}> in the <Footnotes> list; the endnote renders
// a ↩ backref to the inline marker. The id pair (fnref-N ↔ fn-N) is
// what makes the round trip keyboard- and screen-reader-navigable.
// ─────────────────────────────────────────────────────────────────

import type { ReactNode } from "react";

/** Inline citation marker. Renders a superscript link to endnote `n`. */
export function Fn({ n }: { n: number }) {
  return (
    <sup
      id={`fnref-${n}`}
      className="scroll-mt-28"
      style={{ lineHeight: 0, whiteSpace: "nowrap" }}
    >
      <a
        href={`#fn-${n}`}
        aria-label={`Footnote ${n}`}
        className="underline decoration-1 underline-offset-2 hover:[color:var(--text-action-hover)]"
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "0.7em",
          // Brand green (green-700 light / green-500 dark) — the same
          // --cs-accent-strong the TOC rail and reading-progress bar use,
          // so the citation apparatus reads as one green system.
          color: "var(--cs-accent-strong)",
          padding: "0 0.1em",
        }}
      >
        {n}
      </a>
    </sup>
  );
}

/** The endnotes list. Renders under a "Notes" heading at the foot of
 *  the article, above any downloads. Children are <FnItem>s. */
export function Footnotes({ children }: { children: ReactNode }) {
  return (
    <section aria-labelledby="notes-heading" className="flex flex-col gap-4">
      <h2
        id="notes-heading"
        className="m-0 text-[var(--text-caption)]"
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "var(--p-xs-font-size)",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
        }}
      >
        Notes
      </h2>
      {/* A real decimal list — the visible marker (forced to `n` by the
          value attribute on each FnItem) is what ties an endnote back to
          its inline superscript. It must NOT be a flex container: flex
          items don't render list markers, so the numbers would vanish.
          Markers carry the same brand green as the inline markers. */}
      <ol
        className="m-0 list-decimal space-y-2.5 pl-6 marker:[color:var(--cs-accent-strong)]"
        style={{
          fontSize: "0.9rem",
          lineHeight: 1.55,
          color: "var(--text-body)",
        }}
      >
        {children}
      </ol>
    </section>
  );
}

/** Italic run inside a footnote — for cited titles, case names, and
 *  the Latin signals of legal citation (supra, Id., on). Kept distinct
 *  from the editorial <Emph> (Instrument Serif) used in body prose:
 *  notes want a plain italic in the note's own smaller face, not the
 *  serif display italic, and fontStyle is set explicitly so a reset
 *  that strips the UA default doesn't also strip the emphasis. */
export function Cite({ children }: { children: ReactNode }) {
  return <em style={{ fontStyle: "italic" }}>{children}</em>;
}

/** One endnote. `n` must match the inline <Fn n={n} />. The `value`
 *  attribute forces the visible list number to `n` even if the notes
 *  aren't authored in unbroken order. */
export function FnItem({ n, children }: { n: number; children: ReactNode }) {
  return (
    <li id={`fn-${n}`} value={n} className="scroll-mt-28">
      {children}{" "}
      <a
        href={`#fnref-${n}`}
        aria-label={`Back to reference ${n}`}
        className="underline decoration-1 underline-offset-2 hover:[color:var(--text-action-hover)]"
        style={{ color: "var(--cs-accent-strong)", whiteSpace: "nowrap" }}
      >
        ↩
      </a>
    </li>
  );
}
