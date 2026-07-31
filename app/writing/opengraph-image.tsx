// Open Graph / Twitter card for the /writing hub. Copy only — the
// shared generator owns the nameplate layout (lib/og/case-study-card).
// Gives the hub its own card so a shared /writing link stops unfurling
// with the generic sitewide identity card.
import {
  renderCaseStudyCard,
  OG_SIZE,
  OG_CONTENT_TYPE,
} from "@/lib/og/case-study-card";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt =
  "Writing by Malcolm Xavier—essays on growth, media, AI, and the craft of product management.";

export default function OpenGraphImage() {
  return renderCaseStudyCard({
    eyebrow: "WRITING",
    titleLines: ["Malcolm Xavier"],
    titleSize: 140,
    subtitle:
      "Essays on growth, media, AI, and the craft of the work—built for the page.",
  });
}
