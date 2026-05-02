// ─────────────────────────────────────────────────────────────────
// /films — server component.
//
// V1: renders the full backlog as a paginated grid. No filters yet
// (FilmsShell + filter UI lands in the next commit). Page-size
// detection mirrors /music — 30 desktop+tablet, 12 mobile, 6 Save-
// Data — but the breakpoint shifts to 768px (Tailwind `md`) so
// tablets share desktop layout per PLAN.md.
//
// All hero copy is placeholder. Voice tuning happens in a polish
// pass once the page renders end-to-end.
//
// Snapshot-only at request time: getFilms() reads
// lib/feeds/_fixtures/letterboxd-snapshot.json directly. No live
// API path. Free of rate limits, deterministic latency.
// ─────────────────────────────────────────────────────────────────

import type { Metadata } from "next";
import { headers } from "next/headers";
import NextLink from "next/link";
import { Container } from "@/components/layout/Container";
import { Section } from "@/components/layout/Section";
import { Stack } from "@/components/layout/Stack";
import { Display } from "@/components/typography/Display";
import { Headline } from "@/components/typography/Headline";
import { Kicker } from "@/components/typography/Kicker";
import { Lede } from "@/components/typography/Lede";
import { Pagination } from "@/components/primitives/Pagination";
import { getFilms } from "@/lib/feeds/letterboxd";
import { FilmCard } from "./FilmCard";

export const metadata: Metadata = {
  title: "Film reviews",
  description:
    "Reviews and ratings of films I've watched, pulled from my Letterboxd journal.",
};

const PAGE_SIZE_DESKTOP = 30;
const PAGE_SIZE_MOBILE = 12;
const PAGE_SIZE_SAVE_DATA = 6;
// 768px = Tailwind `md` — the breakpoint at which tablets join the
// desktop layout per PLAN.md. Below this we render the mobile
// page size; at or above we render the desktop one.
// Page size is decided server-side based on the `Save-Data` header
// (and a heuristic since we can't measure viewport server-side —
// see comment below).

type SearchParams = Promise<{ page?: string }>;

export default async function FilmsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const headersList = await headers();
  const saveData = headersList.get("save-data") === "on";
  const params = await searchParams;
  const rawPage = Number.parseInt(params.page ?? "1", 10);
  const requestedPage = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;

  // Server-side page size — picks Save-Data first, then defaults
  // to desktop. The mobile-vs-desktop split happens client-side
  // (FilmsShell will pick this up); for the no-shell v1 we use
  // desktop page size and let CSS responsive grid handle the
  // visual collapse on small screens.
  const pageSize = saveData ? PAGE_SIZE_SAVE_DATA : PAGE_SIZE_DESKTOP;

  const { films, summary, capturedAt } = getFilms();
  // films are already sorted firstReviewDate-desc by the snapshot
  // writer; we just slice for the requested page.
  const totalPages = Math.max(1, Math.ceil(films.length / pageSize));
  const page = Math.min(requestedPage, totalPages);
  const start = (page - 1) * pageSize;
  const visibleFilms = films.slice(start, start + pageSize);

  // Suppress unused-var warning until SummaryPanel lands.
  void summary;
  void capturedAt;

  return (
    <div data-subbrand="film">
      <Container size="lg">
        {/* ─── Hero (PLACEHOLDER COPY) ─────────────────────────── */}
        <Section padding="lg">
          <Stack gap="500">
            <Kicker accent>Film</Kicker>
            <Display>Every film, every rating, every reaction.</Display>
            <Lede>
              I review most of what I watch on Letterboxd. This is the
              full backlog — sortable, filterable, every star rating
              and prose review preserved. Click any card for the full
              review.
            </Lede>
          </Stack>
        </Section>

        {/* ─── Grid ────────────────────────────────────────────── */}
        <Section padding="md" bordered>
          <Stack gap="800">
            <Headline level={2} className="sr-only">
              Film reviews
            </Headline>

            <ul
              role="list"
              className="grid gap-4 sm:gap-6"
              style={{
                gridTemplateColumns:
                  "repeat(auto-fill, minmax(160px, 1fr))",
                listStyle: "none",
                padding: 0,
                margin: 0,
              }}
            >
              {visibleFilms.map((film) => (
                <li key={film.id}>
                  <FilmCard film={film} />
                </li>
              ))}
            </ul>

            <Pagination
              currentPage={page}
              totalPages={totalPages}
              basePath="/films"
              pageParam="page"
              ariaLabel="Film review pages"
            />
          </Stack>
        </Section>

        {/* ─── TMDB attribution (required by ToS) ──────────────── */}
        <Section padding="sm">
          <p
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "var(--text-caption)",
              letterSpacing: "0.04em",
            }}
          >
            Film metadata (posters, genres, runtime, director){" "}
            <NextLink
              href="https://www.themoviedb.org"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: "var(--text-action)",
                textDecoration: "underline",
              }}
            >
              powered by TMDB ↗
            </NextLink>
            . This site is not endorsed or certified by TMDB.
          </p>
        </Section>
      </Container>
    </div>
  );
}
