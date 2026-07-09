// ─────────────────────────────────────────────────────────────────
// Analytics event vocabulary.
//
// Centralizes the custom-event names fired through @vercel/analytics
// so the call sites stay free of magic strings and the dashboard
// doesn't fragment on typos. Closes c-no-funnel-events Tier 2 from
// the 2026-04-29 /full-review (paired with a-calendly-widget-url-
// and-tracking's postMessage half and h-hero-cta-no-inview's
// IntersectionObserver half).
//
// The event vocabulary maps to the recruiter funnel:
//
//   1. Awareness   →  HERO_CTA_INVIEW           (resume CTA in viewport)
//   2. Intent      →  SUBBRAND_TILE_CLICK       (cultural-corner exploration)
//   3. Activation  →  RESUME_PDF_DOWNLOAD       (recruiter pulled PDF)
//                     EMAIL_CLICK               (kind=direct|forward)
//                     CALENDLY_CLICK            (kind=outbound|fallback)
//   4. Conversion  →  CALENDLY_BOOKED           (postMessage from iframe)
//
// Vercel Web Analytics is GDPR-clean (no cookies, no PII). Event
// names are short snake_case strings; metadata is small string-only
// objects so they serialize cleanly and don't accidentally include
// personal data.
// ─────────────────────────────────────────────────────────────────

