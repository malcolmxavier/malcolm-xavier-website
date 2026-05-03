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
} as const;

export type AnalyticsEvent =
  (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS];
