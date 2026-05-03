// ─────────────────────────────────────────────────────────────────
// /films — server component.
//
// Reads URL params, runs applyFilters + paginate, and hands the
// result to FilmsShell (client) for filter UI + grid + pagination
// rendering. All filtering is server-side — each control change in
// FilmsShell calls router.replace, which re-runs this page with new
// params. Page-size detection mirrors /music: 30 desktop+tablet, 6
// Save-Data; the visual mobile-density split is handled by the
// responsive grid at ~160px min column width.
//
// Snapshot-only at request time: getFilms() reads
// lib/feeds/_fixtures/letterboxd-snapshot.json directly. No live
// API path. Free of rate limits, deterministic latency.
// ─────────────────────────────────────────────────────────────────

import type { Metadata } from "next";
import { headers } from "next/headers";
import { Container } from "@/components/layout/Container";
import { Section } from "@/components/layout/Section";
import { Stack } from "@/components/layout/Stack";
import { Display } from "@/components/typography/Display";
import { Kicker } from "@/components/typography/Kicker";
import { Lede } from "@/components/typography/Lede";
import { Link } from "@/components/primitives/Link";
import { TrackOnClick } from "@/components/analytics/TrackOnClick";
import { ANALYTICS_EVENTS } from "@/lib/analytics";
import { ELSEWHERE } from "@/lib/elsewhere";
import { getFilms } from "@/lib/feeds/letterboxd";
import {
  applyFilters,
  paginate,
  parseFilmFilters,
  parseFilmSort,
} from "@/lib/feeds/letterboxd-utils";
import { FilmsShell } from "./FilmsShell";
import { SummaryPanel } from "./SummaryPanel";

// Pulled from the central registry so a URL change in Footer or
// Contact (the other two surfaces that link out to Letterboxd) is
// a single edit. Falls back to the canonical profile URL if the
// entry is somehow missing — keeps the page from rendering a
// broken CTA in that edge case.
const LETTERBOXD_PROFILE_URL =
  ELSEWHERE.find((e) => e.label === "Letterboxd")?.href ??
  "https://letterboxd.com/malxavi/";

export const metadata: Metadata = {
  title: "Film Reviews",
  description:
    "741 films and counting, logged, rated, and reviewed. Every Letterboxd entry preserved—horror, arthouse, blockbusters. Filter by rating, genre, or year.",
  // Without this, /films inherits the root layout's canonical=\"/\"
  // and Google reads the entire films cluster as a duplicate of
  // the homepage. Closes films-listing-canonical-wrong.
  alternates: { canonical: "/films" },
  // Per-page OG so shares of /films don't unfurl as the homepage
  // bio card (which is what happens when a Next page omits its
  // own openGraph block — root layout's OG bleeds through).
  // Closes films-listing-og-missing.
  openGraph: {
    title: "Film Reviews — Malcolm Xavier",
    description:
      "741 films and counting, logged, rated, and reviewed. Every Letterboxd entry preserved—horror, arthouse, blockbusters. Filter by rating, genre, or year.",
    url: "/films",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Film Reviews — Malcolm Xavier",
    description:
      "741 films and counting, logged, rated, and reviewed. Every Letterboxd entry preserved—horror, arthouse, blockbusters. Filter by rating, genre, or year.",
  },
};

