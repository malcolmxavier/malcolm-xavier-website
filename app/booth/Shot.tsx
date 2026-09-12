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
.booth-shot-dark { display: none; }
[data-theme="dark"] .booth-shot-dark { display: block; }
[data-theme="dark"] .booth-shot-light { display: none; }
`,
      }}
    />
  );
}
