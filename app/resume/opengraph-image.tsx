// Open Graph / Twitter card for /resume. Copy only — the shared
// generator owns the layout (see lib/og/case-study-card.tsx).
//
// Gives /resume its OWN card so a shared resume link stops unfurling
// with the generic sitewide identity card (the one home falls back to);
// before this, a recruiter opening a /resume link saw the byte-identical
// homepage card. Same nameplate masthead as every other share surface —
// the kicker reads RESUME and the subtitle carries the resume headline,
// so the resume reads as its own leaf without drifting from the system.
import {
  renderCaseStudyCard,
  OG_SIZE,
  OG_CONTENT_TYPE,
} from "@/lib/og/case-study-card";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt =
  "Malcolm Xavier—Senior Product Manager. Growth, MarTech, and Customer Data Platforms. AI-Native Operations.";

export default function OpenGraphImage() {
  // Name as the nameplate (bumped to 140 to match the flagship home
  // card's presence); RESUME as the masthead kicker; the subtitle is the
  // resume HEADLINE verbatim (2026-08-29). It previously carried a
  // separate recruiter-keyword line borrowed from the meta description,
  // which made the headline, the description, and this card three
  // independently-approved strings that drifted apart. One regular hyphen
  // in "AI-Native" rather than the page's U+2011: the card is rendered by
  // Satori against a Google-subsetted Instrument Serif, which has no
  // non-breaking hyphen to serve, and the docx surfaces already carry the
  // plain hyphen for the same class of reason. The spaces before the
  // separators are no-break (U+00A0): Satori soft-wraps this line, and a
  // middot landing at the start of line two reads as a bullet. "Currently interviewing"
  // still lives ONLY in the meta description (easy to update), NOT baked
  // into this cached PNG.
  return renderCaseStudyCard({
    eyebrow: "RESUME",
    titleLines: ["Malcolm Xavier"],
    titleSize: 140,
    subtitle:
      "Senior Product Manager · Growth, MarTech, and Customer Data Platforms · AI-Native Operations",
  });
}
