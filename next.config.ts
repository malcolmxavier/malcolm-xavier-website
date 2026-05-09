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
  },
};

export default nextConfig;
