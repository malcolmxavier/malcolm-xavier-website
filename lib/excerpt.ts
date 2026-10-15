// ─────────────────────────────────────────────────────────────────
// Review excerpts — shortening review prose for the places that show
// only a preview of it: the meta/OG description on a film or show
// page, and the text on the shareable review card.
//
// Why this exists: JavaScript measures strings in UTF-16 code units,
// not in the characters a reader sees. An emoji is two or more units
// (👍🏽 is four; a joined family emoji is eleven), so a plain
// `.slice(0, n)` can land inside one and leave half an emoji behind —
// a "�" in a search snippet, or an outright crash on the share card,
// where the same text is passed to `encodeURIComponent`, which throws
// on half a character. Everything here cuts between whole characters
// (grapheme clusters, via Intl.Segmenter), so an emoji is either kept
// whole or dropped whole.
// ─────────────────────────────────────────────────────────────────

const graphemes = new Intl.Segmenter(undefined, { granularity: "grapheme" });

/**
 * Flatten review prose to a single line of plain text.
 *
 * Removes the inline HTML Letterboxd preserves in review text
 * (currently just `<i>…</i>` for italics — the on-page renderer turns
 * those into <em>, but a preview is flat text and would otherwise show
 * the tags literally), then collapses paragraph breaks and runs of
 * whitespace into single spaces.
 */
export function flattenProse(text: string): string {
  return text
    .replace(/<\/?[a-z][^>]*>/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * The longest run of whole characters from the start of `text` that
 * fits within `budget` UTF-16 units. Never splits an emoji, an accented
 * letter built from combining marks, or any other multi-unit character.
 */
export function clipToBudget(text: string, budget: number): string {
  let end = 0;
  for (const { index, segment } of graphemes.segment(text)) {
    if (index + segment.length > budget) break;
    end = index + segment.length;
  }
  return text.slice(0, end);
}

/**
 * Shorten review prose to a preview of at most `budget` characters
 * plus a trailing ellipsis.
 *
 * Returns the flattened text unchanged when it already fits. Otherwise
 * it clips at a whole-character boundary, backs off to the last space
 * so a word isn't cut in half, and appends "…". If there's no space in
 * the last 40% of the budget (one very long token), it keeps the
 * character-safe clip rather than throwing most of the preview away.
 */
export function excerpt(text: string, budget: number): string {
  const flat = flattenProse(text);
  if (flat.length <= budget) return flat;
  const clipped = clipToBudget(flat, budget);
  const lastSpace = clipped.lastIndexOf(" ");
  const base = lastSpace > budget * 0.6 ? clipped.slice(0, lastSpace) : clipped;
  return `${base.trimEnd()}…`;
}