export const ANALYTICS_EVENTS = {
  /** Resume PDF "Download" button on /resume hero. */
  RESUME_PDF_DOWNLOAD: "resume_pdf_download",
  /** Any link to CONTACT.calendly OR CONTACT.calendlyRoot. Pair
   *  with `kind: "outbound"` (homepage / resume / about / case
   *  studies) or `kind: "fallback"` (the /contact page's
   *  "widget-not-loading" link). */
  CALENDLY_CLICK: "calendly_click",
  /** Fires when Calendly's iframe emits `calendly.event_scheduled`.
   *  This is the actual booking-completed signal — the conversion
   *  end of the funnel. */
  CALENDLY_BOOKED: "calendly_booked",
  /** Any mailto: link. Pair with `kind: "direct"` (the user
   *  emailing Malcolm) or `kind: "forward"` (the resume's
   *  "Send this to a hiring manager" upstream-share button). */
  EMAIL_CLICK: "email_click",
  /** Homepage sub-brand matrix tile click. Pair with the tile
   *  slug (e.g. `tile: "music"`) so the dashboard reports per-
   *  cluster engagement. */
  SUBBRAND_TILE_CLICK: "subbrand_tile_click",
  /** Click on an end-of-article CTA inside a case study — either
   *  one of the sub-brand "explore" cards or an inline cross-link
   *  to another case study. Pair with:
   *   - `surface`:     case-study slug the click originated from
   *                    (e.g. "architecture-under-contract",
   *                    "building-this-site")
   *   - `destination`: where the click goes — sub-brand slug
   *                    ("music" | "films" | "television") or
   *                    "case-study:<slug>" for case-study-to-
   *                    case-study cross-links.
   *  Lets the dashboard answer "does this article pull clicks
   *  through?" per surface AND per destination. */
  CASE_STUDY_CTA_CLICK: "case_study_cta_click",
  /** Resume CTA enters the viewport on /. Lets the dashboard
   *  separate "didn't see it" from "saw it, didn't bite" —
   *  conversion-rate denominator question. Fires once per page
   *  load, not on each scroll. */
  HERO_CTA_INVIEW: "hero_cta_inview",
  /** Any outbound click to letterboxd.com. Pair with `kind`:
   *  - "profile-follow" — /films hero "Follow along on Letterboxd"
   *  - "film-detail" — /films/[slug] "View on Letterboxd ↗"
   *  Separates top-of-funnel follow intent from per-review source
   *  intent in the dashboard. */
  LETTERBOXD_CLICK: "letterboxd_click",
  /** Click on a FilmCard from the /films grid into the detail
   *  page. Engagement signal — measures whether the
   *  filter-and-browse loop produces real reads. */
  FILM_CARD_CLICK: "film_card_click",
  /** Any filter/sort change on /films via FilmsShell. Pair with
   *  `dimension`: "rating" | "genre" | "watched" | "sort" so the
   *  dashboard reports which filter dimensions earn their UI
   *  real-estate. */
  FILM_FILTER_APPLIED: "film_filter_applied",
  /** Click on a ShowCard from the /television grid into the detail
   *  page. Pair with `cardKind`: "show" | "season" so the
   *  dashboard separates Show-card vs Season-card engagement. */
  SHOW_CARD_CLICK: "show_card_click",
  /** Any filter/sort change on /television via TelevisionShell.
   *  Same dimensions vocabulary as FILM_FILTER_APPLIED so cross-
   *  cluster comparisons are clean. */
  SHOW_FILTER_APPLIED: "show_filter_applied",
  /** Outbound click to serializd.com. Pair with `kind`:
   *  - "profile-follow" — /television hero "Follow along on Serializd"
   *  - "show-detail" — /television/[slug] "View on Serializd ↗" */
  SERIALIZD_CLICK: "serializd_click",
  /** Pagination control click. Fires from the shared primitive so
   *  /films, /television, and /music all funnel through one event.
   *  Pair with:
   *   - `surface`:   "films" | "television" | "music" (free-form
   *                  string; consumer chooses the granularity)
   *   - `page`:      target page number (1-indexed)
   *   - `direction`: "prev" | "next" | "page" (anchor click vs
   *                  windowed page-number click) */
  PAGINATION_CLICK: "pagination_click",
  /** All/Watching toggle click on the /television cluster. Pair with:
   *   - `from`: "listing" | "genre" | "watching" (the surface the
   *             user clicked from)
   *   - `to`:   "all" | "watching" (which option they clicked) */
  WATCHING_TAB_CLICK: "watching_tab_click",
  /** Click on a sub-brand landing's primary "Browse all N reviews"
   *  CTA (hero or cluster-rail Reviews tab). Pair with `surface`:
   *  "films_landing" | "tv_landing". This is the numerator for the
   *  "thin gate" validation — how many landing visitors push through
   *  to the corpus, and from where. */
  LANDING_REVIEWS_CTA_CLICK: "landing_reviews_cta_click",
  /** Fired once, on the first CTA interaction on a sub-brand landing,
   *  carrying `timeMs` (ms from page mount to that first click) and
   *  `surface`. Measures pre-click dwell — whether the editorial
   *  landing earns attention before the user heads to the corpus, or
   *  is just a tax on the way there. */
  LANDING_DWELL_TO_CTA: "landing_dwell_to_cta",
  /** Click on a stats dashboard tile's deep-link into the reviews
   *  corpus (a Bars / Versus / ColumnChart / Diverging / Donut /
   *  Heatmap / StackedBars row). The core stats→reviews funnel step.
   *  Pair with:
   *   - `cluster`:        "films" | "television"
   *   - `dimension`:      the facet the row deep-links on ("genre",
   *                       "actor", "rating", "language-country",
   *                       "release-type-x-era", "collection", …)
   *   - `destination`:    "reviews" (a filtered corpus view) |
   *                       "collection-page" (a curated /films/collections
   *                       page, which isn't a reviews filter)
   *   - `carriedFilters`: how many active filter dimensions carried
   *                       through the click (0 when the page is unfiltered)
   *  Bigs (headline scalar figures) are intentionally NOT tracked — they
   *  don't deep-link. Connected tiles don't deep-link either, so they
   *  never fire this. */
  STATS_TILE_CLICK: "stats_tile_click",
  /** A filter change on a stats dashboard (via StatsFilterControls).
   *  Pair with:
   *   - `cluster`:   "films" | "television" | "connected"
   *   - `dimension`: the filter param touched ("genres", "rating",
   *                  "releaseType", "actors", "director", …)
   *   - `action`:    "apply" (added or changed a value) | "clear"
   *                  (removed the last value on that dimension) |
   *                  "clear-all" (the bulk Clear all). */
  STATS_FILTER_APPLIED: "stats_filter_applied",
  /** Click on the StatsHandoffPanel "See the N reviews" CTA — the
   *  conversion fired when a thin selection collapses the dashboard and
   *  it hands the SAME selection off to the reviews funnel. Pair with:
   *   - `cluster`: "films" | "television"
   *   - `n`:       the matched-corpus size handed off. */
  STATS_HANDOFF_CLICK: "stats_handoff_click",
  /** Click on a ShareBar control (any channel). Pair with:
   *   - `channel`: the share channel id ("copy" | "native" | "x" |
   *                "bluesky" | "linkedin" | "whatsapp" | "messages" |
   *                "facebook" | "reddit" | "email").
   *   - `surface`: the content surface shared from ("case-study" |
   *                "film" | "show" | "review" | "films-landing" |
   *                "tv-landing" | "stats" | "list" | "music").
   *   - `path`:    the site-relative path being shared.
   *  The share-loop analogue of the funnel events above — measures which
   *  content gets shared and through which channels. */
  SHARE_CLICK: "share_click",
} as const;

export type AnalyticsEvent =
  (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS];
