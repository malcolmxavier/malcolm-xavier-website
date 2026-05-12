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
// "Liquid Glass"-style treatment. The rules live in
// components/case-study/case-glass.css. Case studies opt in by
// importing that file from their layout (see basecamp-coffee for
// the canonical example). Studies that want flat cards simply omit
// the import — the className is a harmless no-op when the rules
// aren't loaded, and the cards render as rounded bordered surfaces.
//
// Radius tier: every case-study card surface uses `rounded-[22px]`
// (a feature-card radius distinct from the utility 8px on the site
// Card primitive and the 6px on inline Code chips). One tier per
// card category — don't introduce a fourth in this file without a
// matching token.
// ─────────────────────────────────────────────────────────────────

import type { ReactNode } from "react";
import { Kicker } from "@/components/typography/Kicker";

// ─── Article width rail ─────────────────────────────────────────
//
// Single source of truth for the case-study reading column. Hero
// + Beat sections all sit on the same horizontal grid (560px → 880
// → 1024 with matching horizontal padding); previously these magic
// numbers were duplicated across Hero.tsx and primitives.tsx.
// Vertical padding stays per-section since Hero / Beat / etc. each
// want their own rhythm.
//
// Usage: `className={`${CASE_STUDY_WIDTH} scroll-mt-28 pt-9 pb-6`}`
// in any case-study section wrapper.
// ────────────────────────────────────────────────────────────────
export const CASE_STUDY_WIDTH =
  "mx-auto max-w-[560px] px-7 md:max-w-[880px] md:px-10 lg:max-w-[1024px]";

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
// Color is fixed at --text-caption sitewide. We previously had a
// `tone="muted"` variant that resolved to --text-disabled for
// metadata kickers (e.g. "10 min read · Updated …"), but
// --text-disabled (#cdd1cd light, ~1.54:1 against white) is meant
// for inactive form controls and fails WCAG 1.4.3 (AA, 4.5:1) when
// used for readable text. The visual differentiation lived in color
// alone, so collapsing both branches to --text-caption costs nothing
// and clears the contrast failure. If we want metadata kickers to
// read quieter again later, lean on a non-color treatment (alignment,
// scale, italics) that can pass AA on its own.
// ────────────────────────────────────────────────────────────────

