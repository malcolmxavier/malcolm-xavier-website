// ─────────────────────────────────────────────────────────────────
// Case-study primitives — composable text blocks, callouts, cards,
// grids, and a metrics table for use in long-form case studies.
//
// Usage:
//
//     import {
//       Beat, Body, Emph, Code, Pullquote, ClaudeNote,
//       StatRow, Stat, EvidenceGrid, EvidenceCard,
//       SuccessGate, GateCard, IterationGrid, IterationCard,
//       HarnessGrid, HarnessFeature, MetricsTable,
//       type MetricRow,
//     } from "@/components/case-study/primitives";
//
// Cards reference a `.case-glass` class for a subtle elevated
// "Liquid Glass"-style treatment. The class is defined in the
// Basecamp Coffee case study's case-study.css; future case studies
// can either copy that definition into their own CSS, override it,
// or remove the class from a card's wrapper for a flat look. The
// class is no-op when undefined — the cards still render as
// rounded bordered surfaces.
// ─────────────────────────────────────────────────────────────────

import type { ReactNode } from "react";
import { Kicker } from "@/components/typography/Kicker";

// ─── CaseStudyKicker ────────────────────────────────────────────
//
// Editorial variant of the sitewide <Kicker>. Same mono / uppercase
// treatment, but tighter (11px instead of 12px) and much wider
// tracking (0.22em vs 0.08em) so case-study eyebrows read as
// magazine-style "ON THIS PAGE / 01 · THE SIGNAL" labels rather
// than the standard section eyebrows used elsewhere on the site
// (e.g. in the Footer).
//
// Use this anywhere inside a case-study article that needs a
// kicker — Hero metadata row, Beat numbers + claude tags, eyebrow
// rows on EvidenceCard / GateCard / IterationCard / etc.
//
// `tone="muted"` switches to --text-disabled for the right-side
// metadata position (e.g. "10 min read · Updated …" reads quieter
// than the left-side "Case Study" label).
// ────────────────────────────────────────────────────────────────

export function CaseStudyKicker({
  children,
  tone = "default",
  className,
}: {
  children: ReactNode;
  tone?: "default" | "muted";
  className?: string;
}) {
  return (
    <Kicker
      className={`m-0 ${className ?? ""}`}
      style={{
        fontSize: "11px",
        letterSpacing: "0.22em",
        color: tone === "muted" ? "var(--text-disabled)" : "var(--text-caption)",
      }}
    >
      {children}
    </Kicker>
  );
}

// ─── Inter-beat separator ───────────────────────────────────────
//
// Centered hairline separator for use between Beat sections (and
// between the Hero and the first Beat). Width matches Beat's
// max-width / padding rhythm so the line aligns with each beat's
// content column at every breakpoint.
//
//     <CaseStudyHero …>…</CaseStudyHero>
//     <BeatSeparator />
//     <Beat …>…</Beat>
//     <BeatSeparator />
//     <Beat …>…</Beat>
// ────────────────────────────────────────────────────────────────

export function BeatSeparator() {
  return (
    <hr
      className="mx-auto mb-[18px] h-px border-0 max-w-[504px] md:max-w-[800px] lg:max-w-[944px] w-[calc(100%-56px)] md:w-[calc(100%-80px)]"
      style={{ background: "var(--border-default)" }}
    />
  );
}

// ─── Section template ───────────────────────────────────────────
//
// Beat — a numbered, titled section in the article. Uses the same
// max-width / padding / scroll-margin treatment across all case
// studies so anchor scroll-spy and TOC lockup land at the same y
// in every article.
//
//   <Beat id="signal" number="01" title="The Signal" headline="…"
//         claudeTag="hypothesis sketch">
//     <Body>…</Body>
//   </Beat>
//
// claudeTag renders in the kicker row as `claude · <tag>`. Pass
// claudeTagLiteral to render the tag string verbatim without the
// "claude · " prefix (useful for "tools used" or other meta tags).
// ────────────────────────────────────────────────────────────────

export interface BeatProps {
  id: string;
  number: string;
  title: string;
  headline: string;
  claudeTag?: string;
  /** When true, render claudeTag verbatim without the `claude · ` prefix. */
  claudeTagLiteral?: boolean;
  children: ReactNode;
}

