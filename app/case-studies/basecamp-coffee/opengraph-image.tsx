// Open Graph / Twitter card for /case-studies/basecamp-coffee. Copy only —
// the shared generator owns the layout (see lib/og/case-study-card.tsx).
import {
  renderCaseStudyCard,
  OG_SIZE,
  OG_CONTENT_TYPE,
} from "@/lib/og/case-study-card";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt =
  "Claude x Growth PM — Case study. Basecamp Rewards: A Turnaround.";

export default function OpenGraphImage() {
  // Short title holds the 128px default for full presence.
  return renderCaseStudyCard({
    titleLines: ["Claude x", "Growth PM"],
    subtitle: "Basecamp Rewards: A Turnaround",
  });
}
