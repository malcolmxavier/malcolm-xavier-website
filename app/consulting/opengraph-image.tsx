// Open Graph / Twitter card for /consulting. Copy only — the shared
// generator owns the layout (see lib/og/case-study-card.tsx).
//
// Gives /consulting its OWN card so a link shared into LinkedIn or a
// DM unfurls with the offer rather than the generic sitewide identity
// card. The kicker reads CONSULTING; the subtitle leads with what is
// actually for sale, since this card's job is to qualify a buyer
// before they click, not to introduce Malcolm.
import {
  renderCaseStudyCard,
  OG_SIZE,
  OG_CONTENT_TYPE,
} from "@/lib/og/case-study-card";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt =
  "Consulting with Malcolm Xavier—growth systems, customer data platforms, and AI-native operations. Fixed-scope audits, project builds, and retainers.";

export default function OpenGraphImage() {
  return renderCaseStudyCard({
    eyebrow: "CONSULTING",
    titleLines: ["Product and", "data consulting"],
    titleSize: 96,
    subtitle:
      "Growth systems, customer data platforms, and AI-native operations.",
  });
}