export function Beat({
  id,
  number,
  title,
  headline,
  claudeTag,
  claudeTagLiteral,
  children,
}: BeatProps) {
  return (
    <section
      id={id}
      className="scroll-mt-28 mx-auto max-w-[560px] px-7 pt-6 pb-6 md:max-w-[880px] md:px-10 md:pt-9 md:pb-9 lg:max-w-[1024px]"
    >
      <div className="flex flex-col md:flex-row md:items-baseline md:justify-between gap-1 md:gap-6 mb-5 md:mb-6">
        <CaseStudyKicker>
          {number} · {title}
        </CaseStudyKicker>
        {claudeTag && (
          <CaseStudyKicker>
            {claudeTagLiteral ? claudeTag : `claude · ${claudeTag}`}
          </CaseStudyKicker>
        )}
      </div>
      <h2 className="m-0 mb-6 md:mb-8 font-medium text-[40px] md:text-[52px] lg:text-[60px] leading-[1.05] tracking-[-0.02em] text-[var(--text-heading)]">
        {headline}
      </h2>
      {children}
    </section>
  );
}

// ─── Text blocks ─────────────────────────────────────────────────
//
// Body — paragraph stack inside a Beat. Default body type size and
// caption color, with consistent vertical rhythm.
//
// Emph — italic serif emphasis inline (uses --font-primary). For
// when you want a phrase to read as the case study's voice, not
// the body voice.
//
// Code — small inline code chip with a tinted bg. Looks at home
// in either editorial body copy or a dense table cell.
// ────────────────────────────────────────────────────────────────

export function Body({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col gap-4 text-[17px] md:text-[19px] leading-[1.55] text-[var(--text-body)] [&>p]:m-0">
      {children}
    </div>
  );
}

export function Emph({ children }: { children: ReactNode }) {
  return (
    <span
      className="text-[var(--text-heading)]"
      style={{
        fontFamily: "var(--font-primary), serif",
        fontStyle: "italic",
      }}
    >
      {children}
    </span>
  );
}

export function Code({ children }: { children: ReactNode }) {
  return (
    <code
      className="text-[14px] md:text-[15px] px-1.5 py-0.5 rounded-[6px] bg-[color-mix(in_oklab,var(--text-body)_6%,transparent)] text-[var(--text-heading)]"
      style={{ fontFamily: "var(--font-mono), monospace" }}
    >
      {children}
    </code>
  );
}

// ─── Callouts ────────────────────────────────────────────────────
//
// Pullquote — attributed editorial quote, italic serif, left-rule.
//   <Pullquote attribution="Barista Lead Sub-agent">…</Pullquote>
//
// ClaudeNote — meta-commentary box about how Claude was used at
// this beat. Mono kicker reads "How I used Claude". Repurpose the
// component for other agent stories by passing a custom kicker via
// the optional `kicker` prop (defaults to "How I used Claude").
// ────────────────────────────────────────────────────────────────

export function Pullquote({
  children,
  attribution,
}: {
  children: ReactNode;
  attribution: string;
}) {
  return (
    <figure className="my-10 md:my-12 max-w-[720px] pl-5 md:pl-6 border-l-[2px] border-[var(--border-default)]">
      <blockquote
        className="m-0 text-[22px] md:text-[28px] leading-[1.3] tracking-[-0.005em] text-[var(--text-heading)]"
        style={{
          fontFamily: "var(--font-primary), serif",
          fontStyle: "italic",
        }}
      >
        &ldquo;{children}&rdquo;
      </blockquote>
      <figcaption
        className="mt-3 text-[11px] uppercase tracking-[0.22em] text-[var(--text-disabled)]"
        style={{ fontFamily: "var(--font-mono), monospace" }}
      >
        — {attribution}
      </figcaption>
    </figure>
  );
}

export function ClaudeNote({
  children,
  kicker = "How I used Claude",
}: {
  children: ReactNode;
  kicker?: string;
}) {
  return (
    <div className="my-8 md:my-10 pl-4 md:pl-5 border-l-[2px] border-[var(--border-default)]">
      <p
        className="m-0 mb-2 text-[10px] uppercase tracking-[0.22em] text-[var(--text-caption)]"
        style={{ fontFamily: "var(--font-mono), monospace" }}
      >
        {kicker}
      </p>
      <p className="m-0 text-[15px] md:text-[16px] leading-[1.55] text-[var(--text-caption)]">
        {children}
      </p>
    </div>
  );
}

// ─── Stat row + card ─────────────────────────────────────────────
//
// StatRow — 1-col mobile, 2-col desktop grid for big-number stats.
//   <StatRow><Stat … /><Stat … /></StatRow>
//
// Stat — eyebrow / big number / caption card. Eyebrow is mono
// uppercase (kicker), big is editorial display, caption is muted
// body text.
// ────────────────────────────────────────────────────────────────

export function StatRow({ children }: { children: ReactNode }) {
  return (
    <div className="my-8 md:my-10 grid grid-cols-1 md:grid-cols-2 gap-4">
      {children}
    </div>
  );
}

