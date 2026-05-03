// ─────────────────────────────────────────────────────────────────
// /films/[slug] — single-film detail page.
//
// Structure:
//   1. Back link — "← All films" mono caption.
//   2. Hero block — poster (left) + title block (right) with kicker,
//      title, metadata line, rating/liked/dateline row, genre chips
//      (links to /films?genre=…), and "View on Letterboxd ↗".
//   3. Review stack — sits in a column that mirrors the hero's right
//      column on md+ (poster-width spacer on the left, prose column
//      on the right) so the prose lines up under the title block and
//      the page reads as a single right-pinned content axis. Prose
//      clamps to maxWidth: 65ch for reading comfort. Multi-review
//      films get a TOC at the top (anchors to each <article
//      id="review-N">). Each review's dateline renders as an <h2>
//      for a coherent document outline (h1=film title).
//   4. Adjacent reviews — chronological prev/next neighbors at the
//      bottom, walking the snapshot's films array (sorted by
//      latestWatchedDate desc to match the listing default). Spans
//      the full hero footprint (NOT right-pinned with the prose) so
//      the bottom of the page reads as page-level navigation. Newer
//      is on the LEFT, older on the RIGHT — inverts the universal
//      timeline convention to match the /films listing's "further
//      right = older" reading order, since the listing is the
//      primary entry path on-site.
//
// Review markup: prose is rendered through renderReviewMarkup which
// turns Letterboxd's `<i>…</i>` tags (the only inline markup the
// snapshot currently carries) into proper <em> nodes. Other HTML
// tags fall through as literal text — extend the parser if the
// allowlist needs to grow.
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
//
// JSON-LD: Review + BreadcrumbList emitted in a single @graph block
// at the top of the body. See buildPageJsonLd for the shape.
// ─────────────────────────────────────────────────────────────────

