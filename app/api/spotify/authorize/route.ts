// ─────────────────────────────────────────────────────────────────
// /api/spotify/authorize — kicks off the one-time Spotify OAuth.
//
// Visit this in a browser ONCE. It redirects to Spotify's consent
// screen; after Malcolm clicks "Agree", Spotify redirects back to
// /api/spotify/callback with a one-time code that's exchanged for
// the long-lived refresh token.
//
// Locked to development. This route is never reachable in production.
// ─────────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import { getAuthorizationUrl } from "@/lib/feeds/spotify";

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return new Response("Not available in production.", { status: 404 });
  }
  return NextResponse.redirect(getAuthorizationUrl());
}
