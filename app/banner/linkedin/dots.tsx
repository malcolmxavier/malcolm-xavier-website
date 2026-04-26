// ─────────────────────────────────────────────────────────────────
// Shared dot system for the LinkedIn banner family.
//
// All banners in /banner/linkedin/* share two horizontal "dot bands"
// (top + bottom) decorating the canvas. The dots use the seven
// sub-brand colors from the design system, quietly telegraphing the
// breadth of Malcolm's sub-brand architecture (Newsletter / Film /
// TV / Music / Podcast / Games / Books) without naming them. A
// single source of truth here means every banner shares identical
// dot placement → the carousel feels like one family rather than
// five unrelated images.
//
// The metric banner needs to clear its bottom-left avatar zone, so
// BOTTOM_DOTS starts at x≥290. Manifesto and any future variants
// inherit the same constraint — LinkedIn applies the avatar overlap
// to every banner regardless of variant.
// ─────────────────────────────────────────────────────────────────

// LinkedIn's published spec for the profile cover banner.
export const BANNER_WIDTH = 1584;
export const BANNER_HEIGHT = 396;

// Sub-brand → CSS variable mapping. The banners are on a black
// background so we use the canonical `-500` brand swatch for every
// sub-brand — including the neon green and bright yellow that would
// have been invisible on white but pop against black.
export const SUB_BRAND_DOT_COLORS = {
  newsletter: "var(--green-500)",
  film: "var(--orange-500)",
  tv: "var(--blue-500)",
  music: "var(--purple-500)",
  podcast: "var(--pink-500)",
  games: "var(--red-500)",
  books: "var(--yellow-500)",
} as const;

export type DotColor = keyof typeof SUB_BRAND_DOT_COLORS;

export type Dot = {
  /** Pixel offset from the banner's left edge. */
  x: number;
  /** Pixel offset from the banner's top edge. */
  y: number;
  /** Which sub-brand swatch this dot pulls from. */
  color: DotColor;
};

// Hand-placed dots. Hand-placement (rather than algorithmic random
// jitter) keeps the result deterministic — no hydration mismatch
// between server and client renders, and no surprise rearranging
// after a hot reload. The placements aim for irregular spacing
// (not a grid) and never repeat the same color on adjacent dots so
// the band reads as "scattered confetti" rather than "rainbow stripe."
export const TOP_DOTS: Dot[] = [
  { x: 80, y: 14, color: "tv" },
  { x: 160, y: 24, color: "podcast" },
  { x: 245, y: 10, color: "newsletter" },
  { x: 325, y: 22, color: "film" },
  { x: 395, y: 12, color: "music" },
  { x: 475, y: 26, color: "books" },
  { x: 555, y: 8, color: "games" },
  { x: 635, y: 22, color: "tv" },
  { x: 710, y: 14, color: "podcast" },
  { x: 790, y: 24, color: "film" },
  { x: 870, y: 10, color: "music" },
  { x: 950, y: 20, color: "newsletter" },
  { x: 1025, y: 12, color: "tv" },
  { x: 1110, y: 26, color: "games" },
  { x: 1190, y: 14, color: "books" },
  { x: 1270, y: 22, color: "podcast" },
  { x: 1355, y: 8, color: "music" },
  { x: 1440, y: 18, color: "film" },
  { x: 1510, y: 12, color: "tv" },
];

// Bottom band starts at x ≥ 290 to stay clear of the avatar overlap
// zone in the lower-left of the banner.
export const BOTTOM_DOTS: Dot[] = [
  { x: 305, y: 380, color: "film" },
  { x: 380, y: 370, color: "music" },
  { x: 455, y: 386, color: "tv" },
  { x: 530, y: 372, color: "books" },
  { x: 605, y: 384, color: "newsletter" },
  { x: 680, y: 378, color: "podcast" },
  { x: 755, y: 372, color: "games" },
  { x: 830, y: 388, color: "music" },
  { x: 905, y: 378, color: "tv" },
  { x: 980, y: 370, color: "film" },
  { x: 1055, y: 386, color: "podcast" },
  { x: 1130, y: 374, color: "books" },
  { x: 1205, y: 384, color: "games" },
  { x: 1280, y: 370, color: "newsletter" },
  { x: 1355, y: 380, color: "tv" },
  { x: 1430, y: 372, color: "music" },
  { x: 1505, y: 388, color: "film" },
];

/**
 * Renders one band of decorative dots. Each dot is absolutely
 * positioned within the banner; aria-hidden because they're purely
 * decorative — assistive tech should skip them.
 */
export function DotBand({ dots }: { dots: readonly Dot[] }) {
  return (
    <>
      {dots.map((d, i) => (
        <span
          key={i}
          aria-hidden="true"
          style={{
            position: "absolute",
            left: `${d.x}px`,
            top: `${d.y}px`,
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: SUB_BRAND_DOT_COLORS[d.color],
          }}
        />
      ))}
    </>
  );
}
