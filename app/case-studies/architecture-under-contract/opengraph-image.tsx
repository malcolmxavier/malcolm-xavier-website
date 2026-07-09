// Open Graph / Twitter card for /case-studies/architecture-under-contract.
// Copy only — the shared generator owns the layout (see
// lib/og/case-study-card.tsx). This was the original per-article card;
// its layout became the shared template the other five now reuse.
import {
  renderCaseStudyCard,
  OG_SIZE,
  OG_CONTENT_TYPE,
} from "@/lib/og/case-study-card";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt =
  "Architecture under contract — Case study. How three integrations stay online when their upstreams don’t.";

export default function OpenGraphImage() {
  // Subtitle matches the in-article Hero subtitle verbatim so a reader
  // who clicks through from the unfurl meets the same framing; 128px
  // default holds the two-line title at full presence.
  return renderCaseStudyCard({
    titleLines: ["Architecture", "under contract"],
    subtitle: "How three integrations stay online when their upstreams don’t.",
  });
}
