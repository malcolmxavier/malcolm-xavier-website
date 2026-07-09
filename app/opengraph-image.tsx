// ─────────────────────────────────────────────────────────────────
// Sitewide Open Graph / Twitter card — 1200×630.
//
// Renders at build time via Next.js's `app/opengraph-image.tsx` file
// convention. Referenced by <meta property="og:image"> and
// <meta name="twitter:image"> on every page that doesn't ship its own
// opengraph-image, so sharing any malxavi.com URL without a bespoke
// card (home, resume, about, contact, the film/TV/music hubs) unfurls
// with this identity card instead of a generic gray default.
//
// Treatment: the shared "Nameplate" masthead from
// lib/og/case-study-card.tsx — the same magazine masthead every
// case-study card and the LinkedIn banner use, so every share surface
// reads as one identity. This card is the person rather than a study:
// the nameplate is the name, the subtitle is the role and beats, and
// the kicker reads PORTFOLIO. Home isn't a sub-brand, so it keeps the
// default brand-green accent.
//
// Being a thin wrapper over renderCaseStudyCard (rather than its own
// hand-rolled layout) is deliberate: the home card and the six
// case-study cards now share one generator, so they can't drift.
// ─────────────────────────────────────────────────────────────────

import {
  renderCaseStudyCard,
  OG_SIZE,
  OG_CONTENT_TYPE,
} from "@/lib/og/case-study-card";

export const alt =
  "Malcolm Xavier—Senior product manager. Tech, media, and streaming.";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function OpenGraphImage() {
  // The identity card: the name as the nameplate (bumped a touch above
  // the case-study default so the flagship card carries more presence),
  // the role and coverage areas as the subtitle, PORTFOLIO as the
  // masthead kicker.
  return renderCaseStudyCard({
    eyebrow: "PORTFOLIO",
    titleLines: ["Malcolm Xavier"],
    titleSize: 140,
    subtitle: "Senior product manager—tech, media, and streaming.",
  });
}
