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
// If Google ever rotates these CDN paths, this fetch will fail at
// build and we'll see the failure during `vercel --prod` — at which
// point the fallback is to download a TTF and read it from disk.
// ─────────────────────────────────────────────────────────────────

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
  const cssRes = await fetch(cssUrl, {
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

  const fontRes = await fetch(match[1]);
  if (!fontRes.ok) {
    throw new Error(
      `Google Fonts TTF fetch failed: ${fontRes.status} ${fontRes.statusText}`,
    );
  }
  return fontRes.arrayBuffer();
}