export function CaseStudyKicker({
  children,
  className,
  as,
}: {
  children: ReactNode;
  className?: string;
  /** Heading tag for the kicker. Defaults to <p> (decorative
   *  eyebrow). Pass "h2" / "h3" / "h4" when the kicker also serves
   *  as the accessible name + heading-nav anchor for a section
   *  landmark — e.g. the TL;DR section's "If you're skimming" or
   *  the end-of-article ExploreCTAGrid's "See it in action," where
   *  the kicker IS the section's accessible name and skim readers
   *  reach it via the H key. Forwarded directly to the underlying
   *  Kicker primitive. */
  as?: "p" | "h2" | "h3" | "h4";
}) {
  return (
    <Kicker
      as={as}
      className={`m-0 ${className ?? ""}`}
      style={{
        // 11px is one step below --p-xs-font-size (12px) — an
        // intentional editorial-magazine choice for case-study
        // eyebrows. The wider 0.22em tracking (vs the standard
        // 0.08em) compensates for the smaller cap height so the
        // kicker still reads as a label, not body micro-copy.
        fontSize: "11px",
        letterSpacing: "0.22em",
        color: "var(--text-caption)",
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
  // Width is derived: max(Beat width) − 2 × Beat horizontal padding.
  // Beat uses (560 / px-7=28), (880 / px-10=40), (1024 / px-10=40),
  // so the separator should be (560-56=504), (880-80=800),
  // (1024-80=944). Expressed with calc() so the relationship is
  // visible to a future reader rather than three magic-number pairs.
  return (
    <hr
      className="mx-auto mb-[18px] h-px border-0 max-w-[calc(560px-2*28px)] md:max-w-[calc(880px-2*40px)] lg:max-w-[calc(1024px-2*40px)] w-[calc(100%-2*28px)] md:w-[calc(100%-2*40px)]"
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
      className={`${CASE_STUDY_WIDTH} scroll-mt-28 pt-6 pb-6 md:pt-9 md:pb-9`}
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
      <h2 className="m-0 mb-6 md:mb-8 text-[40px] md:text-[52px] lg:text-[60px] leading-[1.05] tracking-[-0.02em] text-[var(--text-heading)]">
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
  // Pin to Instrument Serif rather than var(--font-primary) so this
  // emphasis style stays a serif italic regardless of cluster. On a
  // sub-brand case study (Music → Roboto Mono primary), italicizing
  // the cluster's mono font is wonky — italic monospace mixes
  // poorly with the surrounding Roboto Slab body copy. Pinning to
  // Instrument Serif keeps the editorial-italic voice intact at
  // every surface.
  //
  // `italic-inline` (defined in app/components.css) compensates
  // for italic serif's right-lean crowding the following roman
  // word, and turns kerning + ligature features on explicitly.
  // The class is shared with the resume headline italic suffixes
  // and the Basecamp drink-archetype span — every site where
  // serif italic runs inline beside roman body.
  return (
    <span
      className="italic-inline text-[var(--text-heading)]"
      style={{
        fontFamily: "var(--font-instrument-serif)",
        fontStyle: "italic",
      }}
    >
      {children}
    </span>
  );
}

export function Code({ children }: { children: ReactNode }) {
  // Background lives in app/components.css (`.code-chip`) as a
  // theme-aware rule rather than a Tailwind arbitrary class. The
  // earlier inline `bg-[color-mix(...,_6%,_transparent)]` was too
  // soft to read in dark mode — white-text-on-faint-white-tint
  // sat at near-zero contrast against the chip surface. The class
  // bumps to 14% light / 26% dark and lives sitewide so a future
  // MDX or blog surface inherits the same treatment.
  return (
    <code
      className="code-chip text-[14px] md:text-[15px] px-1.5 py-0.5 rounded-[6px] text-[var(--text-heading)]"
      style={{ fontFamily: "var(--font-mono)" }}
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
        // `italic-kern` (defined in app/components.css) forces
        // explicit kern + liga features and optimizeLegibility so
        // italic Instrument Serif at display size doesn't read as
        // crowded against punctuation and word boundaries. Removed
        // the previous `tracking-[-0.005em]` because the negative
        // tracking amplified the same crowding it was trying to
        // mask.
        className="italic-kern m-0 text-[22px] md:text-[28px] leading-[1.3] text-[var(--text-heading)]"
        style={{
          fontFamily: "var(--font-primary)",
          fontStyle: "italic",
        }}
      >
        &ldquo;{children}&rdquo;
      </blockquote>
      <figcaption
        className="mt-3 text-[11px] uppercase tracking-[0.22em] text-[var(--text-caption)]"
        style={{ fontFamily: "var(--font-mono)" }}
      >
        {/* Em-dash is a typographic convention, not meaningful
            content. aria-hidden so screen readers don't announce
            "dash, attribution-text" on every pull quote. */}
        <span aria-hidden="true">— </span>
        {attribution}
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
  // Body wrapper is a <div>, not a <p>, so callers can pass block
  // content (lists, multiple paragraphs) without producing invalid
  // <ul>-inside-<p> markup. Tailwind classes on the wrapper still
  // drive the typography and color, and existing inline-span
  // patterns (e.g. <span className="block mt-3">) keep working
  // because spans nest fine inside a div.
  return (
    <div className="my-8 md:my-10 pl-4 md:pl-5 border-l-[2px] border-[var(--border-default)]">
      <p
        className="m-0 mb-2 text-[10px] uppercase tracking-[0.22em] text-[var(--text-caption)]"
        style={{ fontFamily: "var(--font-mono)" }}
      >
        {kicker}
      </p>
      <div className="m-0 text-[15px] md:text-[16px] leading-[1.55] text-[var(--text-caption)]">
        {children}
      </div>
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
        style={{ fontFamily: "var(--font-mono)" }}
      >
        {eyebrow}
      </p>
      <p className="m-0 text-[56px] md:text-[68px] lg:text-[80px] leading-none tracking-[-0.03em] text-[var(--text-heading)]">
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
        style={{ fontFamily: "var(--font-mono)" }}
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
        style={{ fontFamily: "var(--font-mono)" }}
      >
        {metric}
      </p>
      <p className="m-0 text-[32px] md:text-[36px] leading-none tracking-[-0.02em] text-[var(--text-heading)]">
        {threshold}
      </p>
      <p className="m-0 text-[13px] leading-[1.4] text-[var(--text-caption)]">
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
        style={{ fontFamily: "var(--font-mono)" }}
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
    <div className="case-glass flex flex-col gap-2 p-5 rounded-[22px] border border-[var(--border-default)]">
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
    fontFamily: "var(--font-mono)",
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
              className="text-left text-[10px] uppercase tracking-[0.22em] font-normal text-[var(--text-caption)] pb-3 pr-4 w-[40%]"
              style={monoHeader}
            >
              Metric
            </th>
            {METRICS_COLUMNS.map((col) => (
              <th
                key={col.key}
                scope="col"
                className="text-right text-[10px] uppercase tracking-[0.22em] font-normal text-[var(--text-caption)] pb-3 pl-4 w-[20%]"
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
              <td className="py-3 pl-4 text-right text-[15px] text-[var(--text-caption)]">
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
            className="px-4 py-3.5 rounded-[22px] border border-[var(--border-default)]"
          >
            <p className="m-0 mb-2 text-[15px] font-medium text-[var(--text-heading)]">
              {row.metric}
            </p>
            <div className="grid grid-cols-3 gap-3">
              {METRICS_COLUMNS.map((col) => (
                <div key={col.key} className="flex flex-col gap-1">
                  <p
                    className="m-0 text-[10px] uppercase tracking-[0.18em] text-[var(--text-caption)]"
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
