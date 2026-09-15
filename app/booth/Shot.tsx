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

// The captures are 1152x720 CSS pixels taken at 2.5x, cropped in past the
// Booth's nav bar and sync indicator so the view itself fills the frame, which
// makes the intrinsic size 2880x1800. Passing the real intrinsic size lets Next reserve
// the right aspect ratio and stops the page reflowing as they load.
const SHOT_WIDTH = 2880;
const SHOT_HEIGHT = 1800;

type ShotProps = {
  /** Basename of the pair in /public/booth-shots, without the theme suffix. */
  name: string;
  /** What the screenshot shows. Written for somebody who cannot see it. */
  alt: string;
  /** Extra description of the frame. Never visible: crawlers and screen readers only. */
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
        // Hidden from sight on purpose. The prose beside the frame
        // already names the view, and a visible line under every
        // screenshot restated it. The text stays in the document
        // because the two readers who cannot see the image — a crawler
        // and a screen reader — are the ones it was written for.
        <figcaption className="sr-only">{caption}</figcaption>
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
/* --booth-shot-edge rather than --border-default, which is the one place
   this page needs a stronger rung than the rest of the site. A screenshot
   here is almost always a light interface sitting on a tinted band, and in
   light mode --border-default lands within a shade of the wash it is drawn
   on: the border is there, and you cannot see it. That costs nothing on a
   framed exhibit, and it costs the hero its whole alignment — the capture
   is cropped flush with the bottom of the buttons beside it, so if the
   edge does not read, the eye falls back on wherever the screenshot's own
   content happens to stop, which is several pixels higher and different in
   every column. Dark already reads and keeps the semantic token.

   --neutral-700 rather than the 600 that first fixed it: 600 clears the
   wash by 2.3:1 and 700 by 3.9:1, and since the whole point of the edge
   is that a reader can locate it, it should clear the 3:1 that non-text
   contrast is held to. The two are a shade apart at full size. */
.booth-shot-frame {
  position: relative;
  overflow: hidden;
  border: 1px solid var(--booth-shot-edge);
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
/* ── Prose that has to hold its own beside something ──────────────────
   Two custom properties rather than a font-size rule, because the type
   primitives set their size inline and a stylesheet cannot outrank an
   inline style without !important. The prose that reads them declares it
   at the call site, so nothing here can reach text that did not ask.

   Worn by the surface rows, where the other half of the row is a
   screenshot, and by the ask at the foot of the page, where it is a
   sign-in card. Same problem in both: a block of 16px paragraphs beside
   a tall object reads as a caption on it rather than as the half that
   makes the claim.

   Why it steps at all: the thing beside the prose is a fixed-aspect
   image, or a form, in a column that grows with the viewport — so every
   pixel of extra width makes that object taller AND the paragraphs
   shorter, because a wider column fits more characters on each line and
   the same sentences wrap into fewer of them. At body size the text was
   filling about 40% of a surface row at 1440 and falling from there.

   Below 64rem the default is deliberately the normal body step: that is
   the single-column stack, where the prose has the full measure and the
   picture sits under it rather than beside it, so there is no imbalance
   to correct and a 22px paragraph on a phone would just be shouting. */
.booth-surface,
.booth-stepped-prose {
  --booth-row-size: var(--p-md-font-size);
  --booth-row-leading: var(--p-md-line-height);
  /* 60ch is what Body and Lede set for themselves, so below the grid
     this changes nothing: the single-column stack keeps the measure the
     primitives would have given it. */
  --booth-row-measure: 60ch;
}
/* A capped line length, which is the half of this that does not change
   the type at all. Holding the measure is what keeps the block's height
   while the column around it grows, and it is the better line length
   anyway: 32rem runs to about 50 characters at these sizes, inside the
   45-75 a reader wants. */
@media (min-width: 64rem) {
  .booth-surface,
  .booth-stepped-prose {
    --booth-row-measure: 32rem;
  }
}
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

  /* ── The hero's row, which closes on one line ──────────────────────
     Everywhere else on this page the screenshot sets the height of its
     row and the text sits at the top of a taller column, which is right
     for a sequence of exhibits: the heading lines up with the top of the
     screen it names and the leftover space is the gap before the next
     row. The hero is not in that sequence. It is the first thing on the
     page and nothing follows it inside its own band, so the leftover
     space reads as a hole rather than as a gap, and a picture hanging
     below the buttons leaves the row with no bottom edge.

     So here it runs the other way: the text column sets the height and
     the capture is cropped to it, bottom edge level with the bottom of
     the buttons. Taking the frame out of flow is what makes that
     possible — an in-flow figure is what sizes the row, so as long as it
     is in there nothing can be measured against the text beside it.
     Stretched and empty, the figure gives the frame a definite height to
     fill and contributes none of its own.

     Cropped rather than scaled down, which was built first and thrown
     away. Scaling to the text height shrinks a 1440px capture to about
     a third of life size, which is the width at which an interface stops
     being readable and starts being texture — and it leaves the column
     it is in part empty, because the picture no longer fills it. The
     crop keeps the capture at the size it is worth showing at and cuts
     the bottom instead, which the Today view survives: what it cuts is
     the tail of a list that visibly carries on, and a window onto a
     working screen is the thing this row is trying to be.

     Only from 64rem. Below that the row is a single column, the capture
     takes the full measure, and there is no text column beside it to
     take a height from. */
  .booth-surface--flush > .booth-shot {
    position: relative;
    align-self: stretch;
  }
  .booth-surface--flush .booth-shot-frame {
    position: absolute;
    inset: 0;
  }
}
/* And the type itself, in two steps. The first is the scale's own p-lg.
   The second is past the end of the prose scale, so it is stated in px
   at the 1.5 leading ratio every p-* step in the scale uses.

   Breakpoints rather than a clamp on purpose: the well caps at
   --container-page (104rem), so a viewport-width clamp would keep growing
   the type after the column holding it has stopped growing.

   Nothing steps below 80rem although the grid starts at 64rem, and that
   is measured rather than tidy. In the 64-80rem band the capture is small
   and the column narrow, so the prose already fills four fifths of the
   row at the body step; stepping it up there is the same imbalance in the
   other direction. */
@media (min-width: 80rem) {
  .booth-surface,
  .booth-stepped-prose {
    --booth-row-size: var(--p-lg-font-size);
    --booth-row-leading: var(--p-lg-line-height);
  }
}
@media (min-width: 96rem) {
  .booth-surface,
  .booth-stepped-prose {
    --booth-row-size: 22px;
    --booth-row-leading: 33px;
  }
}
/* ─── The well ──────────────────────────────────────────────────────
   This page does not sit inside the site's shared rail, and it is the
   only one that does not. Everywhere else Container is what lines the
   header, the footer, and every page up against each other, and that is
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
   that, and it is sized for the evidence on this page, which is
   screenshots: a 1440px capture beside a paragraph is an argument at
   46rem and a texture at 30rem. The site's own rail was widened to this
   page's well plus its two gutters afterwards, so a Container's content
   and a band's content now land on the same two lines — the page reads
   flush with the header and the footer above and below it while still
   carrying its colour edge to edge. Prose is unaffected — the single-column
   sections still set to their own measure, which the well never touches.

   max() is what picks between them: below the well plus two gutters the
   gutter wins and the band is edge-to-edge with a margin, and above it the
   half-difference wins and the content centres. No vw anywhere, so a
   scrollbar can never push the page sideways. */
.booth-brand,
:root:has(.booth-brand) {
  --booth-well: 96rem;
  --booth-gutter: 1.5rem;
}
@media (min-width: 40rem) {
  .booth-brand,
  :root:has(.booth-brand) { --booth-gutter: 2.5rem; }
}
@media (min-width: 64rem) {
  .booth-brand,
  :root:has(.booth-brand) { --booth-gutter: 4rem; }
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
  --booth-shot-edge: var(--neutral-700);
  --booth-green: color-mix(in srgb, var(--green-500) 16%, var(--surface-page));
  --booth-blue: color-mix(in srgb, var(--blue-500) 14%, var(--surface-page));
  --booth-orange: color-mix(in srgb, var(--orange-500) 15%, var(--surface-page));
  --booth-green-wash: color-mix(in srgb, var(--green-500) 28%, transparent);
  --booth-blue-wash: color-mix(in srgb, var(--blue-500) 24%, transparent);
  --booth-orange-wash: color-mix(in srgb, var(--orange-500) 28%, transparent);
}
[data-theme="dark"] .booth-brand {
  --booth-shot-edge: var(--border-default);
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
/* ─── Prose that lines up with the hero ──────────────────────────────
   The hero's text is a grid column, not a measure: from 64rem the band
   splits minmax(0,1fr) / minmax(0,1.05fr), so the paragraph under the
   h1 is 550px wide at 1280, 628 at 1440, and only reaches the 46rem
   prose cap at about 1660. A single-column section below it sets to
   46rem flat, so its lines run past the hero's by up to 190px and the
   two blocks stack with different right edges — which reads as the page
   being lopsided rather than as two different measures, because nothing
   between them explains the change.

   This takes the hero's own column width instead: the same 2.05 the
   grid divides by, the same gap, still capped at the 46rem the prose
   would have taken anyway. Above 1660 the two are identical and the
   rule does nothing; below it they track each other exactly. Only from
   64rem, because under that the hero is a single column and the two
   already agree.

   Worth knowing: this makes the measure fluid, and a fluid measure
   cannot hold a line break. Where the lede below breaks is a function
   of the viewport, so it is not something to tune by adding or cutting
   a word — that only moves which width it looks wrong at. */
@media (min-width: 64rem) {
  .booth-prose-column {
    max-width: min(46rem, calc((100% - var(--scale-600)) / 2.05));
  }
}

/* ─── The three moves ───────────────────────────────────────────────
   Reserves two lines for a move's title, but only in the band where the
   three of them disagree. Once the cards are side by side their titles
   fit on one line from 80rem up, so up there the reservation is a blank
   line under every title and nothing else — which reads as the body
   having drifted away from its heading. Between 64rem and 80rem the
   cards are narrow enough that the first two wrap to two lines and the
   third does not, so without this their bodies start at three different
   heights on a row whose whole job is to be read across. Below 64rem
   the cards are stacked and there is nothing to line up with. */
@media (min-width: 64rem) and (max-width: 79.9375rem) {
  .booth-move-title { min-height: calc(2 * var(--h5-line-height)); }
}
.booth-shot-dark { display: none; }
[data-theme="dark"] .booth-shot-dark { display: block; }
[data-theme="dark"] .booth-shot-light { display: none; }
`,
      }}
    />
  );
}
