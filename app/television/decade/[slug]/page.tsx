// /television/decade/[slug] — every show from one premiere decade. Thin
// binding of the shared TV facet renderer to the decade facet
// (showDecadeLabel of premiereYear); indexable iff ≥ 2 logged shows.
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
  return tvFacetStaticParams("decades");
}
export function generateMetadata(args: Args): Promise<Metadata> {
  return tvFacetMetadata("decades", args);
}
export default function Page(args: Args) {
  return TvFacetPage("decades", args);
}
