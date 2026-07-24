// Open Graph / Twitter card for /about. Copy only — the shared
// generator owns the layout (see lib/og/case-study-card.tsx).
//
// Gives /about its OWN card so a shared about link stops unfurling with
// the generic sitewide identity card. Same nameplate masthead as every
// other share surface — the kicker reads ABOUT and the subtitle carries
// the more personal, voice-forward positioning that distinguishes the
// about page from the resume (which leads on recruiter beats).
import {
  renderCaseStudyCard,
  OG_SIZE,
  OG_CONTENT_TYPE,
} from "@/lib/og/case-study-card";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt =
  "About Malcolm Xavier—Senior PM in media and streaming. Creative by trade, a child of the Internet.";

export default function OpenGraphImage() {
  // Name as the nameplate (140 to match the flagship home and resume
  // cards); ABOUT as the masthead kicker. The subtitle is the /about
  // voice — role plus the personal framing from the page's own
  // positioning — rather than the resume's recruiter-keyword line.
  return renderCaseStudyCard({
    eyebrow: "ABOUT",
    titleLines: ["Malcolm Xavier"],
    titleSize: 140,
    subtitle: "Senior PM in media and streaming—creative by trade, a child of the Internet.",
  });
}
