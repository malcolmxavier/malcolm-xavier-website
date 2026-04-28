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

// Tightened from the original (sm: 12/16, md: 16/24, lg: 24/32) on
// 2026-04-25 — the previous values inflated scroll length without
// earning their keep, especially on landing where multiple stacked
// sections compounded the negative space. New values keep editorial
// breathing room without burning visual real estate.
const PADDING_CLASSES: Record<SectionPadding, string> = {
  sm: "py-8 sm:py-10",
  md: "py-10 sm:py-14",
  lg: "py-14 sm:py-20",
};

export function Section({
  padding = "md",
  subbrand,
  bordered = false,
  className = "",
  style,
  children,
  ...rest
}: SectionProps) {
  return (
    <section
      // data-subbrand is the lever that swaps --font-primary,
      // --font-secondary, and --primary-* color stops via the
      // alias blocks generated into globals.css.
      data-subbrand={subbrand}
      className={`${PADDING_CLASSES[padding]} ${
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
