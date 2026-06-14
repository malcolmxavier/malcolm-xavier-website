// /films/decade/[slug] — every film from one release decade. Thin binding
// of the shared film facet renderer to the decade facet (filmDecadeLabel of
// releaseYear — a different axis from watched-year); indexable iff ≥ 2
// logged films.
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
  return filmFacetStaticParams("decades");
}
export function generateMetadata(args: Args): Promise<Metadata> {
  return filmFacetMetadata("decades", args);
}
export default function Page(args: Args) {
  return FilmFacetPage("decades", args);
}
