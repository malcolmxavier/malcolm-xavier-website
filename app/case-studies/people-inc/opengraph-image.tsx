// Open Graph / Twitter card for /case-studies/people-inc. Copy only —
// the shared generator owns the layout (see lib/og/case-study-card.tsx).
import {
  renderCaseStudyCard,
  OG_SIZE,
  OG_CONTENT_TYPE,
} from "@/lib/og/case-study-card";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt =
  "Infrastructure enables personalization—Case study. Driving a multi-year roadmap for identity, registration, and onboarding.";

export default function OpenGraphImage() {
  // Medium title stepped to 104px so "Infrastructure enables" fits.
  return renderCaseStudyCard({
    titleLines: ["Infrastructure enables", "personalization"],
    titleSize: 104,
    subtitle:
      "Driving a multi-year roadmap for identity, registration, and onboarding",
  });
}
