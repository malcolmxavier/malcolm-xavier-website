// Build-time timestamp used by case-study layouts for the JSON-LD
// `dateModified` and OG `modifiedTime` fields. Frozen at module load,
// which for the statically generated case-study pages is build time
// — every deploy signals "re-crawl me" to Google with a fresh
// timestamp. Per-build granularity (a single timestamp shared across
// all pages on a given deploy) is what Google's dateModified
// prioritization actually uses; per-file accuracy isn't required, and
// the shared constant is the simplest pattern that meets the spec.
// Avoids hardcoded date constants that silently stale on every edit.
//
// Invariant depends on STATIC rendering. If a consumer layout ever
// adds `export const dynamic = "force-dynamic"` or calls `noStore()`
// in its module graph, this module re-evaluates per request and the
// "one timestamp per deploy" guarantee silently becomes "one
// timestamp per request" — re-flooding crawlers with re-crawl
// signals. Keep the consuming layouts in static rendering mode, or
// move this constant to a build-script-emitted file if any layout
// needs dynamic rendering for a different reason.
export const BUILD_TIMESTAMP = new Date().toISOString();
