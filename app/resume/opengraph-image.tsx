// Open Graph / Twitter card for /resume. Copy only — the shared
// generator owns the layout (see lib/og/case-study-card.tsx).
//
// Gives /resume its OWN card so a shared resume link stops unfurling
// with the generic sitewide identity card (the one home falls back to);
// before this, a recruiter opening a /resume link saw the byte-identical
// homepage card. Same nameplate masthead as every other share surface —
// the kicker reads RESUME and the subtitle carries the recruiter-facing
// beats, so the resume reads as its own leaf without drifting from the
// system.
import {
  renderCaseStudyCard,
  OG_SIZE,
  OG_CONTENT_TYPE,
} from "@/lib/og/case-study-card";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt =
  "Malcolm Xavier—Senior PM resume. Growth, data, and AI across media and streaming.";

export default function OpenGraphImage() {
  // Name as the nameplate (bumped to 140 to match the flagship home
  // card's presence); RESUME as the masthead kicker; the subtitle mirrors
  // the /resume meta description's recruiter keywords. "Currently
  // interviewing" intentionally lives only in the meta description (easy
  // to update), NOT baked into this cached PNG.
  return renderCaseStudyCard({
    eyebrow: "RESUME",
    titleLines: ["Malcolm Xavier"],
    titleSize: 140,
    subtitle: "Senior PM—growth, data, and AI across media and streaming.",
  });
}
