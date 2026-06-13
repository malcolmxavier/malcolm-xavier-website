import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Spotify's image CDN domains. Album / track art comes from
    // i.scdn.co; auto-mosaic playlist covers come from one of the
    // image-cdn-*.spotifycdn.com hosts (varies by region).
    remotePatterns: [
      { protocol: "https", hostname: "i.scdn.co" },
      { protocol: "https", hostname: "mosaic.scdn.co" },
      { protocol: "https", hostname: "**.spotifycdn.com" },
      // TMDB image CDN — used by /films FilmCard posters and
      // /films/[slug] detail-page backdrops. All paths flow through
      // image.tmdb.org/t/p/<size>/<path>.
      { protocol: "https", hostname: "image.tmdb.org" },
    ],
  },
  // The /api/cron/* routes read runtime files (prev snapshot,
  // editorial overrides, cleanup reports) via fs.readFileSync at
  // request time. Next.js's static analysis can't see those reads,
  // so we declare them explicitly here — without this, the cron
  // functions would fail with ENOENT on Vercel.
  //
  // Globs are resolved from the project root.
  outputFileTracingIncludes: {
    "/api/cron/television-refresh": [
      "./lib/feeds/_fixtures/serializd-snapshot.json",
      "./data/television/overrides.json",
      "./data/television/cleanup/*.md",
    ],
    "/api/cron/films-refresh": [
      "./lib/feeds/_fixtures/letterboxd-snapshot.json",
      "./data/films/overrides.json",
    ],
    // Weekly lists/favorites scrape — touches BOTH snapshots (films
    // HTML scrape + TV JSON API) and reads BOTH overrides files for
    // the favorite-poster enrichment's tmdbId/posterPath pins (films
    // favourites resolve TMDB posters via the corpus enricher).
    "/api/cron/lists-refresh": [
      "./lib/feeds/_fixtures/letterboxd-snapshot.json",
      "./lib/feeds/_fixtures/serializd-snapshot.json",
      "./data/films/overrides.json",
      "./data/television/overrides.json",
    ],
    // Reconciles both snapshots against the enrichment fixture and fills
    // under-enriched titles, so it reads all three (+ commits the fixture).
    "/api/cron/enrich-refresh": [
      "./lib/feeds/_fixtures/letterboxd-snapshot.json",
      "./lib/feeds/_fixtures/serializd-snapshot.json",
      "./lib/feeds/_fixtures/enrichment-snapshot.json",
    ],
  },
  // Legacy-slug 301s for film detail pages whose `letterboxdSlug`
  // changed after the source-of-truth title was corrected. Each
  // entry preserves any inbound link/share that landed on the old
  // URL and consolidates SEO equity on the new canonical.
  //
  // 2026-05-09 — `Billie Eilish: The World's a Little Blurry` was
  // ingested from RSS with the title HTML-entity-encoded
  // (`World&#039;s`). slugify therefore produced `…-world-039-s-…`
  // and that slug shipped to production before the entity-decode
  // pass was added at intake. Title is now decoded at intake going
  // forward, but this one detail URL needs an explicit 301 so old
  // shares keep working.
  async redirects() {
    return [
      {
        source: "/films/billie-eilish-the-world-039-s-a-little-blurry-2021",
        destination: "/films/billie-eilish-the-world-s-a-little-blurry-2021",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
