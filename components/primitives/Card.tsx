// ─────────────────────────────────────────────────────────────────
// Card — the bordered surface block. Used for case-study tiles on
// Resume and (eventually) sub-brand matrix tiles on Landing.
//
// Two composition props:
//   accent        Optional sub-brand slug — adds a colored top stripe
//                 (8px) and pairs the card with the sub-brand's
//                 --primary-* palette, even if the surrounding page
//                 isn't sub-branded itself. Used by the matrix on
//                 landing where each tile flashes its destination.
//   padded        Defaults to true. Set false when the consumer wants
//                 to draw its own padding (e.g. media-edge cards).
//
// Cards are passive surfaces — they don't carry a card-wide hover or
// focus-within affordance. Several consumers have multiple links
// inside a single Card (e.g. case-study tiles on Resume, where the
// "Read the case study" link is paired with a "Visit the live
// project" link), which rules out the stretched-link pattern. The
// inner <Link> primitives carry their own hover and focus-visible
// styling, so click targets remain discoverable without the card
// pretending to be clickable as a whole.
// ─────────────────────────────────────────────────────────────────

import type { HTMLAttributes } from "react";
import type { SubBrand } from "@/lib/sub-brands";

type CardProps = HTMLAttributes<HTMLDivElement> & {
  accent?: SubBrand;
  padded?: boolean;
};

// Map sub-brand slug → CSS variable name for the 500-stop top stripe.
const ACCENT_VAR: Record<SubBrand, string> = {
  newsletter: "--green-500",
  film: "--orange-500",
  tv: "--blue-500",
  music: "--purple-500",
  games: "--red-500",
  books: "--yellow-500",
  podcast: "--pink-500",
};

export function Card({
  accent,
  padded = true,
  className = "",
  style,
  children,
  ...rest
}: CardProps) {
  return (
    <div
      // When accent is set, also flip the card's primary palette
      // via data-subbrand so children that use --primary-* / --accent-*
      // inherit the right color family.
      //
      // Side effect (intentional): the [data-subbrand] CSS rule in
      // app/components.css also flips font-family to the sub-brand
      // secondary font. Children that don't explicitly set
      // font-family will inherit Roboto Slab inside an accented
      // Card, regardless of the surrounding page context. The site's
      // typography primitives (Body, Headline, Display, Kicker)
      // override font-family inline so they're unaffected — but
      // unstyled children (raw <span>, native <button>, list
      // bullets) will pick up the sub-brand font. If you need a
      // recruiter-cluster font inside an accented Card, set
      // font-family explicitly on the child.
      data-subbrand={accent}
      className={[
        "relative overflow-hidden rounded-lg border",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      style={{
        background: "var(--surface-page)",
        borderColor: "var(--border-default)",
        ...style,
      }}
      {...rest}
    >
      {accent ? (
        // 8px colored stripe along the top edge of the card, pulled
        // from the sub-brand 500 stop. Decorative-only (aria-hidden).
        <div
          aria-hidden
          style={{
            height: 8,
            background: `var(${ACCENT_VAR[accent]})`,
          }}
        />
      ) : null}
      <div className={padded ? "p-6 sm:p-8" : ""}>{children}</div>
    </div>
  );
}
