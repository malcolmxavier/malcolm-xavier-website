// ─────────────────────────────────────────────────────────────────
// /favicon — generated as an "MX" monogram in Instrument Serif.
//
// Next.js's `app/icon.tsx` file convention auto-renders this at
// build time and wires it into <head> as the favicon for every
// route. No public/favicon.ico needed — this replaces it.
//
// Design: white "MX" centered on a true-black tile. Recruiter
// cluster is the brand voice, so we use Instrument Serif (the
// recruiter display font) instead of a sans. At 32×32 the serifs
// are barely readable, but the proportions and weight still
// signal "editorial / serious" rather than "generic Vercel app."
// ─────────────────────────────────────────────────────────────────

import { ImageResponse } from "next/og";
import { loadGoogleFont } from "@/lib/og/load-google-font";

// Image metadata — Next reads these to set the <link rel="icon">
// sizes/type attributes correctly.
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default async function Icon() {
  // Subset the font to just the glyphs we render. Tiny download.
  const instrumentSerif = await loadGoogleFont("Instrument+Serif", "MX");

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#000000",
          color: "#ffffff",
          fontFamily: "Instrument Serif",
          // Tighter vertical centering for serif glyphs — the
          // typeface sits visually a hair above the optical center
          // with default leading, so we nudge down with letterSpacing
          // and font-size choice rather than translate.
          fontSize: 22,
          letterSpacing: "-0.04em",
          fontWeight: 400,
        }}
      >
        MX
      </div>
    ),
    {
      ...size,
      fonts: [
        {
          name: "Instrument Serif",
          data: instrumentSerif,
          style: "normal",
          weight: 400,
        },
      ],
    },
  );
}
