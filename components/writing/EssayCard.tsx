// ─────────────────────────────────────────────────────────────────
// EssayCard — one essay tile for the /writing hub and pillar grids.
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

export function EssayCard({ essay }: { essay: Essay }) {
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
          href={`/writing/${essay.pillar}/${essay.slug}`}
          aria-label={`Read the essay: ${essay.title}`}
        >
          Read the essay →
        </Link>
      </Stack>
    </Card>
  );
}
