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
