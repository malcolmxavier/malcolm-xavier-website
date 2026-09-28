// Open Graph / Twitter card for the /essays hub. Copy only — the
// shared generator owns the nameplate layout (lib/og/case-study-card).
// Gives the hub its own card so a shared /essays link stops unfurling
// with the generic sitewide identity card.
import {
  renderCaseStudyCard,
  OG_SIZE,
  OG_CONTENT_TYPE,
} from "@/lib/og/case-study-card";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
// Eyebrow, subtitle, and alt all said "Writing" or named "the craft of
// product management" until 2026-09-28. The first was left behind by the
// rename to /essays; the second was narrower than the Craft pillar. All three
// now carry the four pillar nouns, matching the hub deck and metadata.
export const alt =
  "Essays by Malcolm Xavier on growth, media, AI, and craft—built for the page.";

export default function OpenGraphImage() {
  return renderCaseStudyCard({
    eyebrow: "ESSAYS",
    titleLines: ["Malcolm Xavier"],
    titleSize: 140,
    subtitle: "Growth, media, AI, and craft—built for the page.",
  });
}
