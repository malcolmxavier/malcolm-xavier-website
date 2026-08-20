// Open Graph / Twitter card for the /case-studies index. Copy only —
// the shared generator owns the layout (see lib/og/case-study-card.tsx).
//
// Gives the case-studies HUB its own card so a shared index link stops
// unfurling with the generic sitewide identity card (each individual
// study already has its own card via file convention). Same nameplate
// masthead; the kicker reads CASE STUDIES and the subtitle mirrors the
// index page's own Display + Lede framing.
import {
  renderCaseStudyCard,
  OG_SIZE,
  OG_CONTENT_TYPE,
} from "@/lib/og/case-study-card";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt =
  "Case studies by Malcolm Xavier—PM craft, AI-native shipping, and growth, marketing, and data platforms.";

export default function OpenGraphImage() {
  // Name as the nameplate (140 to match the other name-cards); CASE
  // STUDIES as the masthead kicker. The subtitle mirrors the index
  // page's own "The long-form work" framing so the unfurl and the page
  // read as one piece.
  return renderCaseStudyCard({
    eyebrow: "CASE STUDIES",
    titleLines: ["Malcolm Xavier"],
    titleSize: 140,
    subtitle: "The long-form work—PM craft, AI-native shipping, and growth experiments.",
  });
}
