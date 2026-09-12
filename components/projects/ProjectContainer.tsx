// ─────────────────────────────────────────────────────────────────
// ProjectContainer — the reading column for a /projects page.
//
// Sits in the site's content well and takes its left edge from it, so
// the page starts where the header does. Inside that well the prose
// runs to its own measure: wider than the /writing ArticleContainer
// (40rem), because a project page interleaves running prose with a
// wide datafolio figure and data-heavy paragraphs, and an essay
// measure strands the figure. It widens to 54rem on large screens —
// where that negative space is greatest — which lets the datafolio
// read at a useful size without being opened, while tablet and mobile
// keep the tighter measure.
//
// The measure is left-aligned rather than centred: centring it inside
// a well that is itself centred would put the column's edge somewhere
// no other page on the site puts one. Renders a semantic <article>
// and stacks its children on a single vertical rhythm, so callers
// don't manage inter-block spacing.
// ─────────────────────────────────────────────────────────────────

import type { ReactNode } from "react";
import { Container } from "@/components/layout/Container";

export function ProjectContainer({ children }: { children: ReactNode }) {
  return (
    <Container className="py-14 md:py-20">
      <article className="w-full max-w-[46rem] lg:max-w-[54rem]">
        <div className="flex flex-col gap-9 md:gap-11">{children}</div>
      </article>
    </Container>
  );
}
