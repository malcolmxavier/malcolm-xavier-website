// ─────────────────────────────────────────────────────────────────
// ArticleContainer — the reading column for an /essays essay.
//
// An essay is text and nothing else, so the whole article is one
// centred, clamped column: title, dateline, prose, notes, and quotes
// all share one width. A case study cannot work that way, because it
// interleaves cards, grids, and figures that need more room than a
// line of prose — there the section states the measure and only the
// prose inside takes it.
//
// WIDTH. --column-essay, 52rem, having been a bare 40rem and then 46rem
// on 2026-09-28. The first step was the rest of the site moving onto a
// 104rem well and leaving these pages looking tighter than everything
// around them. The second is what the column earned by absorbing the
// page's furniture: the plan for the space beside a centred essay was a
// rail carrying the pillar, the reading time and a way back, and all
// three ended up inside the column instead — the back link above the
// header, the reading time in the dateline, the neighbour cards below.
// Nothing is waiting for that margin, so the text has it.
//
// 52rem is about 87 characters at the body size, which is the practical
// ceiling rather than a comfortable middle: past roughly 90 the eye
// starts losing its place on the carriage return. Do not widen it again
// without moving the body type up with it. See MEASURE.md, and the note
// above the token in
// scripts/build-tokens.mjs for why this one width is in rem while every
// measure is in ch: it caps a column holding a 52px title, 19px body,
// and 16px notes at once, and "sixty characters" has three different
// answers inside that.
//
// CENTRED, and deliberately unlike ProjectContainer, which aligns left
// on the rail and argues in its own comments that centring is wrong.
// That argument holds where a page has other edges to line up with. An
// essay is one column and nothing else, so it has none — and Malcolm's
// read of the rendered page is that centred is right here. A pass on
// 2026-09-28 tried left-aligning it for consistency and he reversed it
// the same day; do not re-raise it on the consistency argument.
//
// It sits inside Container so it inherits the site's responsive gutters
// rather than carrying its own px-6 md:px-8 — and because Container is
// itself centred, centring within it is centring on the viewport.
//
// Renders a semantic <article> and stacks its children (header, intro,
// sections, coda) on a single vertical rhythm, so callers don't manage
// inter-block spacing themselves.
// ─────────────────────────────────────────────────────────────────

import type { ReactNode } from "react";
import { Container } from "@/components/layout/Container";

export function ArticleContainer({ children }: { children: ReactNode }) {
  return (
    <Container className="py-14 md:py-20">
      <article className="mx-auto w-full max-w-[var(--column-essay)]">
        <div className="flex flex-col gap-9 md:gap-11">{children}</div>
      </article>
    </Container>
  );
}
