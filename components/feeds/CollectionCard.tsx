// ─────────────────────────────────────────────────────────────────
// CollectionCard — a franchise-family card for the editorial landings'
// "Collections" module. The visual twin of ListCard (a named grouping
// with a cover montage + count + link), but tuned for collections:
// the count unit is parameterized (shows vs. films) and there's no
// methodology prose, because a collection's pitch is its DEPTH — "9
// shows logged" is the proof, not a per-title blurb.
//
// Why a sibling of ListCard rather than a shared component: a list and a
// collection are different concepts (a list carries ranking prose; a
// collection carries a member count), so overloading ListCard with mode
// flags would muddy both. The montage reads as the same family as
// ListCard's, but uses a fixed 3-column grid rather than ListCard's flex
// row so a short collection (two members) keeps the same poster size and
// card height as a full one — lists always have three+ covers, so they
// never hit that case. A future PosterMontage extraction could unify both.
//
// No "use client" — pure presentational.
// ─────────────────────────────────────────────────────────────────

import Image from "next/image";
import NextLink from "next/link";
import { Stack } from "@/components/layout/Stack";
import { Headline } from "@/components/typography/Headline";
import { Kicker } from "@/components/typography/Kicker";

export function CollectionCard({
  href,
  title,
  count,
  unit,
  coverPosterUrls,
}: {
  href: string;
  title: string;
  /** Member count — logged films/shows in this franchise family. */
  count: number;
  /** Singular noun for the count line ("show" / "film"); pluralized
   *  automatically. Keeps the card cluster-agnostic. */
  unit: "show" | "film";
  /** Up to three corpus-resolved poster URLs for the cover montage.
   *  Fewer is fine; an empty array renders a flat placeholder cover so
   *  every card keeps a consistent height in the grid. */
  coverPosterUrls: string[];
}) {
  const covers = coverPosterUrls.slice(0, 3);
  const unitLabel = count === 1 ? unit : `${unit}s`;
  return (
    <NextLink
      href={href}
      className="block h-full focus-visible:outline-2 focus-visible:outline-offset-4"
      style={{ textDecoration: "none", outlineColor: "var(--border-focus)" }}
    >
      <Stack gap="300" className="h-full">
        {/* Cover montage — up to three mini posters, each a 2:3 box, so
            the row reads as "a stack of titles" without the clipping
            fragility of overlapping absolute positioning. A fixed 3-column
            grid (not the flex row ListCard uses) so the poster size — and
            therefore the whole card's height — is identical whether a
            family has two members or three: a 2-poster collection (Game of
            Thrones) fills the first two columns and leaves the third empty
            rather than stretching its posters to span the row. Decorative:
            the title carries the name, so the posters are aria-hidden. */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 6,
          }}
          aria-hidden="true"
        >
          {covers.length > 0 ? (
            covers.map((url, i) => (
              <div
                key={i}
                className="relative overflow-hidden rounded-md"
                style={{
                  aspectRatio: "2 / 3",
                  background: "var(--surface-default)",
                  border: "1px solid var(--border-default)",
                }}
              >
                <Image
                  src={url}
                  alt=""
                  fill
                  sizes="(max-width: 640px) 15vw, 10vw"
                  style={{ objectFit: "cover" }}
                  placeholder="empty"
                />
              </div>
            ))
          ) : (
            // No covers at all: one flat placeholder spanning the row, so
            // the card still keeps a consistent footprint in the grid.
            <div
              className="rounded-md"
              style={{
                gridColumn: "1 / -1",
                aspectRatio: "3 / 2",
                background: "var(--surface-default)",
                border: "1px solid var(--border-default)",
              }}
            />
          )}
        </div>
        <Stack gap="100">
          <Headline
            level={3}
            className="line-clamp-2"
            style={{
              fontSize: "var(--p-md-font-size)",
              lineHeight: "var(--p-md-line-height)",
            }}
          >
            {title}
          </Headline>
          {/* The count is the offer: depth of the franchise, in Malcolm's
              "logged" framing (the reviewed corpus, not everything seen). */}
          <Kicker>
            {count.toLocaleString()} {unitLabel} logged
          </Kicker>
        </Stack>
      </Stack>
    </NextLink>
  );
}
