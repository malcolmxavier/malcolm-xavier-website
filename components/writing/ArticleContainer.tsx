// ─────────────────────────────────────────────────────────────────
// ArticleContainer — the reading column for a /essays essay.
//
// An essay is text and nothing else, so the whole article is one
// reading column: it caps at 40rem (~640px) and centres on the
// viewport. A case study cannot do that, because it interleaves cards,
// grids, and figures that need more room than a line of prose — there
// the section fills the page's column and states the measure for the
// prose inside it (CASE_STUDY_WIDTH, see MEASURE.md).
//
// The 40rem here is still a number written at the call site rather
// than a token, which MEASURE.md's checklist has down as a separate
// piece of work: the essay routes and the research routes disagree
// about more than the number — they disagree about whether a reading
// column centres on the viewport or aligns with the page — and that
// is a decision, not a find-and-replace.
//
// Renders a semantic <article> and stacks its children (header, intro,
// sections, coda) on a single vertical rhythm, so callers don't manage
// inter-block spacing themselves.
// ─────────────────────────────────────────────────────────────────

import type { ReactNode } from "react";

export function ArticleContainer({ children }: { children: ReactNode }) {
  return (
    <article className="mx-auto max-w-[40rem] px-6 md:px-8 py-14 md:py-20">
      <div className="flex flex-col gap-9 md:gap-11">{children}</div>
    </article>
  );
}
