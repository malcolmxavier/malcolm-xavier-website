// ─────────────────────────────────────────────────────────────────
// Sitewide configuration constants.
//
// One source of truth for cross-cutting values that previously lived
// in multiple files (root layout, sitemap, etc.). Closes
// m-site-url-duplicated from the 2026-04-29 /full-review.
// ─────────────────────────────────────────────────────────────────

/** Production canonical hostname. Drives metadataBase, sitemap URLs,
 *  JSON-LD `@id`s, and any other absolute-URL emitter sitewide. */
export const SITE_URL = "https://malxavi.com";

/** Display name — shown in the title template, OG site_name, etc. */
export const SITE_NAME = "Malcolm Xavier";

/** Canonical LinkedIn profile. Used as the OG `article:author` target on
 *  case studies (so a LinkedIn unfurl can attribute the byline back to the
 *  profile) and mirrored in the sitewide Person `sameAs` in app/layout.tsx. */
export const LINKEDIN_PROFILE_URL = "https://www.linkedin.com/in/malxavi/";

/** X (formerly Twitter) attribution handle — the account credited when a
 *  page's summary card unfurls on X. */
export const TWITTER_HANDLE = "@malxavi";

/** Spread into a page's `twitter` metadata block to credit @malxavi as the
 *  card's site + creator.
 *
 *  Why a spread and not just root metadata: Next.js App Router REPLACES
 *  (does not deep-merge) the `twitter` object per route segment, so a page
 *  that defines its own card drops anything set only at the root. We apply
 *  this to the root default AND to every share-surface page that redefines
 *  its card (case studies, film/TV details + landings, stats, ranked lists,
 *  music) — the surfaces we actively promote for sharing. Non-share surfaces
 *  (auto-generated facets, review grids, collections hubs, recruiter-info
 *  pages) intentionally rely on the root default only: X is a de-emphasized
 *  channel, so threading the tag through every generated facet card isn't
 *  worth the maintenance surface. */
export const twitterAttribution = {
  site: TWITTER_HANDLE,
  creator: TWITTER_HANDLE,
} as const;
