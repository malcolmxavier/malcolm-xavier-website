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
};

export default nextConfig;
