// ─────────────────────────────────────────────────────────────────
// read-times.ts — the lookup for a page's reading time.
//
// The numbers live in read-times.generated.ts, written by
// scripts/build-read-times.mjs from the prose in each module. This file
// is the hand-written door onto them, and it exists for one reason: so
// a missing entry fails loudly.
// ─────────────────────────────────────────────────────────────────

import { READ_TIMES, type ReadTimeKind } from "./read-times.generated";

/**
 * Minutes to read a page, by kind and slug.
 *
 * THROWS on a miss, deliberately. Every caller is a server component on
 * a statically generated route, so a missing entry fails the build with
 * the slug in the message — which is what should happen when somebody
 * adds an essay and forgets to regenerate. The alternative, returning
 * undefined, would ship a page silently missing its reading time, and
 * a silently absent label is the failure nobody notices.
 */
export function readMinutes(kind: ReadTimeKind, slug: string): number {
  const entry = READ_TIMES[kind]?.[slug];
  if (!entry) {
    throw new Error(
      `No reading time for ${kind}/${slug}. Run \`npm run readtimes:build\` — ` +
        `it is generated from the module's prose, not hand-set.`,
    );
  }
  return entry.minutes;
}

export { READ_TIMES, WORDS_PER_MINUTE } from "./read-times.generated";
export type { ReadTimeKind, ReadTimeEntry } from "./read-times.generated";
