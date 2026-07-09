// Open Graph / Twitter card for /case-studies/muck-rack. Copy only —
// the shared generator owns the layout (see lib/og/case-study-card.tsx).
import {
  renderCaseStudyCard,
  OG_SIZE,
  OG_CONTENT_TYPE,
} from "@/lib/og/case-study-card";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt =
  "Content and data platforms: quality over quantity—Case study. Translating data quality work into the volume metric a sales-led org trusted.";

export default function OpenGraphImage() {
  // Long title split at its colon into two semantic halves; stepped down
  // to 84px so the 27-character first line fills the card without spill.
  return renderCaseStudyCard({
    titleLines: ["Content and data platforms:", "quality over quantity"],
    titleSize: 84,
    subtitle:
      "Translating data quality work into the volume metric a sales-led org trusted",
  });
}
