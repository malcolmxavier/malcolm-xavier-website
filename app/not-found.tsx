// ─────────────────────────────────────────────────────────────────
// /not-found — custom 404 page.
//
// Replaces the framework default ("404: This page could not be
// found.") with a branded dead-end that gives the visitor at least
// two ways back into the site. The framework default is still
// noindex (correct), but it has no nav, no voice, and no path to
// the recruiter funnel — a typo'd URL turned into a hard exit.
//
// Voice: editorial-sardonic, matching the rest of the site. The
// 404 is the lowest-stakes surface to be playful on.
//
// Closes m-no-not-found and l-not-found-title from the 2026-04-29
// /full-review.
// ─────────────────────────────────────────────────────────────────

import type { Metadata } from "next";
import { Container } from "@/components/layout/Container";
import { Section } from "@/components/layout/Section";
import { Stack } from "@/components/layout/Stack";
import { Display } from "@/components/typography/Display";
import { Body } from "@/components/typography/Body";
import { Kicker } from "@/components/typography/Kicker";
import { Link } from "@/components/primitives/Link";

export const metadata: Metadata = {
  // The template appends "—Malcolm Xavier" so the rendered <title>
  // is "You wandered off-script.—Malcolm Xavier". Reads fine.
  title: "You wandered off-script.",
  // Belt-and-suspenders: the framework default already noindexes
  // the not-found page, but stating it explicitly makes the intent
  // visible in code review.
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <Container size="md">
      <Section padding="lg">
        <Stack gap="500">
          <Kicker>404</Kicker>
          <Display>You wandered off-script.</Display>
          <Body>
            There&rsquo;s nothing at this URL. Maybe one of these
            will get you where you meant to go:
          </Body>
          <Stack gap="300" align="start">
            <Link href="/">Home &rarr;</Link>
            <Link href="/resume">Review my resume &rarr;</Link>
          </Stack>
        </Stack>
      </Section>
    </Container>
  );
}
