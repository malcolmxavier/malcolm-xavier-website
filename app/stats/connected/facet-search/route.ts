// Search endpoint for the /stats/connected omnibox. Returns grouped
// suggestions for the shared, cross-brand facets the connected dashboard
// reports on (actor / conglomerate / language / country), pooled across both
// libraries. Snapshot-only, no live calls. force-dynamic so it's never
// statically cached with a single query's results.
import { searchConnectedSuggestions } from "@/lib/feeds/entity-typeahead";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q") ?? "";
  return Response.json({ results: searchConnectedSuggestions(q) });
}
