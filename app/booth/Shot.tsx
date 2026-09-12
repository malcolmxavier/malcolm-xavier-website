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
/* Section separation on this page is whitespace and nothing else — the
   hairlines came out with the eyebrows, and the site's divider rhythm came
   with them: 112px of nothing between sections, against 24px between the rows
   inside one. A reader met five slabs rather than one argument. These pull the
   break to twice the internal row rhythm, which is enough to read as a new
   section and little enough that the page holds together. Scoped to this
   page's own wrapper, because the rhythm elsewhere on the site still has a
   rule drawn through it and needs the room.

   The hero keeps the site's standard opening pad: what sits above it is the
   nav, not another section, and that gap is a different measurement. */
.booth-brand > section {
  padding-top: var(--scale-700);
  padding-bottom: var(--scale-700);
}
.booth-brand > section#top { padding-top: var(--scale-800); }
@media (min-width: 40rem) {
  .booth-brand > section {
    padding-top: var(--scale-800);
    padding-bottom: var(--scale-800);
  }
  .booth-brand > section#top { padding-top: var(--scale-1000); }
}
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
   the middle of the row carries the weight the card does. */
.booth-brand {
  --booth-green: color-mix(in srgb, var(--green-500) 16%, transparent);
  --booth-blue: color-mix(in srgb, var(--blue-500) 14%, transparent);
  --booth-orange: color-mix(in srgb, var(--orange-500) 15%, transparent);
  --booth-green-wash: color-mix(in srgb, var(--green-500) 28%, transparent);
  --booth-blue-wash: color-mix(in srgb, var(--blue-500) 24%, transparent);
  --booth-orange-wash: color-mix(in srgb, var(--orange-500) 28%, transparent);
}
[data-theme="dark"] .booth-brand {
  --booth-green: color-mix(in srgb, var(--green-400) 17%, transparent);
  --booth-blue: color-mix(in srgb, var(--blue-300) 22%, transparent);
  --booth-orange: color-mix(in srgb, var(--orange-400) 15%, transparent);
  --booth-green-wash: color-mix(in srgb, var(--green-400) 26%, transparent);
  --booth-blue-wash: color-mix(in srgb, var(--blue-300) 32%, transparent);
  --booth-orange-wash: color-mix(in srgb, var(--orange-400) 30%, transparent);
}

/* The wash sits on the content row, not on the section wrapper, so it
   lands under the claim-and-screen pair and leaves the section's own
   heading on clean page. It is drawn by a pseudo-element rather than as a
   background on the row itself, because it has to bleed past the row's box
   — out to the container's own edge horizontally, and past the top and
   bottom — and a row cannot be given that much padding without moving the
   content inside it.

   Two directions, two mechanisms, because they are asked to do opposite
   things. Across, the colour is the point: it starts at the text side and
   thins to nothing at the far margin, so it runs left-to-right where the
   prose is on the left and right-to-left where it is on the right, and what
   meets the opposite edge is the page's own background. That is the
   gradient. Down, there is no story to tell — the colour should simply be
   on the row, top to bottom — so the vertical treatment is a mask rather
   than a second gradient, and all it does is soften the last few pixels at
   each end.

   This replaced an ellipse that faded in all four directions at once. It
   held the horizontal reading, but it also meant every row's colour was
   strongest through the middle and gone at the top and bottom, so each
   section read as a lens of colour floating on a dark page rather than as
   a page with colour on it.

   The softening is spent entirely outside the row, and it is measured in
   rem rather than as a percentage of the box. Both follow from where the
   colour has to stop. A percentage is a different length on every row,
   because a row with a screenshot in it is several times the height of one
   without, so one rule softened sixty pixels here and twenty there. A fixed
   length is the same edge everywhere.

   That length is exactly half the 24px gap between stacked rows, which is
   what keeps one row's colour out of the next one's. Each fades to nothing
   at the midpoint of the gap, so neighbours meet rather than run together
   and four stacked rows read as four rows instead of as one long smear —
   the separation between them is the colour stopping, which is why the page
   needs no rule drawn through it. Because all of that happens beyond the
   row's own box, the full-strength band covers every pixel of the content:
   a row's top and bottom edges are as coloured as its middle.

   The horizontal bleed matches Container's own padding at each breakpoint
   (px-6 / sm:px-10 / lg:px-16), so the wash spans the full content column
   and stops exactly at its edge — never wider, which would put a scrollbar
   on the page. */
.booth-tint {
  position: relative;
  /* Makes the row its own stacking context, so the z-index below is
     behind this row's content and can never fall behind the page. */
  isolation: isolate;
}
.booth-tint::before {
  content: "";
  position: absolute;
  z-index: -1;
  pointer-events: none;
  inset-block: -0.75rem;
  inset-inline: -1.5rem;
  background-image: linear-gradient(
    to var(--booth-tint-dir, right),
    var(--booth-tint, transparent) 0%,
    transparent 92%
  );
  -webkit-mask-image: linear-gradient(
    to bottom,
    transparent 0,
    #000 0.75rem,
    #000 calc(100% - 0.75rem),
    transparent 100%
  );
  mask-image: linear-gradient(
    to bottom,
    transparent 0,
    #000 0.75rem,
    #000 calc(100% - 0.75rem),
    transparent 100%
  );
}
@media (min-width: 40rem) {
  .booth-tint::before { inset-inline: -2.5rem; }
}
@media (min-width: 64rem) {
  .booth-tint::before { inset-inline: -4rem; }
}
/* Text on the right, so the colour starts on the right and runs left. */
.booth-tint--right { --booth-tint-dir: left; }
.booth-tint--green { --booth-tint: var(--booth-green-wash); }
.booth-tint--blue { --booth-tint: var(--booth-blue-wash); }
.booth-tint--orange { --booth-tint: var(--booth-orange-wash); }
.booth-shot-dark { display: none; }
[data-theme="dark"] .booth-shot-dark { display: block; }
[data-theme="dark"] .booth-shot-light { display: none; }
`,
      }}
    />
  );
}
