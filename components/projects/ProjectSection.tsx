// ─────────────────────────────────────────────────────────────────
// ProjectSection — a titled section within a /projects reading page.
//
// Mirrors the /writing EssaySection (an Instrument-Serif <h2> over its
// body on the recruiter cluster), with one addition: an optional `id`
// so long academic pieces can carry stable in-page anchors for a table
// of contents or deep links. The wrapping <section> + <h2> keeps the
// document outline correct for screen-reader heading navigation.
//
// `scroll-mt` offsets the anchor target below the fixed nav so a
// deep-linked jump doesn't land the heading under the chrome.
// ─────────────────────────────────────────────────────────────────

import type { ReactNode } from "react";

export function ProjectSection({
  id,
  title,
  children,
}: {
  id?: string;
  title: ReactNode;
  children: ReactNode;
}) {
  return (
    <section id={id} className="flex flex-col gap-5 scroll-mt-28">
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
