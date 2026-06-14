// /television/type/[slug] — every show of one TMDB series type (Scripted /
// Miniseries / Reality / Documentary / …). Thin binding of the shared TV
// facet renderer to the type facet (name-based — the WS3 filter); indexable
// iff ≥ 2 logged shows.
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
  return tvFacetStaticParams("types");
}
export function generateMetadata(args: Args): Promise<Metadata> {
  return tvFacetMetadata("types", args);
}
export default function Page(args: Args) {
  return TvFacetPage("types", args);
}