import type { Metadata } from "next";
import Image from "next/image";
import NextLink from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/layout/Container";
import { Section } from "@/components/layout/Section";
import { Stack } from "@/components/layout/Stack";
import { Display } from "@/components/typography/Display";
import { Kicker } from "@/components/typography/Kicker";
import { Link } from "@/components/primitives/Link";
import { StarRating } from "@/components/primitives/StarRating";
import { getFilmBySlug, getFilms } from "@/lib/feeds/letterboxd";
import {
  formatRuntime,
  formatWatchedDate,
  slugifyGenre,
  type Film,
  type Review,
} from "@/lib/feeds/letterboxd-utils";
import { TrackOnClick } from "@/components/analytics/TrackOnClick";
import { ANALYTICS_EVENTS } from "@/lib/analytics";
import { SITE_URL } from "@/lib/site-config";
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

  // OG image: prefer TMDB backdrop (1280×720, landscape, fits OG
  // renderer specs) over the poster. /films originally tried the
  // poster first but its w342 fallback was sub-spec — LinkedIn /
  // Slack / iMessage discard sub-600px images. Use w780 for the
  // poster fallback so the rare film without a backdrop still
  // unfurls cleanly. Closes films-detail-og-image-portrait-tiny.
  const ogImages = film.tmdb?.backdropPath
    ? [
        {
          url: `https://image.tmdb.org/t/p/w1280${film.tmdb.backdropPath}`,
          width: 1280,
          height: 720,
          alt: `${film.title} backdrop`,
        },
      ]
    : film.posterUrl
      ? [
          {
            // Stored posterUrl is w342 (sub-spec). Bump to w780 for
            // OG so the unfurl image clears the renderer threshold.
            url: film.posterUrl.replace("/t/p/w342/", "/t/p/w780/"),
            width: 780,
            height: 1170,
            alt: `${film.title} poster`,
          },
        ]
      : undefined;

  return {
    // .absolute bypasses the root layout's "%s—Malcolm Xavier"
    // template so we can inject "Reviews by Malcolm Xavier" — the
    // long-tail anchor for queries like "the substance malcolm
    // xavier review". Em-dash without spaces per project voice.
    title: {
      absolute: `${film.title} (${film.releaseYear})—Reviews by Malcolm Xavier`,
    },
    description,
    alternates: {
      canonical: `/films/${film.letterboxdSlug}-${film.releaseYear}`,
    },
    openGraph: {
      title: `${film.title} (${film.releaseYear})`,
      description,
      url: `/films/${film.letterboxdSlug}-${film.releaseYear}`,
      type: "article",
      images: ogImages,
    },
    // Twitter / X / Perplexity card. Without this, every detail
    // page inherits the sitewide bio card as twitter:title/desc.
    // Closes films-detail-twitter-card-wrong.
    twitter: {
      card: "summary_large_image",
      title: `${film.title} (${film.releaseYear})`,
      description,
      images: ogImages?.map((img) => img.url),
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

  // Adjacent-review neighbors for the bottom nav — closes the
  // dead-end finding (films-related-films-internal-links). The
  // snapshot's films array is pre-sorted by latestWatchedDate desc
  // (matches the listing default sort), so we can walk neighbors
  // by index without re-sorting. idx-1 is the next-newer review,
  // idx+1 is the next-older. Each neighbor is null at the array
  // boundary so the nav gracefully omits the missing direction.
  const { films: allFilms } = getFilms();
  const idx = allFilms.findIndex((f) => f.id === film.id);
  const newerFilm = idx > 0 ? allFilms[idx - 1] : null;
  const olderFilm =
    idx >= 0 && idx + 1 < allFilms.length ? allFilms[idx + 1] : null;

  // Hero dateline rule mirrors FilmCard.tsx: when every review on
  // this film is a rewatch, surface "Rewatched" against the earliest
  // rewatch date so the hero doesn't lie about a "First watched"
  // event that never happened (Malcolm logged the film for the first
  // time only after the first watch). When at least one review is a
  // first-watch, the default "First watched" + firstWatchedDate is
  // accurate. Closes films-detail-no-rewatch-check.
  const allRewatches =
    film.reviews.length > 0 && film.reviews.every((r) => r.rewatch);
  const heroDatelineLabel = allRewatches ? "Rewatched" : "First watched";
  const heroDatelineDate = allRewatches
    ? // Fall back to firstWatchedDate if reviews[] is somehow empty
      // — defensive only; the predicate above guarantees length > 0.
      film.reviews[film.reviews.length - 1]?.watchedDate ?? film.firstWatchedDate
    : film.firstWatchedDate;

  // Combined JSON-LD payload — Review (per existing structure) plus
  // a 2-level BreadcrumbList (Films → {Title}). Emitted as a single
  // @graph array so crawlers parse one block. Closes
  // films-detail-no-breadcrumb-jsonld.
  const jsonLd = buildPageJsonLd(film);

  return (
    <div data-subbrand="film">
      <script
        type="application/ld+json"
        // Server-rendered into the body so AI crawlers + Googlebot
        // see the schema in the initial HTML response. Stringify
        // here (not React-serialized) to keep the JSON shape exact.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
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
                    role="img"
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
                  {heroDatelineLabel}{" "}
                  {formatWatchedDate(heroDatelineDate)}
                </span>
              </div>
              {/* Genre chips — link to the dedicated genre route
                  (/films/genre/<slug>) which is the canonical SEO
                  entry point for that genre. Crawlers reading detail
                  pages discover the genre routes via these links;
                  human readers get a "more like this" affordance
                  without committing to a curated rail (the editorial
                  half of films-related-films-internal-links lives on
                  in films-detail-dead-end, parked post-launch). The
                  .film-detail-genre-chip class keeps the chip's
                  resting color quiet and shifts to orange on
                  hover/focus — see app/components.css for the
                  override against the cluster's loud-link rule. */}
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
                      <NextLink
                        href={`/films/genre/${slugifyGenre(g)}`}
                        className="film-detail-genre-chip"
                        style={genreChipStyle}
                      >
                        {g}
                      </NextLink>
                    </li>
                  ))}
                </ul>
              ) : null}
              {/* External CTA — sits inside the title block (not as
                  a separate Section) so the page stays compact and
                  above-the-fold. ↗ is the convention for external
                  links per CTA-arrow rules. */}
              <p style={{ margin: 0 }}>
                <TrackOnClick
                  event={ANALYTICS_EVENTS.LETTERBOXD_CLICK}
                  eventData={{ kind: "film-detail", surface: "film-detail-hero" }}
                >
                  <Link href={film.letterboxdUrl}>
                    View on Letterboxd ↗
                  </Link>
                </TrackOnClick>
              </p>
            </Stack>
          </div>
        </Section>

        {/* ─── Review stack ───────────────────────────────────── */}
        {/* The outer grid mirrors the hero's poster + title-block
            layout so the prose column lines up under the title
            block, leaving the poster column visually balanced by
            negative space below. maxWidth: 65ch clamps the inner
            column to a comfortable reading measure (≈60-75ch is
            the typographic sweet spot; full container width was
            running ~110ch on desktop and making longer reviews
            uncomfortable to read). On mobile (<md) the grid
            collapses to a single column and the spacer drops out,
            so the prose flows full-width with the same 65ch cap.
            Closes films-detail-prose-too-wide. */}
        <Section padding="md" bordered>
          <div className="md:grid md:grid-cols-[200px_1fr] md:gap-8 lg:grid-cols-[240px_1fr] lg:gap-10">
            {/* Spacer mirrors the poster column on md+; on mobile
                this div renders but takes no space (no margin/
                padding, no children) so the prose stays flush-left.
                aria-hidden so SR users don't get an extra empty
                landmark. */}
            <div aria-hidden="true" />
            <div style={{ maxWidth: "65ch" }}>
              <Stack gap="800">
                {/* Multi-review TOC — anchors to each review
                    article by index. Activates as soon as a film
                    has two or more prose reviews (rewatches with
                    prose). Closes films-detail-no-toc. */}
                {film.reviews.length >= 2 ? (
                  <ReviewToc reviews={film.reviews} />
                ) : null}
                {film.reviews.map((review, i) => (
                  <ReviewBlock
                    key={`${review.reviewDate}-${i}`}
                    review={review}
                    reviewIndex={i}
                  />
                ))}
              </Stack>
            </div>
          </div>
        </Section>

        {/* ─── Adjacent reviews (chronological prev/next) ──────
            Sibling-to-sibling links between detail pages. Cheaper
            close on films-related-films-internal-links than the
            curated rail in films-detail-dead-end (the rail is
            parking-lotted post-launch — needs more editorial
            consideration).

            Span: full container width — matches the hero's footprint
            so the nav reads as page-level navigation rather than a
            continuation of the right-pinned prose column above. The
            two cards anchor flush to the left and right edges of the
            section, giving the bottom of the page a clean two-anchor
            symmetry that the prose column intentionally doesn't carry.

            Direction layout: newer LEFT, older RIGHT. The /films
            listing sorts latestWatchedDate desc — top-left is
            newest, bottom-right is oldest — so a reader arriving
            from the listing carries "further right = older" as
            their mental model. Matching that here keeps the
            chronological direction consistent with the listing
            traversal even though it inverts the universal
            "newer = right" timeline convention. The explicit
            "Older review" / "Newer review" labels disambiguate
            for cold visitors who didn't come from /films.

            Source order is newer-first so mobile (single-column
            stack) puts newer on top, older on bottom — same
            top-down chronology as the listing. */}
        {(newerFilm || olderFilm) ? (
          <Section padding="md" bordered>
            <nav
              aria-label="Adjacent reviews"
              className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8"
            >
              {newerFilm ? (
                <NeighborLink film={newerFilm} direction="newer" />
              ) : (
                <span aria-hidden="true" />
              )}
              {olderFilm ? (
                <NeighborLink film={olderFilm} direction="older" />
              ) : (
                <span aria-hidden="true" />
              )}
            </nav>
          </Section>
        ) : null}
      </Container>
    </div>
  );
}

