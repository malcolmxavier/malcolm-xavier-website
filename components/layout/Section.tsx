// ─────────────────────────────────────────────────────────────────
// Section — semantic <section> wrapper with vertical padding scaled
// to the token system. Use to mark page regions (hero, matrix,
// about teaser, contact). Optional `data-subbrand` flips the entire
// section to a sub-brand palette + display font.
//
// Optional <Kicker> + <Headline>-style title row can be passed via
// children rather than baked into props — keeps the API minimal and
// lets the page compose freely.
// ─────────────────────────────────────────────────────────────────

import type { HTMLAttributes } from "react";
import type { SubBrand } from "@/lib/sub-brands";

type SectionPadding = "sm" | "md" | "lg";

type SectionProps = HTMLAttributes<HTMLElement> & {
  /** Vertical padding intensity. Defaults to md. */
  padding?: SectionPadding;
  /** Sub-brand slug — flips fonts/accent palette for this region. */
  subbrand?: SubBrand;
  /** Render with a top border to separate from preceding content. */
  bordered?: boolean;
};

// Padding is split into top and bottom so adjacent sections
// produce uniform spacing around any divider:
//
//   • pt varies by size — sections OPEN with size-determined
//     breathing room (lg = generous, sm = tight). Useful for
//     hero/intro sections that want visual presence above their
//     content.
//   • pb is fixed at the "divider rhythm" value across all sizes.
//     Every section CLOSES with the same amount of space, so the
//     gap above any divider is constant.
//   • When bordered=true, pt is also overridden to the divider
//     rhythm value — so the space BELOW the divider matches the
//     space ABOVE it that the previous section just provided.
//
// Net result: divider rhythm is symmetric sitewide regardless of
// what padding sizes the adjacent sections chose. Tightened from
// the original (sm: 12/16, md: 16/24, lg: 24/32) on 2026-04-25.
const PADDING_TOP_BY_SIZE: Record<SectionPadding, string> = {
  sm: "pt-8 sm:pt-10",
  md: "pt-10 sm:pt-14",
  lg: "pt-14 sm:pt-20",
};
// Single "divider rhythm" value used for every section's pb and
// for any bordered section's pt. Matches md's standard padding so
// the rhythm reads as a deliberate page break — tighter than lg
// at the bottom but still generous enough to breathe.
const PADDING_DIVIDER_RHYTHM_TOP = "pt-10 sm:pt-14";
const PADDING_DIVIDER_RHYTHM_BOTTOM = "pb-10 sm:pb-14";

export function Section({
  padding = "md",
  subbrand,
  bordered = false,
  className = "",
  style,
  children,
  ...rest
}: SectionProps) {
  // When bordered, pt collapses to the divider rhythm so the gap
  // below the divider matches the gap above it (which any previous
  // section already provides via its uniform pb).
  const topClass = bordered
    ? PADDING_DIVIDER_RHYTHM_TOP
    : PADDING_TOP_BY_SIZE[padding];

  return (
    <section
      // data-subbrand is the lever that swaps --font-primary,
      // --font-secondary, and --primary-* color stops via the
      // alias blocks generated into globals.css.
      data-subbrand={subbrand}
      className={`${topClass} ${PADDING_DIVIDER_RHYTHM_BOTTOM} ${
        bordered ? "border-t" : ""
      } ${className}`}
      style={{
        ...(bordered ? { borderColor: "var(--border-default)" } : null),
        ...style,
      }}
      {...rest}
    >
      {children}
    </section>
  );
}
