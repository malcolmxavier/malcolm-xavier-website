// ─────────────────────────────────────────────────────────────────
// ArticleContainer — the reading column for a /writing essay.
//
// A tighter measure than the case-study rail (CASE_STUDY_WIDTH runs
// 560→1024px because case studies interleave cards and grids); a
// text-forward essay reads best around a 65-character line, so this
// caps at 40rem (~640px). Renders a semantic <article> and stacks its
// children (header, intro, sections, coda) on a single vertical
// rhythm, so callers don't manage inter-block spacing themselves.
// ─────────────────────────────────────────────────────────────────

import type { ReactNode } from "react";

export function ArticleContainer({ children }: { children: ReactNode }) {
  return (
    <article className="mx-auto max-w-[40rem] px-6 md:px-8 py-14 md:py-20">
      <div className="flex flex-col gap-9 md:gap-11">{children}</div>
    </article>
  );
}
