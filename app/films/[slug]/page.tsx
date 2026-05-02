// ─────────────────────────────────────────────────────────────────
// /films/[slug] — single-film detail page.
//
// Structure (compact, designed to live primarily above the fold):
//   1. Back link — "← All films" mono caption.
//   2. Hero block — poster (left) + title block (right) with kicker,
//      title, metadata line, rating/liked/dateline row, genre chips,
//      and "View on Letterboxd ↗" link inside the same block.
//   3. Review stack — every prose review newest-first, with a
//      watched/reviewed dateline, stars, rewatch + spoilers pills,
//      and the prose split on \n\n into <p> blocks.
//
// No TMDB backdrop band — clean page background instead so the
// hero is tight and the review prose surfaces quickly. Backdrop
// experiment removed 2026-05-02 (visual review).
//
// Snapshot-only at request time: getFilmBySlug() reads
// lib/feeds/_fixtures/letterboxd-snapshot.json directly. No live
// API path. Free of rate limits, deterministic latency.
//
// Slug format: `<letterboxdSlug>-<releaseYear>` — human-readable
// and SEO-friendly. The data layer also resolves old `tmdb-<id>`
// URLs so existing links don't break.
// ─────────────────────────────────────────────────────────────────

import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Container } from "@/components/layout/Container";
import { Section } from "@/components/layout/Section";
import { Stack } from "@/components/layout/Stack";
import { Display } from "@/components/typography/Display";
import { Kicker } from "@/components/typography/Kicker";
import { Link } from "@/components/primitives/Link";
import { StarRating } from "@/components/primitives/StarRating";
import { getFilmBySlug } from "@/lib/feeds/letterboxd";
import {
  formatRuntime,
  formatWatchedDate,
  type Review,
} from "@/lib/feeds/letterboxd-utils";
import { BackToFilms } from "./BackToFilms";

type Params = { slug: string };

// ─── SEO metadata ────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const film = getFilmBySlug(slug);
  if (!film) {
    return {
      title: "Film not found",
      alternates: { canonical: `/films/${slug}` },
    };
  }
  // Description = first ~155 chars of most recent review prose,
  // stripped of paragraph breaks. Letterboxd's profile uses this
  // same approach for OG/SERP snippets.
  const review = film.reviews[0];
  const trimmedProse = review
    ? review.reviewText.replace(/\s+/g, " ").trim()
    : "";
  const description =
    trimmedProse.length > 155
      ? `${trimmedProse.slice(0, 152)}…`
      : trimmedProse ||
        `Review of ${film.title} (${film.releaseYear}) by Malcolm Xavier.`;

  return {
    title: `${film.title} (${film.releaseYear})`,
    description,
    alternates: {
      canonical: `/films/${film.letterboxdSlug}-${film.releaseYear}`,
    },
    openGraph: {
      title: `${film.title} (${film.releaseYear})`,
      description,
      // Poster as the OG image. The on-page backdrop band was
      // removed (visual review 2026-05-02), but the backdrop is
      // still useful for unfurls — fall through to it as a wider
      // alternative when the poster path is missing.
      images: film.posterUrl
        ? [{ url: film.posterUrl, alt: `${film.title} poster` }]
        : film.tmdb?.backdropPath
          ? [
              {
                url: `https://image.tmdb.org/t/p/w1280${film.tmdb.backdropPath}`,
                width: 1280,
                height: 720,
                alt: `${film.title} backdrop`,
              },
            ]
          : undefined,
    },
  };
}

// ─── Page ────────────────────────────────────────────────────────

