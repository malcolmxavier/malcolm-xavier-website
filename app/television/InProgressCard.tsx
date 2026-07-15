// ─────────────────────────────────────────────────────────────────
// InProgressCard — uniform-height card used on /television/watching.
//
// Differs from ShowCard in two ways:
//
//   1. The surfaced data isn't a single review — it's a season-in-
//      progress with an array of episode reviews. The card surfaces
//      a "X of Y episodes watched" progress line + the most-recent
//      episode's watched date as a "last watched" dateline.
//
//   2. There's no per-card rating (episode-level reviews are quick
//      logs and aggregating them per season would be misleading
//      mid-watch). The card communicates ongoing-ness, not
//      verdict.
//
// Standard portrait poster aspect ratio (2:3). Title + season
// indicator clamped so card heights stay aligned. Mirrors
// ShowCard's hover/focus treatment so the two card types read as
// siblings on adjacent surfaces (/television vs /television/
// watching).
// ─────────────────────────────────────────────────────────────────

import Image from "next/image";
import NextLink from "next/link";
import { Stack } from "@/components/layout/Stack";
import { Headline } from "@/components/typography/Headline";
import { Kicker } from "@/components/typography/Kicker";
import { TrackOnClick } from "@/components/analytics/TrackOnClick";
import { ANALYTICS_EVENTS } from "@/lib/analytics";
import {
  formatWatchedDate,
  resolveSeasonPosterUrl,
  type InProgressCard as InProgressCardType,
} from "@/lib/feeds/serializd-utils";

