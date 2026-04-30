// ─────────────────────────────────────────────────────────────────
// Sub-brand union — a single source of truth for the named clusters
// the site flips into via `data-subbrand="..."`. Every consumer
// (Card primitive accent, Section accent, the LinkedIn-banner dots,
// the OG-image dots, the resume case-study card) references this
// type so adding a new sub-brand happens in one place.
//
// Add a new value here AND
//   • add the matching `[data-subbrand="X"]` alias block in
//     `tokens/Alias/<X>.json` (run `npm run tokens:build`)
//   • add the per-sub-brand link-color rules in `app/components.css`
//   • add a new tile to SUB_BRAND_TILES on the landing page when
//     the cluster is ready to surface in nav
// ─────────────────────────────────────────────────────────────────

export type SubBrand =
  | "newsletter"
  | "film"
  | "tv"
  | "music"
  | "games"
  | "books"
  | "podcast";
