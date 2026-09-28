// ─────────────────────────────────────────────────────────────────
// List — a bulleted or numbered list inside a reading column.
//
// This exists because the CSS reset strips list markers. A bare <ul>
// renders as unstyled lines with no bullets at all, so the marker
// classes are load-bearing rather than decoration. Before this, every
// list in the MSL papers repeated the same string by hand:
//
//   <ul className="list-disc space-y-2 pl-6 marker:text-[var(--text-caption)]">
//   <ol className="list-decimal space-y-2 pl-6 marker:text-[var(--text-caption)]">
//
// Typed out at each list site, which is four more repetitions the
// moment a piece like the data primer arrives with lists of its own.
//
// Markers sit at --text-caption rather than the body colour: the
// bullet is scaffolding for the eye, and matching it to the text makes
// a list read heavier than the prose around it.
//
// Body (components/case-study/primitives) is a <div>, not a <p>, and
// already carries [&>ul]:m-0 [&>ol]:m-0 — so a List is safe as a direct
// child of Body and its own margin is deliberately left at zero, with
// Body's flex gap doing the spacing between blocks.
// ─────────────────────────────────────────────────────────────────

import type { ReactNode } from "react";

const SHARED = "m-0 space-y-2 pl-6 marker:text-[var(--text-caption)]";

export function List({
  ordered = false,
  children,
  className = "",
}: {
  /** Numbered rather than bulleted. */
  ordered?: boolean;
  children: ReactNode;
  className?: string;
}) {
  const Tag = ordered ? "ol" : "ul";
  const marker = ordered ? "list-decimal" : "list-disc";
  return <Tag className={`${SHARED} ${marker} ${className}`}>{children}</Tag>;
}
