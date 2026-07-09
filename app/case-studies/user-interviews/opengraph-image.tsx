// Open Graph / Twitter card for /case-studies/user-interviews. Copy only —
// the shared generator owns the layout (see lib/og/case-study-card.tsx).
import {
  renderCaseStudyCard,
  OG_SIZE,
  OG_CONTENT_TYPE,
} from "@/lib/og/case-study-card";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt =
  "Steering leading indicators — Case study. Targeting, retention, and marketplace mechanics.";

export default function OpenGraphImage() {
  // Short title holds the 128px default for full presence.
  return renderCaseStudyCard({
    titleLines: ["Steering leading", "indicators"],
    subtitle: "Targeting, retention, and marketplace mechanics",
  });
}