// ─── JSON-LD ─────────────────────────────────────────────────────

/**
 * Build the page-level JSON-LD payload — Review schema (per existing
 * structure) plus a 2-level BreadcrumbList (Films → {Title}). Both
 * land in a single @graph array so crawlers parse one block; Google
 * also accepts separate <script> blocks but @graph keeps the source
 * tighter and matches the layout-level entity graph in app/layout.tsx.
 *
 * Closes both films-detail-no-jsonld (Review) and
 * films-detail-no-breadcrumb-jsonld (BreadcrumbList).
 *
 * The Review block is eligible for Google's review-rich-result,
 * Perplexity's structured consumption, and entity association with
 * the Movie via sameAs to TMDB. The Author is given a stable @id so
 * cross-page entity consolidation works if /author/* ever ships.
 *
 * The BreadcrumbList helps SERP rich results render a clean URL
 * trail ("malxavi.com › Films › The Substance") and gives AI
 * crawlers the cluster hierarchy without parsing the URL path.
 */
function buildPageJsonLd(film: Film) {
  const review = film.reviews[0];
  const detailUrl = `${SITE_URL}/films/${film.letterboxdSlug}-${film.releaseYear}`;
  const breadcrumb = {
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Films",
        item: `${SITE_URL}/films`,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: `${film.title} (${film.releaseYear})`,
        item: detailUrl,
      },
    ],
  };
  // No prose review on the film: still emit the breadcrumb so the
  // SERP gets the URL trail, but skip the Review block entirely.
  // The current snapshot's predicate (reviewText !== "") guarantees
  // every detail page has at least one review, so this is defensive.
  if (!review) {
    return { "@context": "https://schema.org", "@graph": [breadcrumb] };
  }
  const ratingValue = review.rating;
  const reviewBlock = {
    "@type": "Review",
    itemReviewed: {
      "@type": "Movie",
      name: film.title,
      datePublished: String(film.releaseYear),
      ...(film.tmdb?.director
        ? { director: { "@type": "Person", name: film.tmdb.director } }
        : {}),
      ...(film.tmdb?.id
        ? { sameAs: `https://www.themoviedb.org/movie/${film.tmdb.id}` }
        : {}),
      ...(film.tmdb?.genres && film.tmdb.genres.length > 0
        ? { genre: film.tmdb.genres }
        : {}),
    },
    ...(ratingValue !== null
      ? {
          reviewRating: {
            "@type": "Rating",
            ratingValue,
            bestRating: 5,
            worstRating: 0.5,
          },
        }
      : {}),
    author: {
      "@type": "Person",
      name: "Malcolm Xavier",
      "@id": `${SITE_URL}/#person`,
    },
    datePublished: review.reviewDate,
    reviewBody: review.reviewText,
  };
  return {
    "@context": "https://schema.org",
    "@graph": [reviewBlock, breadcrumb],
  };
}

