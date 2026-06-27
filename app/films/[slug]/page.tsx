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
import {
  getFilmBySlug,
  getFilmNeighbors,
  filmListsContaining,
} from "@/lib/feeds/letterboxd";
import {
  asString,
  formatRuntime,
  formatWatchedDate,
  slugifyGenre,
  filmFacetValues,
  type Film,
  type Review,
} from "@/lib/feeds/letterboxd-utils";
import { getFilmsWithEnrichment } from "@/lib/feeds/review-corpus";
import { getCollectionDetails } from "@/lib/feeds/enrichment";
import {
  indexableFilmCollections,
  filmCollectionsOfFilm,
  makeFilmFacetHref,
  type FilmFacetLink,
} from "@/lib/feeds/facet-index";
import { listShortLabel } from "@/lib/feeds/list-taxonomy";
import { slugifyEntity } from "@/lib/feeds/slug";
import {
  findFilmContextualNeighbors,
  describeFilmFilterContext,
} from "@/lib/feeds/film-neighbors";
import { TrackOnClick } from "@/components/analytics/TrackOnClick";
import { ANALYTICS_EVENTS } from "@/lib/analytics";
import { SITE_URL } from "@/lib/site-config";
import { BackToFilms } from "./BackToFilms";

type Params = { slug: string };
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

