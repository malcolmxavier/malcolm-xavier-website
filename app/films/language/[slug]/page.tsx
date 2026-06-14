// /films/language/[slug] — every film in one original language. Thin
// binding of the shared film facet renderer to the language facet
// (normalizeLanguage → languageName); indexable iff ≥ 3 logged films.
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
  return filmFacetStaticParams("languages");
}
export function generateMetadata(args: Args): Promise<Metadata> {
  return filmFacetMetadata("languages", args);
}
export default function Page(args: Args) {
  return FilmFacetPage("languages", args);
}
