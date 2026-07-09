"use client";

// ─────────────────────────────────────────────────────────────────
// ReviewShare — the per-review "share this take" breakout.
//
// Used ONLY where a single page carries takes at multiple levels: TV
// season/episode reviews, which sit below the show-level take that the
// hero share already covers. (Film and TV show-level cards are baked
// into the top-of-page ShareBar, so they don't use this.)
//
// It's a native <details> disclosure — keyboard-operable and
// screen-reader-labelled for free (matching the film detail page's
// Cast & Crew disclosure) — wrapping a compact ShareBar. That ShareBar
// carries both the deep LINK to this take's on-page anchor AND the
// review CARD IMAGE (download + native-share), so a season take shares
// exactly like the page-level bar, just scoped to the one review.
// ─────────────────────────────────────────────────────────────────

import { IconShare } from "@/components/icons";
import { ShareBar } from "@/components/share/ShareBar";

type ReviewShareProps = {
  /** Image-route base for this review, WITHOUT a format query — e.g.
   *  "/television/foo-2022/review-image/2". */
  imageBasePath: string;
  /** Site-relative detail path carrying the review's on-page anchor —
   *  the deep link the ShareBar shares (e.g.
   *  "/television/foo-2022#season-2-review"). */
  sharePath: string;
  /** Human title of the take (e.g. "House of the Dragon (2022)"). */
  title: string;
  /** Optional blurb passed to native share / intents. */
  text?: string;
  /** Analytics surface tag — e.g. "season-review", "episode-review". */
  surface: string;
  /** Filename stem for downloads (".png" / "-story.png" appended). */
  filenameStem: string;
};

export function ReviewShare({
  imageBasePath,
  sharePath,
  title,
  text,
  surface,
  filenameStem,
}: ReviewShareProps) {
  return (
    <details className="review-share">
      <summary
        className="review-share-summary focus-visible:outline-2 focus-visible:outline-offset-2"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          cursor: "pointer",
          fontFamily: "var(--font-mono)",
          fontSize: "var(--p-xs-font-size)",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          color: "var(--text-caption)",
          outlineColor: "var(--border-focus)",
          width: "fit-content",
        }}
      >
        <IconShare size={14} />
        Share this take
      </summary>

      {/* Panel — indented and bordered-left so it reads as a detail of
          the review above it, not a new section. The compact ShareBar
          renders the deep-link channels ("Link") plus the "Card image"
          row (download + native-share). */}
      <div
        style={{
          marginTop: "var(--scale-300)",
          paddingInlineStart: "var(--scale-400)",
          borderInlineStart: "2px solid var(--border-default)",
        }}
      >
        <ShareBar
          path={sharePath}
          title={title}
          text={text}
          emphasis="personal"
          surface={surface}
          variant="compact"
          label="Link"
          labelPlacement="block"
          imageBasePath={imageBasePath}
          imageFilenameStem={filenameStem}
        />
      </div>
    </details>
  );
}
