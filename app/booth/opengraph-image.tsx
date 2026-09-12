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
//
// It also speaks the page's register rather than the system's: the
// words here are "prioritized" and "workstream", never "ranked" and
// "lane". This card is the only thing a reader sees before deciding
// whether to click, so it is the last place internal vocabulary should
// survive. See the three-register note at the top of app/booth/page.tsx.
import {
  renderCaseStudyCard,
  OG_SIZE,
  OG_CONTENT_TYPE,
} from "@/lib/og/case-study-card";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt =
  "The Booth—a working surface that merges every workstream into one prioritized day, sized against the hours you actually have, with every decision written back into the system that owns the record.";

export default function OpenGraphImage() {
  return renderCaseStudyCard({
    eyebrow: "THE BOOTH",
    titleLines: ["One prioritized day,", "out of every system", "you work in"],
    titleSize: 84,
    subtitle:
      "Every workstream you have, merged into one day and sized against the hours you actually have—with every decision written back where it belongs.",
  });
}
