// /films/studio/[slug] — every film from one studio. Thin binding of the
// shared film facet renderer to the studio facet (canonStudio). The one
// allowlist-gated type: indexable iff studio ∈ STUDIO_INDEX_ALLOWLIST AND
// ≥ 5 logged films (TMDB lists production companies, so a count floor alone
// can't separate labels from co-financiers).
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
  return filmFacetStaticParams("studios");
}
export function generateMetadata(args: Args): Promise<Metadata> {
  return filmFacetMetadata("studios", args);
}
export default function Page(args: Args) {
  return FilmFacetPage("studios", args);
}