// ─── Markup helpers ──────────────────────────────────────────────

/**
 * Render a Letterboxd review paragraph with inline markup as React
 * nodes. Letterboxd preserves a small set of HTML tags in the CSV
 * export — surveying the current snapshot turned up only `<i>…</i>`
 * (130 occurrences across 741 films) — so this parser handles that
 * single case and falls through to plain text everywhere else.
 *
 * Why this and not dangerouslySetInnerHTML: even though the input
 * is trusted (Malcolm's own reviews from his own CSV export), an
 * allowlist parser keeps the rendering surface explicitly bounded.
 * If a future review introduces `<a>` or `<b>` we extend the parser
 * rather than widen an HTML-injection point. Returns a flat array
 * of strings + <em> elements suitable for direct rendering inside
 * a <p>.
 *
 * If a `<i>` tag has nested or unclosed markup the regex won't
 * match and the literal text falls through unchanged — the same
 * "broken markup shows as written" failure mode dangerouslySetInner-
 * HTML would also exhibit.
 */
function renderReviewMarkup(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  // Non-greedy match of <i>...</i> with no nested tags. The [^<]
  // class prevents the regex from spanning a sibling tag — a defensive
  // measure if Letterboxd ever introduces multi-tag markup.
  const re = /<i>([^<]*)<\/i>/gi;
  let lastIdx = 0;
  let key = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > lastIdx) parts.push(text.slice(lastIdx, m.index));
    parts.push(<em key={`em-${key++}`}>{m[1]}</em>);
    lastIdx = re.lastIndex;
  }
  if (lastIdx < text.length) parts.push(text.slice(lastIdx));
  // Pure-text paragraphs return a single-element array of the
  // original string. Single-element arrays render identically to
  // plain text in React, so no change in DOM shape.
  return parts.length > 0 ? parts : [text];
}

