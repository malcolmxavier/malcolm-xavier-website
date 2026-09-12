// ─────────────────────────────────────────────────────────────────
// Footer — one band that closes every page.
//
//   identity   wordmark, the sardonic site line, "Send this site",
//              and the © directly beneath it
//   links      "Stay in touch" (email, LinkedIn, GitHub) and
//              "Elsewhere" — the platforms Malcolm publishes to but
//              doesn't own (Letterboxd, Serializd, Spotify, Substack)
//   notes      the review-cluster disclaimers, flushed right
//
// It used to be two bands: three even thirds of the page, then a
// second strip below a full-bleed rule carrying the © and the
// disclaimers. That read as two footers stacked, and the even thirds
// spread four short lists across the whole width so nothing in the
// footer sat near anything it belonged with. Now the three clusters
// are sized to their content and packed against the left rail, the
// © sits with the mark it belongs to, and the disclaimers take the
// right-hand space the link columns leave — which on most of the
// site is simply empty, since they're scoped to /films and
// /television.
//
// Voice: the sardonic line is Malcolm's; leave the wording alone.
//
// All external links carry rel="noopener noreferrer" + target="_blank"
// (handled by the Link primitive when href is non-internal).
// ─────────────────────────────────────────────────────────────────

import { Container } from "@/components/layout/Container";
import { Link } from "@/components/primitives/Link";
import { Kicker } from "@/components/typography/Kicker";
import { Dateline } from "@/components/typography/Dateline";
import { FooterNotes } from "./FooterNotes";
import { ShareButton } from "./ShareButton";
import { TrackOnClick } from "@/components/analytics/TrackOnClick";
import { ANALYTICS_EVENTS } from "@/lib/analytics";
import { ELSEWHERE } from "@/lib/elsewhere";

// External destinations. ELSEWHERE (Letterboxd, Serializd, Spotify)
// lives in @/lib/elsewhere so the contact page and this footer stay
// in sync.
// Order: Email → LinkedIn → GitHub (canonical reach-out leads).
// Closes l-footer-stay-in-touch-order from the 2026-04-29
// /full-review.
const STAY_IN_TOUCH = [
  { label: "Email", href: "mailto:malcolm@malxavi.com" },
  { label: "LinkedIn", href: "https://www.linkedin.com/in/malxavi/" },
  { label: "GitHub", href: "https://github.com/malcolmxavier" },
];

// Year is computed once per cold start — Next evaluates module-level
// code at request time for Server Components, not at build time, so
// the value refreshes whenever the function instance restarts. Good
// enough for a copyright string; swap to a per-render computation
// only if the cold-start cadence ever drops below once a year.
const COPYRIGHT_YEAR = new Date().getFullYear();

export function Footer() {
  return (
    <footer
      // mt-auto pushes the footer to the bottom of the viewport when
      // page content is short (paired with min-h-full on <body>).
      // One border-t, and it is the only rule in the footer.
      className="mt-auto border-t"
      style={{ borderColor: "var(--border-default)" }}
    >
      <Container>
        {/* Stacked on mobile. From sm the clusters run as a row, each
            sized to its content rather than to an even share of the
            page, so they pack against the left rail and leave the
            right-hand space to the notes. flex-wrap is what lets the
            notes drop to their own line below xl, where the row is
            too narrow to carry them as well. */}
        <div className="flex flex-col gap-10 py-10 sm:flex-row sm:flex-wrap sm:items-start sm:gap-x-14 sm:gap-y-10">
          {/* Identity. Gaps are set via inline marginTop on each
              child, not on this wrapper, because every child carries
              an inline `margin: 0` that beats Tailwind v4's
              :where()-wrapped space-y rule on specificity. */}
          <div className="sm:w-64 sm:flex-none">
            <p
              style={{
                fontFamily: "var(--font-primary)",
                fontSize: "var(--p-lg-font-size)",
                // Match the Nav wordmark's tight leading so the same
                // mark reads with the same vertical weight in both
                // chrome surfaces.
                lineHeight: "1",
                margin: 0,
                color: "var(--text-heading)",
              }}
            >
              Malcolm Xavier
            </p>
            <p
              className="italic-kern"
              style={{
                // Italic primary serif at p-md so this line reads in
                // Malcolm's editorial voice rather than as system
                // chrome metadata. The previous DM Sans p-sm at
                // --text-caption read as a generic "footer caption"
                // and undercut the sardonic intent of the copy.
                fontFamily: "var(--font-primary)",
                fontStyle: "italic",
                fontSize: "var(--p-md-font-size)",
                lineHeight: "var(--p-md-line-height)",
                color: "var(--text-caption)",
                maxWidth: "30ch",
                margin: 0,
                marginTop: "24px",
              }}
            >
              Built in Los Angeles, edited at hours that should
              embarrass me.
            </p>
            {/* Share affordance — col reads wordmark → voice → quiet
                utility. Native share sheet on mobile, clipboard
                fallback on desktop. Closes m-no-share-affordance from
                the 2026-04-29 /full-review. */}
            <div style={{ marginTop: "20px" }}>
              <ShareButton />
            </div>
            {/* The © sits directly under the share button — same mono
                caption voice, one step quieter in colour, close enough
                that the two read as one block of chrome under the
                mark rather than as a second footer. */}
            <Dateline style={{ margin: 0, marginTop: "10px" }}>
              © {COPYRIGHT_YEAR} Malcolm Xavier
            </Dateline>
          </div>

          {/* The two link lists travel together as one flex item, so
              the pair stays adjacent instead of being spread apart by
              the row's own gap. Each kicker → list gap is inline
              marginTop on the <ul> for the specificity reason above;
              the inner ul keeps space-y-2 for list-item rhythm. */}
          <div className="flex gap-12 sm:flex-none sm:gap-14">
            <nav aria-label="Stay in touch">
              <Kicker>Stay in touch</Kicker>
              <ul className="space-y-2" style={{ marginTop: "24px" }}>
                {STAY_IN_TOUCH.map((item) => {
                  const linkEl = (
                    <Link href={item.href} quiet>
                      {item.label}
                    </Link>
                  );
                  // py-1 lifts the tap target to ~27px tall, clearing
                  // the WCAG 2.2 SC 2.5.8 24×24 minimum. The email
                  // entry is wrapped with TrackOnClick (EMAIL_CLICK,
                  // kind=direct, surface=footer); LinkedIn / GitHub
                  // aren't tracked (not in the funnel-event spec).
                  return (
                    <li key={item.label} className="py-1">
                      {item.href.startsWith("mailto:") ? (
                        <TrackOnClick
                          event={ANALYTICS_EVENTS.EMAIL_CLICK}
                          eventData={{ kind: "direct", surface: "footer" }}
                        >
                          {linkEl}
                        </TrackOnClick>
                      ) : (
                        linkEl
                      )}
                    </li>
                  );
                })}
              </ul>
            </nav>

            <nav aria-label="Elsewhere on the internet">
              <Kicker>Elsewhere</Kicker>
              <ul className="space-y-2" style={{ marginTop: "24px" }}>
                {ELSEWHERE.map((item) => (
                  <li key={item.label} className="py-1">
                    <Link href={item.href} quiet>
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>

          {/* Editorial disclaimer + TMDB attribution, on the review
              clusters only. Renders nothing at all off those routes,
              so the row closes up rather than reserving an empty
              column — see FooterNotes for why that check lives there
              and not here. */}
          <FooterNotes />
        </div>
      </Container>
    </footer>
  );
}