export default async function FilmDetailPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const film = getFilmBySlug(slug);
  if (!film) notFound();

  return (
    <div data-subbrand="film">
      <Container size="lg">
        {/* Back link sits above the hero. Spacing tuned so the
            link clears the nav and never collides with the poster
            below it (no negative-margin tricks now that the
            backdrop is gone). */}
        <div
          style={{
            paddingTop: "var(--scale-600)",
            paddingBottom: "var(--scale-400)",
          }}
        >
          <BackToFilms />
        </div>

        {/* ─── Hero (poster + title block) ─────────────────────── */}
        <Section padding="sm">
          <div
            // 200px poster column on md+, full-width title block on
            // narrow viewports. Items align-end so the title block's
            // baseline sits flush with the bottom of the poster on
            // desktop — gives the hero a "movie poster sitting on a
            // marquee" rhythm.
            className="grid grid-cols-1 gap-6 md:grid-cols-[200px_1fr] md:items-end md:gap-8 lg:grid-cols-[240px_1fr] lg:gap-10"
          >
            {film.posterUrl ? (
              <div
                className="relative w-full overflow-hidden rounded-md"
                style={{
                  aspectRatio: "2 / 3",
                  background: "var(--surface-default)",
                  border: "1px solid var(--border-default)",
                }}
              >
                <Image
                  src={film.posterUrl}
                  alt={`${film.title} poster`}
                  fill
                  sizes="(max-width: 768px) 80vw, 240px"
                  style={{ objectFit: "cover" }}
                  priority
                />
              </div>
            ) : null}

            <Stack gap="400">
              <Kicker accent>Film</Kicker>
              <Display>{film.title}</Display>
              <p style={metadataLineStyle}>
                {film.releaseYear}
                {film.tmdb?.director ? (
                  <>
                    {" · dir. "}
                    {film.tmdb.director}
                  </>
                ) : null}
                {film.tmdb?.runtime ? (
                  <>
                    {" · "}
                    {formatRuntime(film.tmdb.runtime)}
                  </>
                ) : null}
              </p>
              {/* Primary rating + liked + first-watched dateline.
                  Matches the card's compact info row but expanded
                  for the detail context (showEmpty so the 5-point
                  scale reads at a glance). */}
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  gap: 16,
                }}
              >
                {film.primaryRating !== null ? (
                  <StarRating
                    rating={film.primaryRating}
                    size={20}
                    showEmpty
                  />
                ) : null}
                {film.liked ? (
                  <span
                    aria-label="Liked"
                    title="Liked"
                    style={{
                      fontSize: 18,
                      color: "var(--green-800)",
                    }}
                  >
                    ♥
                  </span>
                ) : null}
                <span style={metadataLineStyle}>
                  First watched {formatWatchedDate(film.firstWatchedDate)}
                </span>
              </div>
              {/* Genre chips */}
              {film.tmdb?.genres && film.tmdb.genres.length > 0 ? (
                <ul
                  role="list"
                  style={{
                    listStyle: "none",
                    padding: 0,
                    margin: 0,
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 8,
                  }}
                >
                  {film.tmdb.genres.map((g) => (
                    <li key={g}>
                      <span style={genreChipStyle}>{g}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
              {/* External CTA — sits inside the title block (not as
                  a separate Section) so the page stays compact and
                  above-the-fold. ↗ is the convention for external
                  links per CTA-arrow rules. */}
              <p style={{ margin: 0 }}>
                <Link href={film.letterboxdUrl}>
                  View on Letterboxd ↗
                </Link>
              </p>
            </Stack>
          </div>
        </Section>

        {/* ─── Review stack ───────────────────────────────────── */}
        <Section padding="md" bordered>
          <Stack gap="800">
            {film.reviews.map((review, i) => (
              <ReviewBlock
                key={`${review.reviewDate}-${i}`}
                review={review}
                isFirst={i === 0}
                isLast={i === film.reviews.length - 1}
              />
            ))}
          </Stack>
        </Section>
      </Container>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────

function ReviewBlock({
  review,
  isFirst,
  isLast,
}: {
  review: Review;
  isFirst: boolean;
  isLast: boolean;
}) {
  const paragraphs = review.reviewText.split(/\n\s*\n/).filter(Boolean);
  const sameDay = review.watchedDate === review.reviewDate;
  return (
    <article>
      <Stack gap="400">
        {/* Dateline — watched / reviewed. Collapses to a single
            "Watched & reviewed" line when both dates match (which
            is the common case in Malcolm's diary). */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: 12,
          }}
        >
          <p style={{ ...metadataLineStyle, margin: 0 }}>
            {sameDay
              ? `Watched & reviewed ${formatWatchedDate(review.watchedDate)}`
              : `Watched ${formatWatchedDate(review.watchedDate)} · Reviewed ${formatWatchedDate(review.reviewDate)}`}
          </p>
          {review.rating !== null ? (
            <StarRating rating={review.rating} size={16} />
          ) : null}
          {review.rewatch ? <Pill>Rewatch</Pill> : null}
          {review.containsSpoilers ? (
            <Pill tone="warning">Contains spoilers</Pill>
          ) : null}
          {!isFirst && !isLast ? null : null}
        </div>
        {/* Prose — paragraphs are split on blank lines. Render
            each as a <p> so screen readers + reading-mode tools
            see the structure clearly. */}
        <div>
          {paragraphs.map((para, i) => (
            <p
              key={i}
              style={{
                fontFamily: "var(--font-secondary)",
                fontSize: "var(--p-md-font-size)",
                lineHeight: "var(--p-md-line-height)",
                color: "var(--text-body)",
                margin: 0,
                marginBottom: i < paragraphs.length - 1 ? "1em" : 0,
              }}
            >
              {para}
            </p>
          ))}
        </div>
      </Stack>
    </article>
  );
}

function Pill({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "warning";
}) {
  return (
    <span
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: 11,
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        padding: "3px 8px",
        borderRadius: "var(--border-radius-sm)",
        border: "1px solid var(--border-default)",
        color:
          tone === "warning"
            ? "var(--text-warning, var(--text-body))"
            : "var(--text-caption)",
        background: "var(--surface-elevated)",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

// ─── Inline styles ───────────────────────────────────────────────

const metadataLineStyle = {
  fontFamily: "var(--font-mono)",
  fontSize: "var(--p-sm-font-size)",
  lineHeight: "var(--p-sm-line-height)",
  color: "var(--text-caption)",
  letterSpacing: "0.04em",
  margin: 0,
} as const;

const genreChipStyle = {
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  textTransform: "uppercase" as const,
  letterSpacing: "0.08em",
  padding: "4px 10px",
  borderRadius: "999px",
  border: "1px solid var(--border-default)",
  color: "var(--text-caption)",
  background: "transparent",
  whiteSpace: "nowrap" as const,
};

