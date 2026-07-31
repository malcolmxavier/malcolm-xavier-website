// ─────────────────────────────────────────────────────────────────
// EssaySection — a titled section within a /writing essay.
//
// A lighter unit than the case study's <Beat>: no forced section
// number and no claude-tag scaffolding, just an Instrument-Serif <h2>
// (the recruiter cluster's display face) over its body. Sized between
// the body copy and Beat's 40–60px headline so an essay's internal
// structure reads clearly without competing with the page H1. The
// wrapping <section> + <h2> keeps the document outline correct for
// screen-reader heading navigation.
// ─────────────────────────────────────────────────────────────────

import type { ReactNode } from "react";

export function EssaySection({
  title,
  children,
}: {
  title: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-5">
      <h2
        className="m-0 text-[25px] md:text-[30px] leading-[1.2] tracking-[-0.01em] text-[var(--text-heading)]"
        style={{ fontFamily: "var(--font-primary)" }}
      >
        {title}
      </h2>
      {children}
    </section>
  );
}
