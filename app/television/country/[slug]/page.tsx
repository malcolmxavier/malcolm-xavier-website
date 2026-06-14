// /television/country/[slug] — every show from one country of origin. Thin
// binding of the shared TV facet renderer to the country facet
// (normalizeCountry → countryName); indexable iff ≥ 3 logged shows.
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
  return tvFacetStaticParams("countries");
}
export function generateMetadata(args: Args): Promise<Metadata> {
  return tvFacetMetadata("countries", args);
}
export default function Page(args: Args) {
  return TvFacetPage("countries", args);
}
