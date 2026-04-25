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

type SectionPadding = "sm" | "md" | "lg";

type SectionProps = HTMLAttributes<HTMLElement> & {
  /** Vertical padding intensity. Defaults to md. */
  padding?: SectionPadding;
  /** Sub-brand slug — flips fonts/accent palette for this region. */
  subbrand?:
    | "newsletter"
    | "film"
    | "tv"
    | "music"
    | "games"
    | "books"
    | "podcast";
  /** Render with a top border to separate from preceding content. */
  bordered?: boolean;
};

const PADDING_CLASSES: Record<SectionPadding, string> = {
  sm: "py-12 sm:py-16",
  md: "py-16 sm:py-24",
  lg: "py-24 sm:py-32",
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
