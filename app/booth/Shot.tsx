// ─────────────────────────────────────────────────────────────────
// Shot — a product screenshot on the /booth landing page.
//
// WHY A COMPONENT. Every screenshot on this page exists twice, once
// per theme, because the Booth is a dark-first surface and a light
// page showing only dark captures reads as a page assembled out of
// whatever was lying around. The site stamps `data-theme` on <html>
// (next-themes, attribute="data-theme"), so the swap is pure CSS and
// needs no client component and no hydration.
//
// The rules live in one <style> block emitted by ShotStyles, which
// the page renders once. Putting them here rather than in globals.css
// is deliberate: globals.css is generated from the token JSON and is
// never hand-edited.
// ─────────────────────────────────────────────────────────────────

import Image from "next/image";

// The captures are 1440x900 CSS pixels taken at 2x, so the intrinsic
// size is double. Passing the real intrinsic size lets Next reserve
// the right aspect ratio and stops the page reflowing as they load.
const SHOT_WIDTH = 2880;
const SHOT_HEIGHT = 1800;

type ShotProps = {
  /** Basename of the pair in /public/booth-shots, without the theme suffix. */
  name: string;
  /** What the screenshot shows. Written for somebody who cannot see it. */
  alt: string;
  /** Optional line under the frame. Use it to name what to look at. */
  caption?: string;
  /** Set on the one screenshot above the fold so it preloads. */
  preload?: boolean;
  /** Width hint for the responsive srcset. */
  sizes?: string;
};

