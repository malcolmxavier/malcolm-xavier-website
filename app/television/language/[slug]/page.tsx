// /television/language/[slug] — every show in one original language. Thin
// binding of the shared TV facet renderer to the language facet
// (normalizeLanguage → languageName); indexable iff ≥ 2 logged shows.
import type { Metadata } from "next";
import {
  tvFacetStaticParams,
  tvFacetMetadata,
  TvFacetPage,
} from "../../_facet-route";

type Args = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export function generateStaticParams() {
  return tvFacetStaticParams("languages");
}
export function generateMetadata(args: Args): Promise<Metadata> {
  return tvFacetMetadata("languages", args);
}
export default function Page(args: Args) {
  return TvFacetPage("languages", args);
}