// ISR cache horizon for detail pages. The snapshot only changes on
// human-driven `npm run films:refresh`, so a 1-hour revalidation
// window is conservative — reviews don't drift mid-day. Sets
// `Cache-Control: s-maxage=3600, stale-while-revalidate` at the
// edge instead of the previous default `Cache-Control: no-cache`.
// Listing page intentionally stays uncached because filter+page
// state varies per URL.
export const revalidate = 3600;

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
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: SearchParams;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const film = getFilmBySlug(slug);
  if (!film) notFound();

  // Filter-aware adjacent-film nav. When the user arrived via a card
  // click, the listing threaded its URL as `?from=`; replay it so the
  // newer/older nav walks the SAME filtered+sorted set the user was
  // browsing. Without a usable `from`, fall back to getFilmNeighbors —
  // the chronological (latestWatchedDate desc) prev/next from a position
  // map built once at cache-load time (O(1)). Each neighbour is null at
  // the boundary so the nav gracefully omits the missing direction.
  //
  // The neighbour resolver needs the ENRICHED corpus (facet predicates +
  // collection membership read film.enrichment), unlike getFilmBySlug
  // above which only needs the snapshot.
  const fromParam = asString(sp.from);
  const { films, summary } = getFilmsWithEnrichment();
  const neighborCorpus = {
    films,
    genreDistribution: summary.genreDistribution,
    collections: indexableFilmCollections(
      films,
      getCollectionDetails(),
      new Date().getUTCFullYear(),
    ),
  };
  const contextual = findFilmContextualNeighbors(
    film.id,
    fromParam,
    neighborCorpus,
  );
  const { newer: newerFilm, older: olderFilm } =
    contextual ?? getFilmNeighbors(film.id);

  // A short "you came from …" breadcrumb derived from the same `from`
  // URL (e.g. "Keanu Reeves", "John Wick", "Drama · 5★"). Null when
  // there's nothing distinctive to surface.
  const filterContext = describeFilmFilterContext(fromParam, neighborCorpus);

  // Re-encode `from` so the neighbour links carry it forward — multi-hop
  // browsing (older → older → older) keeps replaying the original listing
  // and the back-link keeps returning to it.
  const neighborFrom = fromParam ? encodeURIComponent(fromParam) : null;

  // "Appears in" backlinks — the published lists this film is ranked in,
  // plus the routable collections it's part of. Both reuse the same gates
  // the lists/collections pages use, so every link lands on a real page.
  const listAppearances = filmListsContaining(film.letterboxdSlug);
  const partOfCollections = filmCollectionsOfFilm(
    films,
    getCollectionDetails(),
    new Date().getUTCFullYear(),
    film.id,
  );

  // Per-film facet block — surface the enrichment-backed facets (cast,
  // writing, language, country, studio, release shape, budget) as chip rows
  // that deep-link into the reviews funnel using the SAME vocabulary the
  // stats tiles use (shared makeFilmFacetHref, so the slug + route-vs-?param=
  // decision can't drift between the two surfaces). Each row is dropped when
  // the film carries no value for it (never an empty <dd>), so a thinly
  // enriched film renders a shorter block rather than blank rows. Release
  // decade is deliberately excluded: the release year is already in the
  // metadata line and we don't offer decade filtering from the detail page.
  const facetHref = makeFilmFacetHref(films);
  // `film` (from getFilmBySlug) rides the thin snapshot and carries no
  // enrichment; the enriched copy lives in the `films` corpus loaded above.
  // filmFacetValues reads film.enrichment, so resolve to the enriched film
  // (fall back to the thin one — directors/decades still resolve from tmdb).
  const enrichedFilm = films.find((f) => f.id === film.id) ?? film;
  const fv = filmFacetValues(enrichedFilm);
  // Cast and studios can run long; cap to the top-billed / lead labels so the
  // block stays a scannable rail, not a credits dump. filmActorNames returns
  // billing order and e.studios production order, so the caps keep the most
  // salient names. Capped silently (the full set lives on the dedicated facet
  // routes); CAST_CAP/STUDIO_CAP are the documented coverage cut.
  const CAST_CAP = 4;
  const STUDIO_CAP = 2;
  const allFactRows: {
    label: string;
    facet: FilmFacetLink;
    values: string[];
  }[] = [
    { label: "Cast", facet: "actors", values: fv.actors.slice(0, CAST_CAP) },
    {
      label: fv.writers.length > 1 ? "Writers" : "Writer",
      facet: "writers",
      values: fv.writers,
    },
    // Director is slotted after the writers (Malcolm's call) and rides the
    // thin tmdb snapshot, so it shows even on un-enriched films.
    {
      label: fv.directors.length > 1 ? "Directors" : "Director",
      facet: "directors",
      values: fv.directors,
    },
    {
      label: fv.languages.length > 1 ? "Languages" : "Language",
      facet: "languages",
      values: fv.languages,
    },
    {
      label: fv.countries.length > 1 ? "Countries" : "Country",
      facet: "countries",
      values: fv.countries,
    },
    {
      label: fv.studios.length > 1 ? "Studios" : "Studio",
      facet: "studios",
      values: fv.studios.slice(0, STUDIO_CAP),
    },
    { label: "Release", facet: "releaseTypes", values: fv.releaseTypes },
    { label: "Budget", facet: "budgetTiers", values: fv.budgetTiers },
  ];
  const factRows = allFactRows.filter((row) => row.values.length > 0);

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
      (film.reviews[film.reviews.length - 1]?.watchedDate ??
      film.firstWatchedDate)
    : film.firstWatchedDate;

  // Combined JSON-LD payload — Review (per existing structure) plus
  // a 2-level BreadcrumbList (Films → {Title}). Emitted as a single
  // @graph array so crawlers parse one block. Closes
  // films-detail-no-breadcrumb-jsonld.
  const jsonLd = buildPageJsonLd(film);

  // ── Discovery backlinks + external CTA (shared markup) ──────────
  // The "Part of …" / "Ranked …" backlinks plus the external "View on
  // Letterboxd" CTA render in two breakpoint-gated slots: inside the
  // hero's title block on md+ (via display:contents, so they flow as
  // normal Stack children with identical spacing), and relocated below
  // the review on mobile — where a tall hero would otherwise push the
  // first review under the fold. Defined once here so the two slots
  // can't drift apart.
  const appearsInBlock =
    partOfCollections.length > 0 || listAppearances.length > 0 ? (
      <Stack gap="100">
        {partOfCollections.length > 0 ? (
          <p style={{ margin: 0 }}>
            Part of{" "}
            {partOfCollections.map((c, i) => (
              <span key={c.key}>
                {i > 0
                  ? i === partOfCollections.length - 1
                    ? ", and "
                    : ", "
                  : ""}
                <Link href={`/films/collections/${slugifyEntity(c.name)}`}>
                  {c.name}
                </Link>
              </span>
            ))}
            .
          </p>
        ) : null}
        {listAppearances.length > 0 ? (
          <p style={{ margin: 0 }}>
            Ranked{" "}
            {listAppearances.map(({ list, position }, i) => (
              <span key={list.slug}>
                {i > 0
                  ? i === listAppearances.length - 1
                    ? ", and "
                    : ", "
                  : ""}
                <Link href={`/films/lists/${list.slug}`}>
                  #{position} in {listShortLabel(list.title)}
                </Link>
              </span>
            ))}
            .
          </p>
        ) : null}
      </Stack>
    ) : null;

  const viewOnLetterboxd = (
    <p style={{ margin: 0 }}>
      <TrackOnClick
        event={ANALYTICS_EVENTS.LETTERBOXD_CLICK}
        eventData={{ kind: "film-detail", surface: "film-detail-hero" }}
      >
        <Link href={film.letterboxdUrl}>View on Letterboxd ↗</Link>
      </TrackOnClick>
    </p>
  );

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
        {/* "You came from …" breadcrumb — names the listing context the
            visitor arrived from (mirrors the TV detail page). Caption-grey,
            above the text-action back link so the two read as distinct
            ("where you came from" vs "go back"). */}
        {filterContext ? (
          <div style={{ marginBottom: "var(--scale-400)" }}>
            <Kicker>Films · {filterContext}</Kicker>
          </div>
        ) : null}
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
                  // Cap the poster at 240px on narrow viewports so
                  // it doesn't fill the entire 375px first fold —
                  // class-audit fix from
                  // tv-detail-hero-poster-no-maxwidth-mobile.
                  // Desktop is unaffected (md+ constrains the
                  // column to 200/240px).
                  maxWidth: "240px",
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
              <Display size="h1-compact">{film.title}</Display>
              {/* Release year + runtime. Director used to sit here as
                  plain text; it now lives as an interactive chip in the
                  Cast & Crew disclosure below (after the writers), so a
                  reader can pivot to the director's other reviews. */}
              <p style={metadataLineStyle}>
                {film.releaseYear}
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
                  <StarRating rating={film.primaryRating} size={20} showEmpty />
                ) : null}
                {film.liked ? (
                  <span
                    role="img"
                    aria-label="Liked"
                    title="Liked"
                    className="star-rating-fill"
                    style={{ fontSize: 18 }}
                  >
                    ♥
                  </span>
                ) : null}
                <span style={metadataLineStyle}>
                  {heroDatelineLabel} {formatWatchedDate(heroDatelineDate)}
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
              {/* Cast & Crew — the per-film facet block (cast, writing,
                  director, language, country, studio, release shape, budget),
                  collapsed by default behind a native <details> disclosure so
                  it doesn't dominate the hero at any width (the rows are dense
                  and secondary to the rating/dateline). Native
                  <details>/<summary> keeps it a zero-JS, keyboard-operable
                  toggle on this server-rendered page; the chevron rotation is
                  CSS-only and reduced-motion-aware (see app/components.css).
                  Each row is a chip rail that deep-links into the reviews
                  funnel via dl/dt/dd; the div-per-row grouping is valid dl
                  content. The whole block is omitted when the film carries no
                  facets at all. */}
              {factRows.length > 0 ? (
                <details className="film-credits-disclosure">
                  <summary className="film-credits-summary">
                    <Kicker>Cast &amp; Crew</Kicker>
                    {/* Decorative state cue — CSS rotates it on [open]; the
                        <summary> itself carries the toggle semantics. */}
                    <svg
                      className="film-credits-chevron"
                      width="12"
                      height="12"
                      viewBox="0 0 12 12"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      aria-hidden="true"
                      focusable="false"
                    >
                      <path d="M2.5 4.5 L6 8 L9.5 4.5" />
                    </svg>
                  </summary>
                  <dl
                    style={{
                      margin: "var(--scale-300) 0 0",
                      display: "flex",
                      flexDirection: "column",
                      gap: "var(--scale-200)",
                    }}
                  >
                    {factRows.map((row) => (
                      <div
                        key={row.facet}
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          alignItems: "baseline",
                          gap: "var(--scale-300)",
                        }}
                      >
                        <dt
                          style={{
                            ...metadataLineStyle,
                            textTransform: "uppercase",
                            // Fixed label column on wide viewports so the chip
                            // rails align; on narrow ones the flex row wraps and
                            // the rail drops below its label.
                            minWidth: "5.5rem",
                            flexShrink: 0,
                          }}
                        >
                          {row.label}
                        </dt>
                        <dd style={{ margin: 0, flex: "1 1 12rem" }}>
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
                            {row.values.map((value) => {
                              const href = facetHref(row.facet, value);
                              return (
                                <li key={value}>
                                  {href ? (
                                    <NextLink
                                      href={href}
                                      className="film-detail-genre-chip"
                                      style={genreChipStyle}
                                    >
                                      {value}
                                    </NextLink>
                                  ) : (
                                    <span style={genreChipStyle}>{value}</span>
                                  )}
                                </li>
                              );
                            })}
                          </ul>
                        </dd>
                      </div>
                    ))}
                  </dl>
                </details>
              ) : null}
              {/* Discovery backlinks + external CTA. On md+ they close
                  out the hero's title block; display:contents makes this
                  wrapper layout-transparent so the children flow as
                  normal Stack items (identical gap/spacing to before).
                  On mobile they're hidden here and re-rendered below the
                  review (see the md:hidden Section after the review
                  stack), so the first review peeks above the fold rather
                  than being pushed down by this block. */}
              <div className="hidden md:contents">
                {appearsInBlock}
                {viewOnLetterboxd}
              </div>
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
                    key={`${review.reviewDate}-${review.watchedDate}`}
                    review={review}
                    reviewIndex={i}
                  />
                ))}
              </Stack>
            </div>
          </div>
        </Section>

        {/* Mobile-only relocation of the hero's discovery backlinks +
            external CTA. Hidden on md+ (the same markup renders in the
            hero via display:contents); on mobile it sits directly below
            the review so the tall stacked hero doesn't push the review
            under the fold. Stack gap mirrors the hero's so the two
            items keep the same rhythm they had in the title block. */}
        <Section padding="md" bordered className="md:hidden">
          <Stack gap="400">
            {appearsInBlock}
            {viewOnLetterboxd}
          </Stack>
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
        {newerFilm || olderFilm ? (
          <Section padding="md" bordered>
            <nav
              aria-label="Adjacent reviews"
              className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8"
            >
              {newerFilm ? (
                <NeighborLink
                  film={newerFilm}
                  direction="newer"
                  fromParam={neighborFrom}
                />
              ) : (
                <span aria-hidden="true" />
              )}
              {olderFilm ? (
                <NeighborLink
                  film={olderFilm}
                  direction="older"
                  fromParam={neighborFrom}
                />
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
      // ISO-8601 (YYYY-01-01) — Google's Movie schema rejects bare
      // year strings as malformed dateCreated/datePublished. We
      // don't have month/day for most TMDB entries, so January 1
      // of the release year is the conventional placeholder.
      dateCreated: `${film.releaseYear}-01-01`,
      // image is REQUIRED for Movie rich-result eligibility. Use
      // the highest-res TMDB poster we have (w780 here vs. the
      // w342 we use for cards) so SERP previews can downscale to
      // their target size without grain.
      ...(film.tmdb?.posterPath
        ? {
            image: `https://image.tmdb.org/t/p/w780${film.tmdb.posterPath}`,
          }
        : {}),
      // url ties the Movie entity back to its detail page on
      // malxavi — strengthens the entity-link graph for AI search.
      url: `${SITE_URL}/films/${film.letterboxdSlug}-${film.releaseYear}`,
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
          <li key={`${review.reviewDate}-${review.watchedDate}`}>
            {/* Plain anchor — same-page hash. The Link primitive's
                hash branch routes through <a> which is what we want
                here, but a direct <a> keeps the markup minimal. */}
            <a
              href={`#review-${i}`}
              className="focus-visible:outline-2 focus-visible:outline-offset-2 rounded-sm"
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "var(--p-sm-font-size)",
                color: "var(--text-action)",
                textDecoration: "underline",
                textUnderlineOffset: 4,
                textDecorationThickness: 1,
                // --border-focus matches every other interactive
                // element in the films cluster (BackToFilms,
                // NeighborLink, FilmCard link, filter chips,
                // pagination). Without this, the TOC was the only
                // surface using the browser-default focus ring.
                outlineColor: "var(--border-focus)",
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
  fromParam,
}: {
  film: Film;
  direction: "older" | "newer";
  /** The already-encoded source-listing URL, forwarded so multi-hop
   *  browsing keeps replaying the original listing for neighbours AND the
   *  back-link. Null → a context-free neighbour link (chronological
   *  neighbours + cluster-root back-link on the destination). */
  fromParam?: string | null;
}) {
  const slug = `${film.letterboxdSlug}-${film.releaseYear}`;
  const kicker = direction === "newer" ? "← Newer review" : "Older review →";
  // Use the latestWatchedDate to match the listing's sort key, so
  // the date the user sees here is the same date that determines
  // the neighbor's position in the listing order.
  const datelineDate = film.latestWatchedDate;
  // Carry ?ref=internal (back-nav marker) + ?from (the encoded listing,
  // when present) + the #review-0 anchor — same shape FilmCard builds, so
  // hopping neighbour→neighbour preserves the listing context.
  const href = fromParam
    ? `/films/${slug}?ref=internal&from=${fromParam}#review-0`
    : `/films/${slug}?ref=internal#review-0`;
  return (
    <NextLink
      href={href}
      // Card-shaped affordance — bordered wrapper, padding, hover
      // color-shift on the border so the whole tile reads as a
      // tappable card. Mirrors /television/[showSlug]'s
      // NeighborLink for cross-cluster cohesion (a recruiter
      // bouncing between /films and /television sees the same
      // adjacent-review pattern). textAlign was previously
      // direction-driven (left/right); the card wrapper renders
      // both sides left-aligned, with the directional arrow
      // inline in the Kicker carrying the affordance.
      style={{
        textDecoration: "none",
        display: "block",
        padding: "var(--scale-400)",
        border: "1px solid var(--border-default)",
        borderRadius: "var(--border-radius-md)",
        outlineColor: "var(--border-focus)",
        color: "inherit",
      }}
      className="hover:[border-color:var(--text-action)] focus-visible:outline-2 focus-visible:outline-offset-2"
    >
      <Stack gap="100">
        <Kicker>{kicker}</Kicker>
        <p
          style={{
            // p-lg (20px) reads as a neighbor-card title without
            // competing with the page's h1 (Display) above. No
            // h-md token exists in the type scale; sticking to the
            // p-* row keeps the rhythm aligned with the rest of
            // the surface.
            fontFamily: "var(--font-primary)",
            fontSize: "var(--p-lg-font-size)",
            lineHeight: "var(--p-lg-line-height)",
            color: "var(--text-body)",
            margin: 0,
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
      </Stack>
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
  // var(--p-xs-font-size) (12px) keeps the chip inside the type
  // scale — class-audit fix from the 2026-05-07 re-review (Films
  // chip was 11, TV chip was 11; both lifted to the token).
  fontSize: "var(--p-xs-font-size)",
  textTransform: "uppercase" as const,
  letterSpacing: "0.08em",
  // 6×10 padding matches the TV cluster's chip after the SC 2.5.8
  // target-size fix landed in the 2026-05-07 re-review (class-audit
  // miss caught when the Films chip was left at 4×10 while the TV
  // chip was bumped to 6×10).
  padding: "6px 10px",
  borderRadius: "999px",
  // --border-interactive (grey-700 on white = 4.55:1, grey-600 on
  // black in dark mode) clears SC 1.4.11 for the chip's resting
  // shape boundary. The earlier --border-default = grey-50 on white
  // = 1.04:1 left the chip effectively borderless at rest. Matches
  // the filter chip rail's resting border for visual cohesion.
  border: "1px solid var(--border-interactive)",
  color: "var(--text-caption)",
  background: "transparent",
  whiteSpace: "nowrap" as const,
};
