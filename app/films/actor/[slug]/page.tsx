// /films/actor/[slug] — every film starring one actor. Thin binding of the
// shared film facet renderer to the actor facet (top-10-billed cast from the
// enrichment fixture); indexable iff ≥ 8 logged films.
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
  return filmFacetStaticParams("actors");
}
export function generateMetadata(args: Args): Promise<Metadata> {
  return filmFacetMetadata("actors", args);
}
export default function Page(args: Args) {
  return FilmFacetPage("actors", args);
}
