// Open Graph / Twitter card for /contact. Copy only — the shared
// generator owns the layout (see lib/og/case-study-card.tsx).
//
// Gives /contact its OWN card so a shared contact link stops unfurling
// with the generic sitewide identity card. Same nameplate masthead as
// every other share surface — the kicker reads CONTACT and the subtitle
// carries a timeless role-plus-invite line.
import {
  renderCaseStudyCard,
  OG_SIZE,
  OG_CONTENT_TYPE,
} from "@/lib/og/case-study-card";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt =
  "Contact Malcolm Xavier—Senior PM in growth, marketing, and data platforms. Book a call or send an email.";

export default function OpenGraphImage() {
  // Name as the nameplate (140 to match the other name-cards); CONTACT
  // as the masthead kicker. The "Currently interviewing" line lives ONLY
  // in the meta description (easy to update), NOT baked into this cached
  // PNG — same discipline as the resume card.
  return renderCaseStudyCard({
    eyebrow: "CONTACT",
    titleLines: ["Malcolm Xavier"],
    titleSize: 140,
    subtitle: "Senior PM in growth, marketing, and data platforms—book a call.",
  });
}
