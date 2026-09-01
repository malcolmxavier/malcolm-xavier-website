// Open Graph / Twitter card for /booth. Copy only — the shared
// generator owns the layout (see lib/og/case-study-card.tsx).
//
// Gives /booth its own card, because this is a link Malcolm sends to
// one person at a time in an email or a DM, and the unfurl is the only
// thing they see before deciding whether to click. The generic
// sitewide identity card would answer "who is this" when the question
// in front of the reader is "what am I being sent to".
//
// The title is the page's own headline, verbatim — an unfurl and the
// page behind it disagreeing about what a thing is called is the
// cheapest kind of credibility to lose — so this tracks the Display
// line on /booth and should be re-checked whenever that moves.
import {
  renderCaseStudyCard,
  OG_SIZE,
  OG_CONTENT_TYPE,
} from "@/lib/og/case-study-card";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt =
  "The Booth—the operating surface Malcolm Xavier runs his week from: six lanes of work merged into one day, ranked against a time budget, with every decision written back into the system that owns the record.";

export default function OpenGraphImage() {
  return renderCaseStudyCard({
    eyebrow: "THE BOOTH",
    titleLines: ["The surface I run", "my week from"],
    titleSize: 96,
    subtitle:
      "Six lanes of work, one day, one time budget—and every decision written back where it belongs.",
  });
}
