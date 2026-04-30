// ─────────────────────────────────────────────────────────────────
// /api/spotify/callback — receives Spotify's redirect after consent.
//
// Spotify hands us a one-time `code` which we exchange immediately
// for { access_token, refresh_token }. The refresh_token is the
// long-lived secret; it gets displayed on the success page so
// Malcolm can copy it into .env.local as SPOTIFY_REFRESH_TOKEN.
//
// Locked to development. The browser-readable success page would be
// inappropriate in production (and unnecessary — by deploy time the
// refresh token is already provisioned in Vercel env).
// ─────────────────────────────────────────────────────────────────

import { NextRequest } from "next/server";
import { exchangeCodeForTokens } from "@/lib/feeds/spotify";

export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return new Response("Not available in production.", { status: 404 });
  }

  const code = req.nextUrl.searchParams.get("code");
  const error = req.nextUrl.searchParams.get("error");

  if (error) {
    return htmlResponse(
      `<h1>Spotify denied the request.</h1><p>Error: <code>${escapeHtml(
        error,
      )}</code></p>`,
      400,
    );
  }
  if (!code) {
    return htmlResponse(
      `<h1>Missing authorization code.</h1><p>Visit /api/spotify/authorize to start over.</p>`,
      400,
    );
  }

  let tokens;
  try {
    tokens = await exchangeCodeForTokens(code);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return htmlResponse(
      `<h1>Token exchange failed.</h1><pre>${escapeHtml(msg)}</pre>`,
      500,
    );
  }

  // Display the refresh token so Malcolm can copy it. The access
  // token in this response is short-lived and not useful to save.
  return htmlResponse(`
    <h1>Spotify authorization complete.</h1>
    <p>Copy the refresh token below and paste it back into the chat
       (or directly into <code>.env.local</code> as
       <code>SPOTIFY_REFRESH_TOKEN</code>):</p>
    <pre>${escapeHtml(tokens.refresh_token ?? "(none returned)")}</pre>
    <p>Scopes granted: <code>${escapeHtml(tokens.scope ?? "(none returned)")}</code></p>
    <p>This page is dev-only and will not exist in production. You
       can close this tab once you've copied the token.</p>
  `);
}

// ─── Tiny HTML helpers ────────────────────────────────────────────

function htmlResponse(body: string, status = 200) {
  return new Response(
    `<!DOCTYPE html>
<html>
<head>
<title>Spotify Authorization</title>
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
  body { font-family: ui-monospace, "SF Mono", Menlo, monospace;
         padding: 2rem; max-width: 50rem; margin: 0 auto;
         line-height: 1.5; color: #111; }
  h1 { font-family: ui-serif, Georgia, serif; font-weight: 400;
       margin-bottom: 1rem; }
  pre, code { background: #f4f4f4; padding: 0.4rem 0.6rem;
              border-radius: 4px; word-break: break-all;
              white-space: pre-wrap; }
  pre { padding: 1rem; }
  @media (prefers-color-scheme: dark) {
    body { background: #111; color: #eee; }
    pre, code { background: #222; color: #eee; }
  }
</style>
</head>
<body>${body}</body>
</html>`,
    {
      status,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    },
  );
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
