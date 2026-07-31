// ─────────────────────────────────────────────────────────────────
// ProjectContainer — the reading column for a /projects page.
//
// Wider than the /writing ArticleContainer (40rem): a project page
// interleaves running prose with a wide datafolio figure and data-heavy
// paragraphs, so the essay measure shrinks the content well needlessly,
// drives up scroll, and strands large side gutters. The column widens
// on large screens — where that negative space is greatest — to 54rem,
// which fills the gutters and lets the datafolio read at a useful size
// without being opened, while tablet and mobile keep the tighter
// measure. Still well short of the case-study tier (up to 1024px),
// which is built for card-and-grid interleaving rather than running
// prose. Renders a semantic <article> and stacks its children on a
// single vertical rhythm, so callers don't manage inter-block spacing.
// ─────────────────────────────────────────────────────────────────

import type { ReactNode } from "react";

export function ProjectContainer({ children }: { children: ReactNode }) {
  return (
    <article className="mx-auto w-full max-w-[46rem] lg:max-w-[54rem] px-6 md:px-8 py-14 md:py-20">
      <div className="flex flex-col gap-9 md:gap-11">{children}</div>
    </article>
  );
}