export function InProgressCard({
  card,
  originHref,
}: {
  card: InProgressCardType;
  /** Source listing URL to encode as `?from=` on the detail-page
   *  link, so adjacent-show nav on the detail page knows the
   *  user's filter/sort context. See ShowCard.tsx for the same
   *  pattern. */
  originHref?: string;
}) {
  const { show, seasonNumber, episodeReviews } = card;
  // Season metadata (poster + episode count). Poster goes through
  // the shared resolveSeasonPosterUrl helper so this card and
  // /television's Season cards stay aligned on which image to
  // show for any given (show, seasonNumber) tuple. Falls back to
  // show.posterUrl when the season has no TMDB-resolved poster
  // (common for "Specials" / season-0 entries).
  const season = show.seasons.find((s) => s.seasonNumber === seasonNumber);
  const seasonPosterUrl =
    resolveSeasonPosterUrl(show, seasonNumber) ?? show.posterUrl;
  const totalEpisodes = season?.episodeCount ?? null;
  const watchedEpisodes = episodeReviews.length;
  // Only surface the "of Y" denominator when TMDB's episode count is
  // credible — i.e. at least as large as what we've logged. A
  // currently-airing season's TMDB count routinely lags our Serializd
  // logs (episodes get logged next-day, before TMDB adds the episode
  // records), which would otherwise render a nonsensical "15 of 9".
  // When the count is behind, drop the denominator and show just the
  // watched tally until the snapshot's TMDB data catches up.
  const showDenominator =
    totalEpisodes !== null && totalEpisodes >= watchedEpisodes;
  // Most-recent episode dateline — episodeReviews comes pre-
  // sorted reviewDate desc by buildInProgressCards, so [0] is
  // newest. Date strips to day precision for display since
  // episode-level watch times can be sub-day noisy.
  const mostRecent = episodeReviews[0];
  const lastWatchedDate = mostRecent?.watchedDate.slice(0, 10) ?? null;

  return (
    <article className="h-full">
      <TrackOnClick
        event={ANALYTICS_EVENTS.SHOW_CARD_CLICK}
        eventData={{
          slug: show.slug,
          showId: show.serializdShowId,
          cardKind: "season-in-progress",
          seasonNumber,
        }}
      >
        <NextLink
          // Anchor jumps directly to the season section on the
          // detail page. ?from=<encoded-listing-url> (when
          // originHref is set) feeds the detail page's
          // contextual-neighbor lookup — the user's "older / newer"
          // links from a /television/watching click should walk the
          // OTHER in-progress shows, not the full lifetime catalog.
          href={(() => {
            const base = `/television/${show.slug}?ref=internal#season-${seasonNumber}`;
            if (!originHref) return base;
            const hashIdx = base.indexOf("#");
            const fromParam = `&from=${encodeURIComponent(originHref)}`;
            return hashIdx === -1
              ? `${base}${fromParam}`
              : `${base.slice(0, hashIdx)}${fromParam}${base.slice(hashIdx)}`;
          })()}
          className="show-card-link block h-full focus-visible:outline-2 focus-visible:outline-offset-4"
          style={{ outlineColor: "var(--border-focus)" }}
        >
          <Stack gap="300" className="h-full">
            {/* Poster — 2:3 aspect, season poster preferred over
                show poster so the user can see WHICH season they're
                mid-watch on. */}
            <div
              className="relative w-full overflow-hidden rounded-md"
              style={{
                aspectRatio: "2 / 3",
                background: "var(--surface-default)",
                border: "1px solid var(--border-default)",
              }}
            >
              {seasonPosterUrl ? (
                <Image
                  src={seasonPosterUrl}
                  alt=""
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                  style={{ objectFit: "cover" }}
                  placeholder="empty"
                />
              ) : (
                <div
                  className="absolute inset-0 flex items-center justify-center p-4"
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "var(--p-xs-font-size)",
                    letterSpacing: "0.04em",
                    color: "var(--text-caption)",
                    textAlign: "center",
                  }}
                  aria-hidden="true"
                >
                  {show.name}
                </div>
              )}
              {/* Season badge (top-left) — same blue treatment as
                  ShowCard's Season variant so the visual language
                  is consistent across surfaces. --blue-700 direct
                  per the feedback_text_action_alias_bug memory. */}
              <span
                aria-hidden="true"
                style={{
                  position: "absolute",
                  top: 8,
                  left: 8,
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  background: "var(--blue-700)",
                  color: "#fff",
                  padding: "3px 6px",
                  borderRadius: 3,
                  filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.4))",
                }}
              >
                S{seasonNumber}
              </span>
              {/* In-progress badge (bottom-left) — distinguishes
                  these cards from completed Season cards on
                  /television. Uses an animated dot in light mode
                  but degrades to plain text under prefers-reduced-
                  motion (CSS class). */}
              <span
                role="img"
                aria-label="Currently watching"
                style={{
                  position: "absolute",
                  bottom: 8,
                  left: 8,
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  letterSpacing: "0.06em",
                  background: "rgba(0,0,0,0.65)",
                  color: "#fff",
                  padding: "3px 6px",
                  borderRadius: 3,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <span
                  aria-hidden="true"
                  className="watching-pulse"
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: "var(--blue-300)",
                  }}
                />
                Watching
              </span>
            </div>

            {/* Title + season label */}
            <Stack gap="100">
              <Headline
                level={3}
                className="line-clamp-2"
                style={{
                  fontSize: "var(--p-md-font-size)",
                  lineHeight: "var(--p-md-line-height)",
                  minHeight: "calc(2 * var(--p-md-line-height))",
                }}
              >
                {show.name}
              </Headline>
              <Kicker>
                {show.premiereYear || ""}
                {seasonNumber !== null ? ` · Season ${seasonNumber}` : ""}
              </Kicker>
            </Stack>

            {/* Progress + dateline */}
            <Stack gap="100">
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 12,
                  color: "var(--text-body)",
                  letterSpacing: "0.04em",
                }}
              >
                {watchedEpisodes}
                {showDenominator ? ` of ${totalEpisodes}` : ""}{" "}
                {watchedEpisodes === 1 ? "episode" : "episodes"} watched
              </span>
              {lastWatchedDate ? (
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    color: "var(--text-caption)",
                    letterSpacing: "0.04em",
                  }}
                >
                  Last watched {formatWatchedDate(lastWatchedDate)}
                </span>
              ) : null}
            </Stack>
          </Stack>
        </NextLink>
      </TrackOnClick>
    </article>
  );
}
