// ─────────────────────────────────────────────────────────────────
// FeaturedPick — the editorial "watch this one right now" spotlight
// that leads the cluster landings, directly under the hero.
//
// It deliberately reads DIFFERENTLY from the Now / Favorites poster
// grids, using the vocabulary the rest of the page already speaks:
//   • SCALE — one large poster, alone, never in a <Grid>. The size
//     contrast against the 5-up rows below is what signals hierarchy.
//   • An ACCENT RULE — a 3px left border (top border when stacked) in
//     the cluster accent (--primary-700 → film orange / TV blue).
//     This is the single rule-break that marks the block as authored.
//   • PROSE — Now/Favorites carry no body copy at all, so the presence
//     of Malcolm's 2–4-sentence take is itself the differentiator: it
//     reads as "written for you," not "fetched for you."
//
// Layout: stacked (poster over text) through tablet; two-column at
// desktop (lg) so the poster doesn't dominate the fold on small
// screens. Pure presentational server component — no client JS.
// ─────────────────────────────────────────────────────────────────

import Image from "next/image";
import { Stack } from "@/components/layout/Stack";
import { Kicker } from "@/components/typography/Kicker";
import { Headline } from "@/components/typography/Headline";
import { Body } from "@/components/typography/Body";
import { Link } from "@/components/primitives/Link";
import { StarRating } from "@/components/primitives/StarRating";
import type { FeaturedPick as FeaturedPickData } from "@/lib/feeds/featured-pick";

export function FeaturedPick({ pick }: { pick: FeaturedPickData }) {
  const yearLabel = pick.year ? String(pick.year) : undefined;

  return (
    <Stack gap="400">
      {/* Section eyebrow — the static "currently" framing (no dated
          stamp to go stale; cadence is editorial, not calendar). */}
      <Kicker accent>Currently recommending</Kicker>

      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:gap-8">
        {/* Lone poster — capped width so a 2:3 still never overwhelms
            the mobile fold; larger at desktop where it has room. */}
        <div className="w-[150px] shrink-0 lg:w-[210px]">
          <div
            className="relative w-full overflow-hidden rounded-md"
            style={{
              aspectRatio: "2 / 3",
              background: "var(--surface-default)",
              border: "1px solid var(--border-default)",
            }}
          >
            {pick.posterUrl ? (
              <Image
                src={pick.posterUrl}
                alt="" /* decorative — title is adjacent in the body */
                fill
                sizes="(max-width: 1024px) 150px, 210px"
                style={{ objectFit: "cover" }}
              />
            ) : null}
          </div>
        </div>

        {/* Editorial column. The accent rule flips from a top border
            (stacked) to a left border (two-column) so the authored-
            statement cue survives the responsive collapse. */}
        <div
          className="border-t-[3px] pt-5 lg:border-t-0 lg:border-l-[3px] lg:pl-6 lg:pt-0"
          // The 700 step (not the default 500) so the 3px rule clears the
          // WCAG 1.4.11 non-text contrast floor (3:1) on every cluster — the
          // film orange-500 default measured 2.35:1 on the white page.
          style={{ borderColor: "var(--primary-700)" }}
        >
          <Stack gap="300">
            <Headline level={2}>{pick.title}</Headline>
            {/* Year + rating on one quiet metadata line. */}
            {yearLabel || pick.rating !== null ? (
              <div className="flex items-center gap-3">
                {yearLabel ? <Kicker>{yearLabel}</Kicker> : null}
                {pick.rating !== null ? (
                  <StarRating rating={pick.rating} size={16} />
                ) : null}
              </div>
            ) : null}
            <Body>{pick.take}</Body>
            {/* Single action — continue the argument on-site. Internal
                arrow per the CTA convention (→ for on-site). */}
            <p style={{ margin: 0 }}>
              <Link href={pick.href}>Why this one →</Link>
            </p>
          </Stack>
        </div>
      </div>
    </Stack>
  );
}