// 24 is the unified page size across mobile, tablet, and desktop.
// It divides cleanly into 1/2/3/4/6 columns — every column count
// the responsive grid produces inside the films container — so no
// row ever ends incomplete. /music's mobile-vs-desktop split isn't
// needed here: film cards are lighter (poster-only, no track meta)
// so the same density reads comfortably across viewports.
const PAGE_SIZE_DEFAULT = 24;
// Save-Data is an opt-in user signal — when present, we serve half
// the cards so the bandwidth-conscious user gets a smaller page.
// 12 keeps row math clean (1/2/3/4/6 cols all divide evenly).
const PAGE_SIZE_SAVE_DATA = 12;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function FilmsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const headersList = await headers();
  const saveData = headersList.get("save-data") === "on";
  const params = await searchParams;

  // Filter + sort + page state all live in the URL — single source
  // of truth across server renders and client navigations.
  const filters = parseFilmFilters(params);
  const sort = parseFilmSort(params);
  const rawPage = Number.parseInt(asString(params.page) ?? "1", 10);
  const requestedPage =
    Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;

  // Save-Data shrinks the page size; the responsive grid handles
  // the visual mobile-vs-desktop split via auto-fill, so we don't
  // need separate viewport-based variants.
  const pageSize = saveData ? PAGE_SIZE_SAVE_DATA : PAGE_SIZE_DEFAULT;

  const { films, summary, capturedAt } = getFilms();
  void capturedAt;

  // Genres available in the dataset, sorted by usage descending so
  // the chip rail leads with the most-common ones. Pulled from the
  // pre-aggregated summary so this is O(genres) not O(films).
  const availableGenres = Object.entries(summary.genreDistribution)
    .sort((a, b) => b[1] - a[1])
    .map(([g]) => g);

  // Review-publication years available in the dataset. Derived from
  // each film's pre-computed reviewYearSet (built at snapshot-write
  // time) so this is O(films) but iterates a tiny set per film.
  // Sorted desc so the chip rail leads with the newest year. Going
  // dynamic here closes films-review-date-options-hardcoded-years —
  // when 2027 ships, the chip rail won't silently drop 2027 reviews
  // from filterability.
  const reviewYearSetGlobal = new Set<number>();
  for (const film of films) {
    for (const y of film.reviewYearSet) reviewYearSetGlobal.add(y);
  }
  const availableReviewYears = Array.from(reviewYearSetGlobal).sort(
    (a, b) => b - a,
  );

  const applied = applyFilters(films, filters, sort);
  const {
    current: pageFilms,
    totalPages,
    totalResults,
    page,
  } = paginate(applied, requestedPage, pageSize);

  return (
    <div data-subbrand="film">
      <Container size="lg">
        {/* ─── Hero + Summary (side-by-side on lg+, stacked below) ─
            On lg+ the hero and panel share one row; on smaller
            viewports the panel drops below the hero copy in natural
            reading order. The 3:2 column ratio gives the editorial
            voice (Display + Lede) more horizontal room than the
            stats sidebar — the chart still reads cleanly at the
            narrower 2-fr column width. */}
        <Section padding="lg">
          {/* No items-start: with default grid stretch alignment,
              both columns share the row's height (= the taller
              column's intrinsic height). The panel uses lg:h-full
              to fill that height; its chart flex-grows to claim
              whatever vertical space the hero column dictates. */}
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[3fr_2fr] lg:gap-12">
            <Stack gap="500">
              <Kicker accent>Films</Kicker>
              <Display>Every film, every rating, every reaction.</Display>
              <Lede>
                I watch 300+ films a year and log my reviews on Letterboxd. This is the
                full backlog. Open any card for the full
                review. And if you're looking for a recommendation, filter to find what
                you're looking for.
              </Lede>
              {/* Follow CTA — sits inside the Stack so it picks up the
                  Lede's gap rhythm. ↗ marks it external per the
                  CTA-arrow convention. URL pulled from the ELSEWHERE
                  registry so it stays in sync with Footer + Contact. */}
              <p style={{ margin: 0 }}>
                <TrackOnClick
                  event={ANALYTICS_EVENTS.LETTERBOXD_CLICK}
                  eventData={{ kind: "profile-follow", surface: "films-hero" }}
                >
                  <Link href={LETTERBOXD_PROFILE_URL}>
                    Follow along on Letterboxd ↗
                  </Link>
                </TrackOnClick>
              </p>
            </Stack>
            <SummaryPanel summary={summary} />
          </div>
        </Section>

        {/* ─── Filter rail + Grid + Pagination (client) ─────── */}
        <Section padding="md" bordered>
          <FilmsShell
            films={pageFilms}
            totalPages={totalPages}
            currentPage={page}
            totalResults={totalResults}
            filters={filters}
            sort={sort}
            availableGenres={availableGenres}
            availableReviewYears={availableReviewYears}
          />
        </Section>
      </Container>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────

function asString(v: string | string[] | undefined): string | undefined {
  if (Array.isArray(v)) return v[0];
  return v;
}
