// ─────────────────────────────────────────────────────────────────
// EssayCard — one essay tile for the /essays hub and pillar grids.
//
// Mirrors the case-study card shape (Card → Kicker → Headline → Body →
// Link) so the two browse surfaces read as the same primitive, plus a
// Dateline carrying the essay's postDate. Kept plain (no Card `accent`
// stripe): the writing pillars aren't sub-brands, and Card's accent
// prop only accepts sub-brand slugs.
// ─────────────────────────────────────────────────────────────────

import { Card } from "@/components/primitives/Card";
import { Stack } from "@/components/layout/Stack";
import { Kicker } from "@/components/typography/Kicker";
import { Headline } from "@/components/typography/Headline";
import { Body } from "@/components/typography/Body";
import { Dateline } from "@/components/typography/Dateline";
import { Link } from "@/components/primitives/Link";
import {
  type Essay,
  WRITING_PILLARS,
  formatEssayDate,
} from "@/lib/writing/essays";

/** Build the essay link, carrying the listing it was clicked from.
 *
 *  `?from=<encoded listing URL>` is how the detail page knows which list
 *  the reader is walking: the back link returns to it, and the
 *  neighbour cards scope themselves to it instead of to the whole
 *  corpus. Same convention as /films (see buildDetailHref in
 *  app/films/FilmCard.tsx). No `?ref=` marker — that is a feeds-side
 *  signal for a back-link that pushes through the router, and this one
 *  is a plain link. */
function buildEssayHref(essay: Essay, originHref: string | undefined): string {
  const base = `/essays/${essay.pillar}/${essay.slug}`;
  if (!originHref) return base;
  return `${base}?from=${encodeURIComponent(originHref)}`;
}

export function EssayCard({
  essay,
  originHref,
}: {
  essay: Essay;
  /** URL of the listing this card sits on — "/essays" on the hub,
   *  "/essays/<pillar>" on a pillar page. Omitted → the detail page
   *  falls back to corpus-wide neighbours and a hub back link. */
  originHref?: string;
}) {
  return (
    <Card>
      <Stack gap="300">
        <Kicker>{WRITING_PILLARS[essay.pillar].label}</Kicker>
        <Headline
          level={3}
          style={{
            fontSize: "var(--h5-font-size)",
            lineHeight: "var(--h5-line-height)",
          }}
        >
          {essay.title}
        </Headline>
        <Body size="md">{essay.description}</Body>
        <Dateline as="time" dateTime={essay.postDate}>
          {formatEssayDate(essay.postDate)}
        </Dateline>
        {/* aria-label disambiguates the repeated "Read the essay →"
            string across cards for screen-reader link lists. */}
        <Link
          href={buildEssayHref(essay, originHref)}
          aria-label={`Read the essay: ${essay.title}`}
        >
          Read the essay →
        </Link>
      </Stack>
    </Card>
  );
}
