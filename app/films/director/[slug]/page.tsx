// /films/director/[slug] — every film by one director. Thin binding of the
// shared film facet renderer (app/films/_facet-route.tsx) to the director
// facet. Exact match on the thin-snapshot tmdb.director (distinct from the
// fuzzy ?director= search box); indexable iff ≥ 3 logged films.
import type { Metadata } from "next";
import {
  filmFacetStaticParams,
  filmFacetMetadata,
  FilmFacetPage,
} from "../../_facet-route";

type Args = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export function generateStaticParams() {
  return filmFacetStaticParams("directors");
}
export function generateMetadata(args: Args): Promise<Metadata> {
  return filmFacetMetadata("directors", args);
}
export default function Page(args: Args) {
  return FilmFacetPage("directors", args);
}
