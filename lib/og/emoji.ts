// ─────────────────────────────────────────────────────────────────
// Emoji artwork for generated images (share cards, OG images).
//
// The problem: next/og can't draw emoji from a font, so whenever it
// meets one it downloads that emoji's picture from a CDN. The address
// is hard-coded inside next/og to Twemoji 14.0.2 — a 2022 set from a
// project Twitter stopped maintaining — and next/og offers no setting
// to change it. Every emoji Unicode has added since (one batch a year)
// therefore comes back as a 404, and next/og feeds that error page to
// the renderer as if it were a picture, which can fail the whole image.
//
// The fix: intercept exactly that one request and answer it from the
// community-maintained continuation of Twemoji (jdecked/twemoji), which
// ships each year's new emoji within months. In order:
//   1. the pinned version below — reproducible, so a card looks the
//      same every time it's rendered;
//   2. the newest release — so an emoji newer than the pin still draws
//      without anyone bumping the version (this is what makes it
//      self-healing: when a new set ships, the next render picks it up);
//   3. a transparent blank — an emoji no release has yet leaves a small
//      gap instead of breaking the image, and fills in on its own once
//      a release includes it and the cached card is re-rendered.
// Each fallback logs a warning, so the runtime logs show when the pin
// has fallen behind.
//
// Every other request passes through untouched.
// ─────────────────────────────────────────────────────────────────

/** The address next/og asks for. A test fails if a Next upgrade changes it. */
export const LEGACY_TWEMOJI_PREFIX =
  "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/";

/** The pinned release of jdecked/twemoji. Bump after each annual set. */
export const TWEMOJI_VERSION = "17.0.3";

const sourceFor = (version: string) =>
  `https://cdn.jsdelivr.net/gh/jdecked/twemoji@${version}/assets/svg/`;

/** An empty, transparent square: the stand-in for an emoji no set has. */
const BLANK_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 36"></svg>';

/**
 * Fetch one emoji's SVG by its Twemoji file name (e.g. "1f62e-200d-1f4a8.svg"),
 * trying the pinned release, then the newest, then giving back a blank.
 * Never throws and never returns an error response, so a missing emoji
 * can't fail the image it appears in.
 */
export async function fetchEmojiSvg(
  file: string,
  fetchImpl: typeof fetch,
): Promise<Response> {
  for (const version of [TWEMOJI_VERSION, "latest"]) {
    try {
      const res = await fetchImpl(sourceFor(version) + file, {
        signal: AbortSignal.timeout(4000),
      });
      if (res.ok) {
        if (version !== TWEMOJI_VERSION) {
          console.warn(
            `[og/emoji] ${file} is missing from Twemoji ${TWEMOJI_VERSION}; drew it from the latest release. Consider bumping TWEMOJI_VERSION.`,
          );
        }
        return res;
      }
    } catch {
      // Network error or timeout — try the next source.
    }
  }
  console.warn(`[og/emoji] ${file} is in no Twemoji release yet; left blank.`);
  return new Response(BLANK_SVG, {
    status: 200,
    headers: { "Content-Type": "image/svg+xml" },
  });
}

const INSTALLED = Symbol.for("malxavi.og.emojiSource");

/**
 * Route next/og's emoji downloads through fetchEmojiSvg. Safe to call
 * from every module that renders an image: it installs once per process.
 */
export function installEmojiSource(): void {
  const g = globalThis as typeof globalThis & { [INSTALLED]?: true };
  if (g[INSTALLED]) return;
  g[INSTALLED] = true;

  const passThrough = globalThis.fetch;
  globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    const url =
      typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    if (url.startsWith(LEGACY_TWEMOJI_PREFIX)) {
      return fetchEmojiSvg(url.slice(LEGACY_TWEMOJI_PREFIX.length), passThrough);
    }
    return passThrough(input, init);
  }) as typeof fetch;
}
