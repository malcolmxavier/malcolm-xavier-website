// /television/network/[slug] — every show on one network. Thin binding of
// the shared TV facet renderer to the network facet (canonical PRIMARY
// network, name-based — the WS3 filter; HBO/Max merged); indexable iff ≥ 5
// logged shows.
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
  return tvFacetStaticParams("networks");
}
export function generateMetadata(args: Args): Promise<Metadata> {
  return tvFacetMetadata("networks", args);
}
export default function Page(args: Args) {
  return TvFacetPage("networks", args);
}
