// ─────────────────────────────────────────────────────────────────
// TierColumn — one column of the three-tier enablement diagram in
// Beat 04 of the People Inc. case study. Co-located with the
// case study rather than living in components/case-study/primitives.tsx
// because it has a single consumer; the shared-primitive bar is
// "used by 2+ case studies," and this isn't there yet.
//
// Extracted from what was ~175 lines of repeated inline structure
// across three near-identical columns. Caption is ReactNode so
// HTML entities (—, &nbsp;, ’) and inline elements can
// be passed through; tier is ReactNode for the same reason
// ("Tier&nbsp;01" needs entity decoding that JSX prop strings
// don't provide).
//
// The tier-label row uses tracking-[0.22em] matching the sitewide
// CaseStudyKicker convention — previously 0.18em + opacity-70,
// which compounded dimming on --text-caption and dropped legibility
// to ~3.1:1 on small uppercase mono. Dropping opacity-70 and using
// --text-caption directly puts the tier label at the same contrast
// as every other 10px eyebrow on the page.
// ─────────────────────────────────────────────────────────────────

import type { ReactNode } from "react";

export function TierColumn({
  label,
  tier,
  subtitle,
  caption,
  isLast,
  children,
}: {
  label: string;
  tier: ReactNode;
  subtitle: string;
  caption: ReactNode;
  isLast?: boolean;
  children: ReactNode;
}) {
  const borderClasses = isLast
    ? ""
    : "border-b md:border-b-0 md:border-r border-[var(--border-default)]";
  return (
    <div className={`p-5 md:p-6 ${borderClasses} flex flex-col`}>
      <div className="flex items-baseline justify-between gap-3">
        <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--text-caption)]">
          {label}
        </div>
        <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--text-caption)]">
          {tier}
        </div>
      </div>
      <div className="mt-1 text-[12px] text-[var(--text-caption)]">
        {subtitle}
      </div>
      {children}
      <p className="m-0 mt-3 text-[12px] leading-[1.5] text-[var(--text-caption)]">
        {caption}
      </p>
    </div>
  );
}
