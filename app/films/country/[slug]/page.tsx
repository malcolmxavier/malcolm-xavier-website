// /films/country/[slug] — every film from one country of origin. Thin
// binding of the shared film facet renderer to the country facet
// (normalizeCountry → countryName); indexable iff ≥ 5 logged films.
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
  return filmFacetStaticParams("countries");
}
export function generateMetadata(args: Args): Promise<Metadata> {
  return filmFacetMetadata("countries", args);
}
export default function Page(args: Args) {
  return FilmFacetPage("countries", args);
}