export function Shot({
  name,
  alt,
  caption,
  preload = false,
  sizes = "(min-width: 1024px) 62rem, 100vw",
}: ShotProps) {
  return (
    <figure className="booth-shot m-0">
      <div className="booth-shot-frame">
        {(["light", "dark"] as const).map((theme) => (
          <Image
            key={theme}
            className={`booth-shot-img booth-shot-${theme}`}
            src={`/booth-shots/${name}-${theme}.png`}
            // Only one of the pair is ever visible, so only one carries
            // the description. The hidden twin is decorative by
            // definition and an empty alt keeps it out of the tree.
            alt={theme === "dark" ? "" : alt}
            aria-hidden={theme === "dark" ? true : undefined}
            width={SHOT_WIDTH}
            height={SHOT_HEIGHT}
            sizes={sizes}
            preload={preload}
          />
        ))}
      </div>
      {caption ? (
        <figcaption
          className="mt-3 text-center"
          style={{
            color: "var(--text-caption)",
            fontSize: "var(--p-sm-font-size)",
          }}
        >
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}

/**
 * The stylesheet for every Shot on the page. Rendered once.
 *
 * The dark capture is hidden by default rather than the light one so a
 * viewer whose theme attribute never arrives — no JavaScript, or a
 * crawler — still sees a screenshot instead of an empty frame.
 */
export function ShotStyles() {
  return (
    <style
      dangerouslySetInnerHTML={{
        __html: `
.booth-shot-frame {
  position: relative;
  overflow: hidden;
  border: 1px solid var(--border-default);
  border-radius: 10px;
  background: var(--surface-muted);
  line-height: 0;
}
.booth-shot-img { width: 100%; height: auto; display: block; }
/* A 1440px-wide capture scaled into a 350px column is texture rather than a
   screenshot. Under the breakpoint the frame scrolls sideways instead, at a
   width the interface is still readable at — the same treatment any wide
   table or diagram gets, and it keeps the page itself from scrolling. */
@media (max-width: 48rem) {
  .booth-shot-frame { overflow-x: auto; -webkit-overflow-scrolling: touch; }
  .booth-shot-img { width: 46rem; max-width: none; }
}
/* The screenshot rows run two-up from 64rem: the claim on one side, the screen
   it is a claim about on the other, and the sides swap from row to row so the
   page reads as a sequence rather than as a stack of identical slabs. The rule
   lives here rather than in the Grid component because Grid splits at 40rem,
   and two 20rem columns render a 1440px capture as texture rather than as a
   screenshot. Below 64rem every row is a single column, where the shot takes
   the full measure — the only width this capture stays readable at.

   The swap is done by assigning grid columns, never by reordering the markup.
   The prose always comes first in the DOM, so a screen reader and a keyboard
   meet the claim before the picture of it whichever side the picture is on.

   Top-aligned, which puts the heading level with the top edge of the screen it
   names. A 1440x900 capture at this column width is about two and a half times
   the height of the paragraphs beside it, so there is space left over in the
   text column either way; under the prose it reads as the gap before the next
   row, and centred it reads as a heading floating in the middle of nothing. */
.booth-surface { display: grid; gap: var(--scale-500); align-items: start; }
/* Grid items default to min-width: auto, so a column is never allowed to be
   narrower than its own min-content. Under 48rem the capture is 46rem wide
   inside its own scroller, which made that min-content 46rem and pushed the
   whole page sideways at every phone width. Zero lets the column take the
   measure it is given and leaves the scrolling to the frame. */
.booth-surface > * { min-width: 0; }
@media (min-width: 64rem) {
  .booth-surface {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1.05fr);
    gap: var(--scale-600);
  }
  .booth-surface--flip {
    grid-template-columns: minmax(0, 1.05fr) minmax(0, 1fr);
  }
  .booth-surface--flip > :first-child { grid-column: 2; grid-row: 1; }
  .booth-surface--flip > :last-child { grid-column: 1; grid-row: 1; }
}
/* ─── The well ──────────────────────────────────────────────────────
   This page does not sit in the site's shared 80rem rail, and it is the
   only one that does not. Everywhere else that rail is what lines the
   header, the footer, and every page up against each other, and it is
   right for a page that is a document. This page is a wall of colour,
   and colour stopped short of the window frames each band as a slide on
   a page rather than as a surface — the dark margin is what does it, and
   no amount of tuning inside the band fixes something happening outside
   it. So there is no wrapper holding a width here: the page is as wide
   as the window, and each band pads its own content in.

   Two numbers do that. The gutter is the smallest space allowed between
   text and the window edge, and it is Container's own padding at each
   breakpoint (px-6 / sm:px-10 / lg:px-16), so a phone reading this page
   gets exactly the margin it gets everywhere else on the site. The well
   is what the content is allowed to grow to once there is more room than
   that, and it is wider than the site's rail because the evidence on this
   page is screenshots: a 1440px capture beside a paragraph is an argument
   at 46rem and a texture at 30rem. Prose is unaffected — the single-column
   sections still set to their own measure, which the well never touches.

   max() is what picks between them: below the well plus two gutters the
   gutter wins and the band is edge-to-edge with a margin, and above it the
   half-difference wins and the content centres. No vw anywhere, so a
   scrollbar can never push the page sideways. */
.booth-brand {
  --booth-well: 96rem;
  --booth-gutter: 1.5rem;
}
@media (min-width: 40rem) {
  .booth-brand { --booth-gutter: 2.5rem; }
}
@media (min-width: 64rem) {
  .booth-brand { --booth-gutter: 4rem; }
}
/* Vertical rhythm on this page belongs to the bands below, not to the
   sections that hold them. A section's own padding is space no band can
   reach, and on a page whose content is coloured that space is a black
   stripe drawn across the screen at every join — the reader takes the
   stripe for the design. So the padding is zeroed here and each band
   carries its own instead. The break itself is unchanged: two bands
   meeting contribute one pad each, which is the same distance the
   sections used to hold open between them.

   Scoped to this page's own wrapper, because sections elsewhere on the
   site still separate themselves with room and a rule. Unlayered, so it
   beats the Tailwind padding utilities Section emits. */
.booth-brand > section { padding-block: 0; }
/* ─── Colour ────────────────────────────────────────────────────────
   Three hues, borrowed from the site's own sub-brand palette rather than
   invented for this page: green (the newsletter's), blue (television's),
   and orange (film's). Three and not seven, because a landing page needs a
   palette a reader can hold, and these three are the balanced set — one
   cool anchor, one cool secondary, one warm counterweight. Green leads
   because green is already the Booth's accent, and it is the one hue used
   three times: the hero, the pipeline row, and the ask for a login, which
   are the page's opening claim, its strongest claim, and its close.

   Note the different mix percentages. The ramps are not equal-lightness —
   the green stop is a near-neon and the blue stop is close to navy — so an
   identical percentage across all three would put a mint wash beside a
   slate one. These are tuned to carry the same weight, not the same number.

   Light takes the 500 stop (the same stop Card's accent stripe uses) and
   dark takes a lighter one: a wash needs a colour that survives its
   background, which is the mirror of what --booth-accent does for text.

   Two values per hue, because a fill and a wash are seen differently. A
   card is its colour edge to edge, so the fill is the value a reader
   actually gets. A wash is a peak that is already half gone by the time it
   reaches the screenshot beside it, so the same number arrives as a stain
   rather than as a colour — the wash values are the fills pushed up until
   the middle of the row carries the weight the card does.

   The fill mixes into the page's own surface rather than into transparency,
   which makes it opaque. It looks identical against the bare page, and the
   difference matters in one place: the three cards carrying these fills now
   sit on a coloured band of their own, and a translucent fill would let that
   band through and shift all three at once. A legend has to be the colour it
   is naming. */
.booth-brand {
  --booth-green: color-mix(in srgb, var(--green-500) 16%, var(--surface-page));
  --booth-blue: color-mix(in srgb, var(--blue-500) 14%, var(--surface-page));
  --booth-orange: color-mix(in srgb, var(--orange-500) 15%, var(--surface-page));
  --booth-green-wash: color-mix(in srgb, var(--green-500) 28%, transparent);
  --booth-blue-wash: color-mix(in srgb, var(--blue-500) 24%, transparent);
  --booth-orange-wash: color-mix(in srgb, var(--orange-500) 28%, transparent);
}
[data-theme="dark"] .booth-brand {
  --booth-green: color-mix(in srgb, var(--green-400) 17%, var(--surface-page));
  --booth-blue: color-mix(in srgb, var(--blue-300) 22%, var(--surface-page));
  --booth-orange: color-mix(in srgb, var(--orange-400) 15%, var(--surface-page));
  --booth-green-wash: color-mix(in srgb, var(--green-400) 26%, transparent);
  --booth-blue-wash: color-mix(in srgb, var(--blue-300) 32%, transparent);
  --booth-orange-wash: color-mix(in srgb, var(--orange-400) 30%, transparent);
}

/* ─── The band ─────────────────────────────────────────────
   A band is one horizontal slab of this page: its own padding, its own hue,
   and a wash that starts on the side its text is on and thins to nothing at
   the far margin. The page is a stack of them and they touch — a band ends
   exactly where the next one begins, and the argument it makes ends with the
   button that asks for a login, inside the colour rather than below it.

   Touching is the whole point. Any space left between two coloured slabs is
   a black stripe the width of the page, and a reader takes a stripe for a
   deliberate divider. That is why the sections above are zero-padded: a gap
   is only ever the sum of two bands' own padding, which is space that has
   colour on it.

   A band with no hue modifier is still a band. It takes the same padding and
   draws a transparent gradient, which costs a paint and buys the one thing
   the page needs from it: the rhythm stays identical whether or not a slab
   is tinted, so an untinted band is a rest in the colour rather than a hole
   in the spacing.

   The two directions are asked to do opposite things, and only one of them
   gets a gradient. Across, the colour is the point: it starts at the text
   side and thins to nothing at the far margin, so it runs left-to-right
   where the prose is on the left and right-to-left where it is on the
   right, and what meets the opposite edge is the page's own background.
   Down, the edge is the point, and it is hard. A band's wash fills its box
   exactly — no bleed past it, no softening at either end — so where two
   bands meet, one hue stops and the next starts on the same pixel row.

   An earlier cut faded each band out over 2rem and drew it 1rem past its
   box, on the reasoning that two half-strength ramps centred on the join
   sum back to one band's worth of colour. The arithmetic is right and it is
   the wrong thing to want: what it makes is a soft handover, and read down
   the page a soft handover is a smear rather than a join. The hard edge is
   what separates one argument from the next, and it costs nothing to get —
   it is the absence of the mask, not a rule drawn on top of one. Softening
   and bleed are therefore a matched pair: either both or, as here, neither.

   Across, the wash now has no inset at all, because the band it fills is
   the width of the window. An earlier cut drew it out past the band by
   exactly Container's padding, which was the right arithmetic for a page
   sitting in the site's rail and is simply unnecessary once the rail is
   gone: the band's own padding is what holds the content in, so the box
   the wash fills already reaches both window edges. The colour therefore
   peaks at the edge of the screen rather than at the edge of a column,
   which is the difference between a page about a product and a surface. */
.booth-band {
  position: relative;
  /* Makes the band its own stacking context, so the z-index below is
     behind this band's content and can never fall behind the page. */
  isolation: isolate;
  padding-block: var(--scale-600);
  padding-inline: max(
    var(--booth-gutter),
    calc((100% - var(--booth-well)) / 2)
  );
}
@media (min-width: 40rem) {
  .booth-band { padding-block: var(--scale-700); }
}
/* The opening band sits under the nav rather than under another band, and
   that is a different measurement: it takes the site's standard opening pad
   instead of half a section break. */
.booth-brand > section#top > .booth-band { padding-top: var(--scale-800); }
@media (min-width: 40rem) {
  .booth-brand > section#top > .booth-band { padding-top: var(--scale-1000); }
}
.booth-band::before {
  content: "";
  position: absolute;
  z-index: -1;
  pointer-events: none;
  inset-block: 0;
  inset-inline: 0;
  background-image: linear-gradient(
    to var(--booth-band-dir, right),
    var(--booth-band-hue, transparent) 0%,
    transparent 92%
  );
}
/* Text on the right, so the colour starts on the right and runs left. */
.booth-band--right { --booth-band-dir: left; }
.booth-band--green { --booth-band-hue: var(--booth-green-wash); }
.booth-band--blue { --booth-band-hue: var(--booth-blue-wash); }
.booth-band--orange { --booth-band-hue: var(--booth-orange-wash); }
.booth-shot-dark { display: none; }
[data-theme="dark"] .booth-shot-dark { display: block; }
[data-theme="dark"] .booth-shot-light { display: none; }
`,
      }}
    />
  );
}
