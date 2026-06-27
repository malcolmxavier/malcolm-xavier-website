// Search endpoint for the /films/reviews omnibox. Returns grouped
// suggestions (titles + actor/writer/studio/director) for a typed query.
// Reads the bundled snapshot only — no live calls. Dynamic because the
// response varies by ?q=; force-dynamic so it's never statically cached
// with a single query's results.
import { searchFilmSuggestions } from "@/lib/feeds/entity-typeahead";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q") ?? "";
  return Response.json({ results: searchFilmSuggestions(q) });
}
