// /films/writer/[slug] — every film by one writer. Thin binding of the
// shared film facet renderer to the writer facet (from the enrichment
// fixture); indexable iff ≥ 3 logged films.
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
  return filmFacetStaticParams("writers");
}
export function generateMetadata(args: Args): Promise<Metadata> {
  return filmFacetMetadata("writers", args);
}
export default function Page(args: Args) {
  return FilmFacetPage("writers", args);
}
