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
  { label: "Email", href: "mailto:malcolm.x.evans@gmail.com" },
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

// Year is computed at build time — swap for a runtime computation
// only if the build cadence ever drops below once a year (it won't).
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
          {/* col 1: wordmark + sardonic line */}
          <div className="space-y-4">
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
              style={{
                fontFamily: "var(--font-secondary)",
                fontSize: "var(--p-sm-font-size)",
                lineHeight: "var(--p-sm-line-height)",
                color: "var(--text-caption)",
                maxWidth: "30ch",
              }}
            >
              Built in Los Angeles, edited at hours that should
              embarrass me.
            </p>
          </div>

          {/* col 2: stay in touch */}
          <nav aria-label="Stay in touch" className="space-y-3">
            <Kicker>Stay in touch</Kicker>
            <ul className="space-y-2">
              {STAY_IN_TOUCH.map((item) => (
                <li key={item.label}>
                  <Link href={item.href} quiet>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* col 3: elsewhere */}
          <nav aria-label="Elsewhere on the internet" className="space-y-3">
            <Kicker>Elsewhere</Kicker>
            <ul className="space-y-2">
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
            <Dateline>v0.1 · MVP in flight</Dateline>
          </div>
        </Container>
      </div>
    </footer>
  );
}
