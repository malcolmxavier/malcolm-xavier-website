// Title-case a slug for a chip label when no canonical name is available
// (a query-param facet selection without a hint, e.g. a sub-floor stats
// deep-link). The route pin always passes the exact name via a hint.
// Shared by both cluster shells' active-filter chip rails.
export function deslugify(slug: string): string {
  return slug
    .split("-")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}