export function Stat({
  big,
  eyebrow,
  caption,
}: {
  big: string;
  eyebrow: string;
  caption: string;
}) {
  return (
    <div className="case-glass flex flex-col gap-2 p-5 rounded-[22px] border border-[var(--border-default)]">
      <p
        className="m-0 text-[10px] uppercase tracking-[0.22em] text-[var(--text-caption)]"
        style={{ fontFamily: "var(--font-mono), monospace" }}
      >
        {eyebrow}
      </p>
      <p className="m-0 text-[56px] md:text-[68px] lg:text-[80px] font-medium leading-none tracking-[-0.03em] text-[var(--text-heading)]">
        {big}
      </p>
      <p className="m-0 text-[14px] leading-[1.5] text-[var(--text-caption)]">
        {caption}
      </p>
    </div>
  );
}

// ─── Evidence grid + card ────────────────────────────────────────
//
// 2-col grid of cards with eyebrow / title / body. For evidence
// dumps, supporting facets, secondary findings, etc.
// ────────────────────────────────────────────────────────────────

export function EvidenceGrid({ children }: { children: ReactNode }) {
  return (
    <div className="my-8 md:my-10 grid grid-cols-1 md:grid-cols-2 gap-4">
      {children}
    </div>
  );
}

export function EvidenceCard({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="case-glass flex flex-col gap-2 p-5 rounded-[22px] border border-[var(--border-default)]">
      <p
        className="m-0 text-[10px] uppercase tracking-[0.22em] text-[var(--text-caption)]"
        style={{ fontFamily: "var(--font-mono), monospace" }}
      >
        {eyebrow}
      </p>
      <h3 className="m-0 text-[20px] font-semibold leading-[1.1] tracking-[-0.01em] text-[var(--text-heading)]">
        {title}
      </h3>
      <p className="m-0 text-[15px] leading-[1.5] text-[var(--text-caption)]">
        {children}
      </p>
    </div>
  );
}

// ─── Success-gate grid + card ────────────────────────────────────
//
// 2-col grid of "metric / threshold / caption" cards. For
// experiment success criteria, decision gates, GTM checkpoints —
// anywhere a small set of go/no-go thresholds belongs.
// ────────────────────────────────────────────────────────────────

export function SuccessGate({ children }: { children: ReactNode }) {
  return (
    <div className="my-8 md:my-10 grid grid-cols-1 md:grid-cols-2 gap-4">
      {children}
    </div>
  );
}

export function GateCard({
  metric,
  threshold,
  caption,
}: {
  metric: string;
  threshold: string;
  caption: string;
}) {
  return (
    <div className="case-glass flex flex-col gap-1.5 p-5 rounded-[22px] border border-[var(--border-default)]">
      <p
        className="m-0 text-[10px] uppercase tracking-[0.22em] text-[var(--text-caption)]"
        style={{ fontFamily: "var(--font-mono), monospace" }}
      >
        {metric}
      </p>
      <p className="m-0 text-[32px] md:text-[36px] font-medium leading-none tracking-[-0.02em] text-[var(--text-heading)]">
        {threshold}
      </p>
      <p className="m-0 text-[13px] leading-[1.4] text-[var(--text-disabled)]">
        {caption}
      </p>
    </div>
  );
}

// ─── Iteration grid + card ───────────────────────────────────────
//
// 1/2/3-col responsive grid of cards with lens / title / body.
// For iteration logs, design rounds, decision frames — anywhere
// you want to surface a sequence of related lens-on-the-same-
// problem cards.
// ────────────────────────────────────────────────────────────────

export function IterationGrid({ children }: { children: ReactNode }) {
  return (
    <div className="my-8 md:my-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {children}
    </div>
  );
}

export function IterationCard({
  lens,
  title,
  children,
}: {
  lens: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="case-glass flex flex-col gap-2 p-5 rounded-[22px] border border-[var(--border-default)]">
      <p
        className="m-0 text-[10px] uppercase tracking-[0.22em] text-[var(--text-caption)]"
        style={{ fontFamily: "var(--font-mono), monospace" }}
      >
        {lens}
      </p>
      <h3 className="m-0 text-[20px] font-semibold leading-[1.1] tracking-[-0.01em] text-[var(--text-heading)]">
        {title}
      </h3>
      <p className="m-0 text-[15px] leading-[1.5] text-[var(--text-caption)]">
        {children}
      </p>
    </div>
  );
}

// ─── Harness grid + feature card ─────────────────────────────────
//
// 1/2/3-col responsive grid of compact "tool used" cards. Same
// shape as IterationGrid but with a smaller card variant — name +
// short description, no eyebrow. For listing the AI/tooling
// harness used during the build, or any other small-card list.
// ────────────────────────────────────────────────────────────────

