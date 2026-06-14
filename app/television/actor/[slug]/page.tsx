// /television/actor/[slug] — every show starring one actor. Thin binding of
// the shared TV facet renderer to the actor facet (top-billed cast, ≥3 eps,
// acting shows only — the stats gate); indexable iff ≥ 3 logged shows.
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
  return tvFacetStaticParams("actors");
}
export function generateMetadata(args: Args): Promise<Metadata> {
  return tvFacetMetadata("actors", args);
}
export default function Page(args: Args) {
  return TvFacetPage("actors", args);
}
