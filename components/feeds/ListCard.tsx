// ─────────────────────────────────────────────────────────────────
// ListCard — a curated-list card for the editorial landings' "Lists"
// module. Models the /music Collections pattern (a named grouping
// with a cover + count) applied to film/TV lists.
//
// Cover is up to three representative posters from the list (resolved
// from the corpus by the page, in list order) so the card reads as
// "a collection" at a glance. Below: the list title, a film count,
// and the list's prose description — which for Malcolm's ranked lists
// is the ranking methodology ("star rating disregarded and fully
// editorialized"), the editorial voice we surface rather than per-film
// blurbs. Links to the list-detail page.
//
// No "use client" — pure presentational.
// ─────────────────────────────────────────────────────────────────

import Image from "next/image";
import NextLink from "next/link";
import type { CSSProperties } from "react";
import { Stack } from "@/components/layout/Stack";
import { Headline } from "@/components/typography/Headline";
import { Kicker } from "@/components/typography/Kicker";
import { Body } from "@/components/typography/Body";

export function ListCard({
  href,
  title,
  count,
  unit = { one: "film", other: "films" },
  tags,
  description,
  coverPosterUrls,
}: {
  href: string;
  title: string;
  /** Total entries in the list (not just the ones with covers). */
  count: number;
  /** Singular/plural noun for the count line (default film/films; TV
   *  passes pick/picks since its lists rank seasons, not films). */
  unit?: { one: string; other: string };
  /** Small uppercase mono chips above the title — the hub passes the
   *  scope + method axis labels so a card is legible without its long
   *  title. Omitted on the landing teaser. */
  tags?: string[];
  /** List prose / ranking methodology. Clamped to 3 lines. */
  description?: string;
  /** Up to three poster URLs (corpus-resolved, list order) for the
   *  cover montage. Fewer is fine; an empty array renders a flat
   *  placeholder cover so the card still has a consistent height. */
  coverPosterUrls: string[];
}) {
  const covers = coverPosterUrls.slice(0, 3);
  return (
    <NextLink
      href={href}
      className="block h-full focus-visible:outline-2 focus-visible:outline-offset-4"
      style={{ textDecoration: "none", outlineColor: "var(--border-focus)" }}
    >
      <Stack gap="300" className="h-full">
        {/* Cover montage — a 3-up row of mini posters. Each is its own
            2:3 box so the row reads as "a stack of films" without the
            clipping fragility of overlapping absolute positioning. */}
        <div style={{ display: "flex", gap: 6 }} aria-hidden="true">
          {covers.length > 0 ? (
            covers.map((url, i) => (
              <div
                key={i}
                className="relative overflow-hidden rounded-md"
                style={{
                  flex: 1,
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
            <div
              className="rounded-md"
              style={{
                flex: 1,
                aspectRatio: "3 / 2",
                background: "var(--surface-default)",
                border: "1px solid var(--border-default)",
              }}
            />
          )}
        </div>
        <Stack gap="100">
          {/* Axis chips (scope · method) — let a card read at a glance
              even when four same-year titles look alike. */}
          {tags && tags.length > 0 ? (
            <div
              style={{ display: "flex", flexWrap: "wrap", gap: 6 }}
              aria-hidden="true"
            >
              {tags.map((tag) => (
                <span
                  key={tag}
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "var(--p-xs-font-size)",
                    lineHeight: "var(--p-xs-line-height)",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    color: "var(--text-caption)",
                    border: "1px solid var(--border-default)",
                    borderRadius: 4,
                    padding: "1px 6px",
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          ) : null}
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
          <Kicker>
            {count.toLocaleString()} {count === 1 ? unit.one : unit.other}
          </Kicker>
          {description ? (
            <Body
              size="sm"
              className="line-clamp-3"
              style={
                {
                  color: "var(--text-body)",
                  // Cards are narrow; drop Body's 60ch prose cap so the
                  // description fills the card width before clamping.
                  maxWidth: "none",
                } as CSSProperties
              }
            >
              {description}
            </Body>
          ) : null}
        </Stack>
      </Stack>
    </NextLink>
  );
}
