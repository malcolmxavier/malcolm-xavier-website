# lib/feeds/stats—stats compute and the facet-indexation contract

This directory holds the ported stats math (shrinkage, miniseries rule, canon maps, franchise families, actor gating) and the configuration that governs which facet pages are indexable. The decisions below are **locked**; they constrain any new facet route, sitemap entry, or stats tile. They were lifted out of the cluster `PLAN.md` once the cluster shipped, because they outlive the plan and belong next to the code that enforces them.

## Indexation rule (locked 2026-06-10)

**Policy: per-type count floor.** Chosen over a single global N and over a type allowlist—a single N can't separate high-demand low-cardinality types (director, franchise) from high-cardinality flooders (actor, studio), because they share the same count range. No type is hard-excluded; the floor is calibrated to each type's cardinality, so it self-tunes as the corpus grows.

**Invariants (all types):**
- **Indexable surface = a dedicated route**, path-based and self-canonical, with an explicit **sitemap entry**. Genre's `/films/genre/[slug]` is the template, extended to every indexable facet type (`/films/director/[slug]`, `/films/studio/[slug]`, etc.). A route may reuse the filter pipeline internally (server rewrite), but the public, canonical, indexed URL is always the route—never a `?param=` form.
- **All `?param=` filter/search URLs are `noindex, follow`**—single facet, combinations, sort, pagination, `?title=`/`?director=` search alike. Where a query state corresponds to a dedicated route, it rewrites/redirects to the route or canonicals to it; the query URL is never the one indexed.
- **No thin pages.** A facet must clear its type's count floor (and, for studio, the allowlist) to earn a route.

Indexation is sourced from one place (`facet-index.ts` in the parent `lib/feeds/`); the floors below live in this directory's config alongside the canon maps.

## Per-type floors

Page counts are current-corpus estimates (≈220 indexable facet pages total, demand-aligned).

| type | floor | ~pages | note |
|---|---|---|---|
| film:genre | 2 | 19 | bounded |
| film:director | 3 | 37 | 1–2-film names excluded |
| film:decade | 2 | 6 | |
| film:actor | 8 | 21 | most-logged only |
| film:writer | 3 | 27 | |
| film:studio | **allowlist + 5** | ~26 | see below—count alone can't filter TMDB co-financier noise |
| film:language | 3 | 10 | |
| film:country | 5 | 13 | |
| film:franchise | 3 | 12 | indexed via `/collections/[slug]` routes |
| tv:genre | 2 | 11 | |
| tv:creator | 2 | 13 | |
| tv:actor | 3 | 11 | eps≥3 already applied |
| tv:network | 5 | 11 | canonicalized (HBO/Max merged) |
| tv:language | 2 | 3 | |
| tv:country | 3 | 4 | |
| tv:type | 2 | 4 | |
| tv:decade | 2 | 3 | |

## `film:studio`—the one type-shaped exception (frozen 2026-06-10)

Studio is the only type where a pure count floor fails at every N: TMDB lists production companies, not searcher-facing "studios," so count alone can't separate labels from co-financiers. Studio indexes iff `studio ∈ STUDIO_INDEX_ALLOWLIST AND count ≥ 5`. The allowlist is the membership gate (manually maintained, effectively static); N=5 is the substance gate. It lives in this directory alongside the `STUDIO_ALIAS`/`STUDIO_PARENT` canon maps.

**38 labels** (canonicalized names): A24, Universal, Paramount, Warner Bros., Columbia, 20th Century Studios, Searchlight, Focus Features, Lionsgate, Amazon MGM, Apple Studios, Lucasfilm, New Line, TriStar, Orion, Summit, Miramax, StudioCanal, Toho, Legendary, Amblin, Neon, Blumhouse, Annapurna, Plan B, Skydance, Film4, BBC Films, Working Title, Black Bear, Regency, TSG Entertainment, FilmNation, Scott Free, Thunder Road, Vertigo, Indian Paintbrush, Screen Ireland. (Cut from the borderline set: LuckyChap, STX, Pathé, Heyday.)

## Collections (locked 2026-06-10, hub reversed 2026-06-13)

- Per-collection **leaf routes are indexed**—`/{cluster}/collections/[slug]`, self-canonical and in the sitemap. Film floor N≥3 (guards TMDB announced-sequel padding); TV floor N≥2 (curated map, nothing to pad).
- The **hub** `/{cluster}/collections` is **indexed** (reversed from noindex on 2026-06-13): it's a curated watching-pattern landing with unique editorial value—the franchise hierarchy plus show grids—like `/television/watching`, not a thin auto-directory, so it earns indexation and feeds crawl equity to the leaves.
- Collection pages render one card per title (PosterTile), not the filterable reviews grid, so a show appears even when only reviewed at the season or episode level.
- TV has no native show-family concept, so families are hand-curated in `tv-franchise.ts` (9-1-1, Bravo-verse incl. Real Housewives/Vanderpump Rules, Grey's Anatomy, Selling, Game of Thrones; Interview with the Vampire seeded but dormant until the Lestat review lands). `npm run tv:collection-audit` surfaces uncurated shows that look like they belong to a family.

## What is NOT here

Point-in-time forks already embodied in code and auto-memory (the detail-page `from`-push back-link, the enrichment-refresh-on-cron approach) are not duplicated here—their home is the code they shaped plus git history. This file is for the durable contracts that govern future facet and indexation work. Open execution items live in the cluster `PLAN.md`.
