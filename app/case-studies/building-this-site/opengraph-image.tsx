// Open Graph / Twitter card for /case-studies/building-this-site. Copy
// only — the shared generator owns the layout (lib/og/case-study-card.tsx).
import {
  renderCaseStudyCard,
  OG_SIZE,
  OG_CONTENT_TYPE,
} from "@/lib/og/case-study-card";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt =
  "An AI‑Native Portfolio—Case study. Built brick by brick, just like my FYP.";

export default function OpenGraphImage() {
  // Title keeps the article's non-breaking hyphen in "AI‑Native" (U+2011)
  // so the wordmark renders exactly as on the page; 128px default.
  return renderCaseStudyCard({
    titleLines: ["An AI‑Native", "Portfolio"],
    subtitle: "Built brick by brick, just like my FYP",
  });
}