// ─── Sub-components ──────────────────────────────────────────────

function ReviewBlock({
  review,
  reviewIndex,
}: {
  review: Review;
  reviewIndex: number;
}) {
  const paragraphs = review.reviewText.split(/\n\s*\n/).filter(Boolean);
  // Stable anchor id so the multi-review TOC and any external deep
  // link (#review-0, #review-1, …) land on the matching article.
  // Index over watchedDate keeps the id bulletproof against the rare
  // case of two reviews sharing a watch date within one film.
  const anchorId = `review-${reviewIndex}`;
  return (
    <article id={anchorId}>
      <Stack gap="400">
        {/* Dateline as an h2 so the page outline reads h1=film,
            h2=watch-event for each review article. Closes
            films-detail-article-no-headings — VoiceOver / TalkBack
            users navigating by article landmark or H shortcut now
            land on a heading that names which review they're in.
            Visual treatment matches the prior <p> exactly: same
            mono caption style, no margins, sits on the same flex
            row as stars + pills. Review-date is intentionally
            omitted from this dateline — the publish date is
            internal-only metadata; the user-facing event is when
            the film was watched. */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: 12,
          }}
        >
          <h2
            style={{
              ...metadataLineStyle,
              margin: 0,
              // The metadataLineStyle's font-size is p-sm; we keep
              // that here intentionally so the visual rhythm doesn't
              // shift. The h2 is for SR / outline parsing, not a
              // visual hierarchy bump.
              fontWeight: "inherit",
            }}
          >
            Watched {formatWatchedDate(review.watchedDate)}
          </h2>
          {review.rating !== null ? (
            <StarRating rating={review.rating} size={16} />
          ) : null}
          {review.rewatch ? <Pill>Rewatch</Pill> : null}
          {review.containsSpoilers ? (
            <Pill tone="warning">Contains spoilers</Pill>
          ) : null}
        </div>
        {/* Prose — paragraphs are split on blank lines. Render
            each as a <p> so screen readers + reading-mode tools
            see the structure clearly. renderReviewMarkup turns
            the raw Letterboxd HTML (currently just <i>…</i> for
            italics; see parseReviewMarkup notes) into proper
            React <em> nodes so titles like "<i>Splitsville</i>"
            render as italics instead of literal angle-bracket
            text. */}
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
              {renderReviewMarkup(para)}
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

/**
 * In-page TOC for multi-review detail pages. Activates when a film
 * has 2+ prose reviews (rewatches with a written take); single-
 * review films skip rendering at the call site. Each link anchors
 * to the matching <article id="review-N"> via index — same indexing
 * the ReviewBlock applies to its anchorId.
 *
 * The TOC is wrapped in <nav aria-label="Reviews on this page"> so
 * SR users get a navigation landmark distinct from the page chrome.
 * Closes films-detail-no-toc.
 */
function ReviewToc({ reviews }: { reviews: Review[] }) {
  return (
    <nav
      aria-label="Reviews on this page"
      style={{
        padding: "var(--scale-300) var(--scale-400)",
        borderRadius: "var(--border-radius-sm)",
        border: "1px solid var(--border-default)",
        background: "var(--surface-elevated)",
      }}
    >
      <p
        style={{
          ...metadataLineStyle,
          marginBottom: "var(--scale-200)",
          textTransform: "uppercase",
        }}
      >
        Reviews on this page · {reviews.length}
      </p>
      <ul
        role="list"
        style={{
          listStyle: "none",
          padding: 0,
          margin: 0,
          display: "flex",
          flexDirection: "column",
          gap: "var(--scale-200)",
        }}
      >
        {reviews.map((review, i) => (
          <li key={`${review.reviewDate}-${i}`}>
            {/* Plain anchor — same-page hash. The Link primitive's
                hash branch routes through <a> which is what we want
                here, but a direct <a> keeps the markup minimal. */}
            <a
              href={`#review-${i}`}
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "var(--p-sm-font-size)",
                color: "var(--text-action)",
                textDecoration: "underline",
                textUnderlineOffset: 4,
                textDecorationThickness: 1,
              }}
            >
              Watched {formatWatchedDate(review.watchedDate)}
              {review.rating !== null ? ` · ${review.rating}★` : ""}
              {review.rewatch ? " · Rewatch" : ""}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/**
 * Adjacent-review link used at the bottom of every detail page.
 * Renders a kicker, the film title, and the watched date so the
 * reader can preview where the link goes before clicking.
 *
 * Direction controls arrow placement and text alignment to match
 * the parent grid's positional layout:
 *   - direction="newer" sits on the LEFT, flush-left, "← Newer
 *     review" kicker (left arrow points to where the card itself
 *     sits inside the parent layout).
 *   - direction="older" sits on the RIGHT, flush-right, "Older
 *     review →" kicker (right arrow points to where the card
 *     itself sits).
 *
 * The newer/older positional choice lives at the call site (see
 * the Adjacent-reviews comment in FilmDetailPage) and is driven by
 * mental-model continuity with the /films listing's left-to-right,
 * newer-to-older grid sort.
 *
 * Closes the crawl-graph half of films-related-films-internal-links.
 */
function NeighborLink({
  film,
  direction,
}: {
  film: Film;
  direction: "older" | "newer";
}) {
  const slug = `${film.letterboxdSlug}-${film.releaseYear}`;
  const isNewer = direction === "newer";
  const kicker = isNewer ? "← Newer review" : "Older review →";
  const align: "left" | "right" = isNewer ? "left" : "right";
  // Use the latestWatchedDate to match the listing's sort key, so
  // the date the user sees here is the same date that determines
  // the neighbor's position in the listing order.
  const datelineDate = film.latestWatchedDate;
  return (
    <NextLink
      href={`/films/${slug}`}
      // The neighbor link is a card-shaped affordance — wrapping
      // it in a single anchor keeps the entire title + dateline
      // tappable. focus-visible outline matches the FilmCard
      // pattern so keyboard users see a consistent focus ring
      // across grid + detail surfaces.
      className="block focus-visible:outline-2 focus-visible:outline-offset-4 rounded-sm"
      style={{
        outlineColor: "var(--border-focus)",
        textDecoration: "none",
        color: "inherit",
        textAlign: align,
      }}
    >
      <p style={{ ...metadataLineStyle, marginBottom: "var(--scale-200)" }}>
        {kicker}
      </p>
      <p
        style={{
          // p-lg (20px) reads as a neighbor-card title without
          // competing with the page's h1 (Display) above. No h-md
          // token exists in the type scale; sticking to the p-* row
          // keeps the rhythm aligned with the rest of the surface.
          fontFamily: "var(--font-primary)",
          fontSize: "var(--p-lg-font-size)",
          lineHeight: "var(--p-lg-line-height)",
          color: "var(--text-body)",
          margin: 0,
          marginBottom: "var(--scale-100)",
        }}
      >
        {film.title}{" "}
        <span style={{ color: "var(--text-caption)", fontWeight: 400 }}>
          ({film.releaseYear})
        </span>
      </p>
      <p style={{ ...metadataLineStyle, margin: 0 }}>
        Watched {formatWatchedDate(datelineDate)}
      </p>
    </NextLink>
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

