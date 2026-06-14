// /television/creator/[slug] — every show by one creator. Thin binding of
// the shared TV facet renderer (app/television/_facet-route.tsx) to the
// creator facet (from the enrichment fixture, source authors demoted to
// match the stats); indexable iff ≥ 2 logged shows.
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
  return tvFacetStaticParams("creators");
}
export function generateMetadata(args: Args): Promise<Metadata> {
  return tvFacetMetadata("creators", args);
}
export default function Page(args: Args) {
  return TvFacetPage("creators", args);
}