export function HarnessGrid({ children }: { children: ReactNode }) {
  return (
    <div className="my-8 md:my-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {children}
    </div>
  );
}

export function HarnessFeature({
  name,
  children,
}: {
  name: string;
  children: ReactNode;
}) {
  return (
    <div className="case-glass flex flex-col gap-2 p-5 rounded-xl border border-[var(--border-default)]">
      <h3 className="m-0 text-[16px] font-semibold leading-[1.2] text-[var(--text-heading)]">
        {name}
      </h3>
      <p className="m-0 text-[14px] leading-[1.55] text-[var(--text-caption)]">
        {children}
      </p>
    </div>
  );
}

// ─── Metrics table ───────────────────────────────────────────────
//
// "Metric / 6mo ago / Now / Target" table, for outcome reporting.
// Renders as a 4-col grid on tablet+ and a stack of mobile cards
// on phones. Pass `nowTone: "down"` per row when the current
// number is the headline (italicized weight applies to "now").
//
// The column labels are hard-coded ("6mo ago / Now / Target")
// because that's the most common framing for product outcome
// tables. If a future case study needs different labels, copy
// this component and customize — it's small.
// ────────────────────────────────────────────────────────────────

export interface MetricRow {
  metric: string;
  was: string;
  now: string;
  target: string;
  nowTone?: "down" | "muted";
}

// Single source of truth for column metadata — drives both the
// desktop <table> header and the mobile stacked cards. The `key` is
// the field on MetricRow; the `label` is the visible column header.
const METRICS_COLUMNS = [
  { key: "was", label: "6mo ago" },
  { key: "now", label: "Now" },
  { key: "target", label: "Target" },
] as const satisfies ReadonlyArray<{
  key: keyof Pick<MetricRow, "was" | "now" | "target">;
  label: string;
}>;

export function MetricsTable({ rows }: { rows: MetricRow[] }) {
  const monoHeader = {
    fontFamily: "var(--font-mono), monospace",
  } as const;
  return (
    <div className="my-8 md:my-10">
      {/* Tablet + desktop — proper <table> with thead/th scope so
          screen readers announce row/column relationships. */}
      <table className="hidden md:table w-full border-collapse">
        <thead>
          <tr className="border-b border-[var(--border-default)]">
            <th
              scope="col"
              className="text-left text-[10px] uppercase tracking-[0.22em] font-normal text-[var(--text-disabled)] pb-3 pr-4 w-[40%]"
              style={monoHeader}
            >
              Metric
            </th>
            {METRICS_COLUMNS.map((col) => (
              <th
                key={col.key}
                scope="col"
                className="text-right text-[10px] uppercase tracking-[0.22em] font-normal text-[var(--text-disabled)] pb-3 pl-4 w-[20%]"
                style={monoHeader}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.metric}
              className="border-b border-[var(--border-default)] last:border-b-0"
            >
              <th
                scope="row"
                className="py-3 pr-4 text-left font-normal text-[15px] text-[var(--text-heading)]"
              >
                {row.metric}
              </th>
              <td className="py-3 pl-4 text-right text-[15px] text-[var(--text-disabled)]">
                {row.was}
              </td>
              <td
                className={`py-3 pl-4 text-right text-[15px] font-medium ${
                  row.nowTone === "down"
                    ? "text-[var(--text-heading)]"
                    : "text-[var(--text-caption)]"
                }`}
              >
                {row.now}
              </td>
              <td className="py-3 pl-4 text-right text-[15px] text-[var(--text-caption)]">
                {row.target}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Mobile — stacked cards driven by the same column config */}
      <div className="md:hidden flex flex-col gap-3">
        {rows.map((row) => (
          <div
            key={row.metric}
            className="px-4 py-3.5 rounded-xl border border-[var(--border-default)]"
          >
            <p className="m-0 mb-2 text-[15px] font-medium text-[var(--text-heading)]">
              {row.metric}
            </p>
            <div className="grid grid-cols-3 gap-3">
              {METRICS_COLUMNS.map((col) => (
                <div key={col.key} className="flex flex-col gap-1">
                  <p
                    className="m-0 text-[9px] uppercase tracking-[0.18em] text-[var(--text-disabled)]"
                    style={monoHeader}
                  >
                    {col.label}
                  </p>
                  <p
                    className={`m-0 text-[14px] ${
                      col.key === "now"
                        ? "font-medium text-[var(--text-heading)]"
                        : "text-[var(--text-caption)]"
                    }`}
                  >
                    {row[col.key]}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
