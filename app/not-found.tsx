// ─────────────────────────────────────────────────────────────────
// /not-found — custom 404 page.
//
// Replaces the framework default ("404: This page could not be
// found.") with a branded dead-end. The framework default is still
// noindex (correct), but it has no nav, no voice, and no way back.
//
// Voice: editorial-sardonic, matching the rest of the site, and
// borrowed from the film and TV half of it. The 404 is the
// lowest-stakes surface to be playful on.
//
// One link, Home. Everything else a visitor might have meant is
// already in the navigation above, so the page points there in words
// rather than repeating a second, shorter menu that goes stale.
//
// The oversized numeral is the page's one flourish: set in the
// display face at poster scale, so the dead-end reads as a designed
// page rather than an error message, without adding anything new to
// the site's type system. It stacks above the copy on narrow screens
// and sits beside it from `md` up.
// ─────────────────────────────────────────────────────────────────

import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { Container } from "@/components/layout/Container";
import { Section } from "@/components/layout/Section";
import { Stack } from "@/components/layout/Stack";
import { Display } from "@/components/typography/Display";
import { Body } from "@/components/typography/Body";
import { Link } from "@/components/primitives/Link";

export const metadata: Metadata = {
  // The template appends "—Malcolm Xavier", so the rendered <title>
  // is "Left on the cutting-room floor—Malcolm Xavier".
  title: "Left on the cutting-room floor",
  // No `robots` here: the framework already writes a noindex tag on
  // every not-found response, and stating it again printed a second,
  // disagreeing robots tag. The canonical is cleared because the root
  // layout's "/" would otherwise tell a crawler this missing page is
  // the home page.
  alternates: { canonical: null },
};

export default function NotFound() {
  return (
    <Container>
      <Section padding="lg">
        <div className="md:grid md:grid-cols-[auto_minmax(0,1fr)] md:items-end md:gap-x-16">
          {/* Poster-scale numeral. Real text, not decoration: it is the
              status the page reports, so a screen reader hears it too.
              Italic to match the footer's display italic, and trimmed to
              its glyphs so it sits flush on the copy's last line. */}
          <p
            className="m-0 mb-8 md:mb-0"
            style={{
              fontFamily: "var(--font-primary)",
              fontStyle: "italic",
              fontSize: "clamp(8rem, 22vw, 17rem)",
              lineHeight: 0.8,
              letterSpacing: "-0.03em",
              color: "var(--text-heading)",
              textBoxTrim: "trim-both",
              textBoxEdge: "cap alphabetic",
            } as CSSProperties}
          >
            404
          </p>
          <Stack gap="500">
            {/* "cutting-room" held together so a phone never breaks the
                headline at its hyphen. */}
            <Display>
              Left on the <span className="whitespace-nowrap">cutting-room</span> floor.
            </Display>
            <Body>
              Whatever was here didn’t make the final cut. Everything
              that did is up in the navigation.
            </Body>
            <div>
              <Link href="/">Home →</Link>
            </div>
          </Stack>
        </div>
      </Section>
    </Container>
  );
}
