// Open Graph / Twitter card for /consulting. Copy only — the shared
// generator owns the layout (see lib/og/case-study-card.tsx).
//
// Gives /consulting its OWN card so a link shared into LinkedIn or a
// DM unfurls with the offer rather than the generic sitewide identity
// card. The kicker reads CONSULTING; the subtitle leads with what is
// actually for sale, since this card's job is to qualify a buyer
// before they click, not to introduce Malcolm.
//
// The title is the page's own headline, verbatim. An unfurl and the
// page behind it disagreeing about what the practice is called is the
// cheapest kind of credibility to lose, so this tracks the Display
// line on /consulting and should be re-checked whenever that moves.
import {
  renderCaseStudyCard,
  OG_SIZE,
  OG_CONTENT_TYPE,
} from "@/lib/og/case-study-card";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt =
  "Growth consulting for the AI era, with Malcolm Xavier—AEO and lifecycle audits, website and MarTech builds, and AI-native operations, sold as fixed-scope audits, projects, and retainers.";

export default function OpenGraphImage() {
  return renderCaseStudyCard({
    eyebrow: "CONSULTING",
    titleLines: ["Growth consulting", "for the AI era"],
    titleSize: 96,
    subtitle:
      "Audits, builds, and retainers—AEO, lifecycle, MarTech, and AI-native operations.",
  });
}
