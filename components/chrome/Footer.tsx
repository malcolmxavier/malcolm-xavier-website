// ─────────────────────────────────────────────────────────────────
// Footer — three-column grid that closes every page.
//
//   col 1   wordmark + sardonic site line
//   col 2   "Stay in touch" — email, LinkedIn, GitHub
//   col 3   "Elsewhere" — the platforms Malcolm publishes to but
//           doesn't own (Letterboxd, Serializd, Spotify, Substack)
//
// Bottom row: © year on the left, last-touched dateline on the
// right. The dateline is hard-coded for now; can be wired to the
// build timestamp post-MVP.
//
// Voice: this footer line is a placeholder. The brand voice for
// site copy is "sartorial with a dash of sardonic" — Malcolm will
// edit. It's intentionally not too clever yet.
//
// All external links carry rel="noopener noreferrer" + target="_blank"
// (handled by the Link primitive when href is non-internal).
// ─────────────────────────────────────────────────────────────────

import { Container } from "@/components/layout/Container";
import { Link } from "@/components/primitives/Link";
import { Kicker } from "@/components/typography/Kicker";
import { Dateline } from "@/components/typography/Dateline";

// External destinations. Email + GitHub + Letterboxd + Serializd +
// Spotify confirmed via brain-dump; LinkedIn + Substack pending and
// will be added when Malcolm provides URLs.
const STAY_IN_TOUCH = [
  { label: "LinkedIn", href: "https://www.linkedin.com/in/malxavi/" },
  { label: "Email", href: "mailto:malcolm@malxavi.com" },
  { label: "GitHub", href: "https://github.com/malcolmxavier" },
];

const ELSEWHERE = [
  { label: "Letterboxd", href: "https://letterboxd.com/malxavi/" },
  {
    label: "Serializd",
    href: "https://www.serializd.com/user/malxavi/profile",
  },
  { label: "Spotify", href: "https://open.spotify.com/user/malcolmxevans" },
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
      className="mt-auto border-t"
      style={{ borderColor: "var(--border-default)" }}
    >
      <Container size="lg">
        <div className="grid grid-cols-1 gap-10 py-12 sm:grid-cols-3 sm:py-16">
          {/* col 1: wordmark + sardonic line. Gap is set via inline
              marginTop on the italic <p> (24px), not on this
              wrapper, because both children carry inline margin: 0
              that would override any wrapper space-y rule. */}
          <div>
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
                // marginTop sets the gap to the wordmark above; the
                // other three margin sides stay 0 to keep the column
                // bottom-aligned with the rest of the footer rhythm.
                // We can't lean on the wrapper's space-y because every
                // first-child header in the footer (wordmark + both
                // Kickers) has inline `margin: 0`, which beats
                // Tailwind v4's :where()-wrapped space-y rule on
                // specificity grounds. So the gap lives here.
                margin: 0,
                marginTop: "24px",
              }}
            >
              Built in Los Angeles, edited at hours that should
              embarrass me.
            </p>
          </div>

          {/* col 2: stay in touch. The kicker → list gap is set via
              inline marginTop on the <ul> (24px), not via wrapper
              space-y, because the Kicker's inline `margin: 0` would
              beat the :where()-scoped space-y selector on
              specificity. The inner ul still uses space-y-2 for
              list-item rhythm. */}
          <nav aria-label="Stay in touch">
            <Kicker>Stay in touch</Kicker>
            <ul className="space-y-2" style={{ marginTop: "24px" }}>
              {STAY_IN_TOUCH.map((item) => (
                <li key={item.label}>
                  <Link href={item.href} quiet>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* col 3: elsewhere. Same kicker → list gap pattern as col 2
              (inline marginTop on the ul, not wrapper space-y). */}
          <nav aria-label="Elsewhere on the internet">
            <Kicker>Elsewhere</Kicker>
            <ul className="space-y-2" style={{ marginTop: "24px" }}>
              {ELSEWHERE.map((item) => (
                <li key={item.label}>
                  <Link href={item.href} quiet>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </Container>

      {/* Bottom row: © + dateline. The border-t lives on this OUTER
          div (outside the Container) so it spans the full viewport
          width — matches the footer's top border-t and reads as a
          consistent horizontal rule sitewide. The Container inside
          re-constrains the dateline content so it stays aligned
          with the columns above. Stacks on mobile, splits on tablet+. */}
      <div
        className="border-t"
        style={{ borderColor: "var(--border-default)" }}
      >
        <Container size="lg">
          <div className="flex flex-col gap-2 py-6 sm:flex-row sm:items-center sm:justify-between">
            <Dateline>© {COPYRIGHT_YEAR} Malcolm Xavier</Dateline>
          </div>
        </Container>
      </div>
    </footer>
  );
}
