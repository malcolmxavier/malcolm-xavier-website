// ─────────────────────────────────────────────────────────────────
// Google Fonts loader for OG / icon image generation.
//
// Next.js's ImageResponse (next/og) renders TSX to images at build
// time using Satori, which needs raw font binaries (TTF/OTF) — it
// can't read CSS @font-face declarations. So to use Instrument Serif
// or DM Sans in our generated brand assets, we fetch the font binary
// from Google's CDN at build time and pass it into ImageResponse.
//
// We do this dynamically instead of committing TTF blobs to the repo
// because (a) it keeps the source tree clean and (b) Google subsets
// the font to only the glyphs we actually render via the `text` query
// param, which keeps build-time downloads tiny (a few KB instead of
// 50+).
//
// Resilience: this fetch runs at build time on Vercel. A brief CDN
// blip during `vercel --prod` would kill the whole deployment if we
// don't retry — the OG image is a static asset, not interactive
// content, so failing the build over a 502 is the wrong tradeoff.
// We retry each fetch once with backoff. If Google ever rotates the
// endpoint format outright, both attempts fail and the build halts
// with a clear error; the recovery is to commit a TTF and read it
// from disk.
// ─────────────────────────────────────────────────────────────────

const MAX_FETCH_ATTEMPTS = 2;
const RETRY_BACKOFF_MS = 500;

/** Fetch with one automatic retry on transient network / 5xx errors. */
async function fetchWithRetry(
  url: string,
  init?: RequestInit,
): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_FETCH_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(url, init);
      // 5xx is a transient signal worth retrying; 4xx (e.g. 404 for
      // a misspelled family) is a programming error, not network noise.
      if (res.ok || res.status < 500) return res;
      lastError = new Error(
        `Fetch ${res.status} ${res.statusText} on ${url}`,
      );
    } catch (err) {
      lastError = err;
    }
    if (attempt < MAX_FETCH_ATTEMPTS) {
      await new Promise((r) => setTimeout(r, RETRY_BACKOFF_MS * attempt));
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error(`Fetch failed for ${url}`);
}

/**
 * Fetch a Google Font binary subset to just the glyphs we need.
 *
 * @param family - Google Font family name, URL-encoded if needed
 *                 (e.g. "Instrument+Serif", "DM+Sans:wght@400;500;600")
 * @param text   - Only glyphs that appear in this string are
 *                 included in the returned font, which makes the
 *                 download dramatically smaller.
 * @returns ArrayBuffer of the TTF data, ready to pass into
 *          ImageResponse's `fonts` option.
 */
export async function loadGoogleFont(
  family: string,
  text: string,
): Promise<ArrayBuffer> {
  const cssUrl = `https://fonts.googleapis.com/css2?family=${family}&text=${encodeURIComponent(text)}`;

  // Google Fonts serves DIFFERENT CSS depending on User-Agent. Modern
  // browsers get woff2 (which Satori can't parse); older agents get
  // TTF, which is what we need. Faking an old User-Agent forces TTF.
  const cssRes = await fetchWithRetry(cssUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; OG-Image-Builder/1.0; +https://malxavi.com)",
    },
  });
  if (!cssRes.ok) {
    throw new Error(
      `Google Fonts CSS fetch failed: ${cssRes.status} ${cssRes.statusText}`,
    );
  }
  const css = await cssRes.text();

  // CSS contains something like:
  //   src: url(https://fonts.gstatic.com/...) format('truetype');
  // The URL has no file extension when Google subsets it (ends in
  // query-string params), so we don't anchor to .ttf — we just grab
  // whatever URL precedes a `format('truetype')` declaration.
  const match = css.match(
    /src:\s*url\((https:\/\/[^)]+)\)\s*format\(['"]truetype['"]\)/,
  );
  if (!match) {
    throw new Error(
      `No truetype URL in Google Fonts CSS for family "${family}". Got: ${css.slice(0, 400)}`,
    );
  }

  const fontRes = await fetchWithRetry(match[1]);
  if (!fontRes.ok) {
    throw new Error(
      `Google Fonts TTF fetch failed: ${fontRes.status} ${fontRes.statusText}`,
    );
  }
  return fontRes.arrayBuffer();
}
