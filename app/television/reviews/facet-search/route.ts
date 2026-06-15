// Search endpoint for the /television/reviews omnibox. Returns grouped
// suggestions (titles + actor/creator) for a typed query. Snapshot-only,
// no live calls. force-dynamic so it's never statically cached with a
// single query's results.
import { searchShowSuggestions } from "@/lib/feeds/entity-typeahead";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q") ?? "";
  return Response.json({ results: searchShowSuggestions(q) });
}
