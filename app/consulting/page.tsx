// ─────────────────────────────────────────────────────────────────
// /consulting — the public services page for the consulting practice.
//
// Structure is a three-rung buying ladder, deliberately ordered by
// commitment rather than by price:
//
//   1. "Start here"     — fixed price, fixed scope, ≤2 weeks. The
//                         low-risk door. A buyer who has never worked
//                         with Malcolm can say yes to one of these
//                         without a procurement conversation.
//   2. "Build"          — scoped per project, quoted after a call.
//   3. "Keep it running" — monthly retainers.
//
// Anything outside the menu falls back to the $150/hr advisory rate,
// stated in "How engagements work" — so a buyer who does not see
// their problem here still has a way to buy.
//
// LAYOUT — this is a menu, not an essay, so the menu leads. The hero
// is deliberately short (kicker, headline, one lede, one grounding
// line, the CTAs) and there is no stat block: the numbers live on
// /resume and /case-studies, which the hero links to. Anything longer
// pushes the first priced row below the fold on a laptop, which is the
// one thing a services page cannot afford.
//
// Proof that does live on this page — the client roster and the
// quotes — sits *below* the ladder, for the same reason. A reader
// looks for it once a price has caught their eye, not before.
//
// The page uses the site's index-surface shell — Container size="lg"
// wrapping a lg:grid with a 14rem left gutter — so the TOC is a
// persistent sticky rail rather than an inline list a reader scrolls
// past once and cannot get back to. Same primitives as /resume and
// /case-studies (TableOfContents + useScrollSpy at lg+, TocDisclosure
// below it), so all three index surfaces behave identically.
//
// Copy lives inline (not MDX) on purpose, matching /about: editorial
// passes shouldn't need a second file open. Source draft was the
// "Practice and Rates" artifact; five claims were corrected against
// app/resume/resume-data.tsx and the People Inc. case study before
// this shipped — see the CLAIMS note below.
//
// CLAIMS — every number on this page is load-bearing because this
// page sells services for money. Corrections applied 2026-08-24:
//   • "seven years inside publishers and marketplaces" → seven years
//     building the platforms, 4.5 of them inside publishers and
//     marketplaces (User Interviews + Muck Rack + People Inc. by the
//     résumé's own dates).
//   • "+33% YoY email revenue" was a whole-marketing-organization
//     outcome, so it is now framed as the portfolio tripling the
//     growth rate above a ~12% baseline — the attribution the case
//     study itself uses, and the stronger claim besides. (That stat
//     block has since been cut from this page; the framing survives
//     wherever the number is used next.)
//   • "$2.2M ... by a single launch" → modelled, single brand.
//   • "MS in Law in privacy and IP" → focused on data privacy and IP.
//     (That offer has since been cut and privacy folded into the data
//     audit; the correction stands wherever the credential is used
//     next.)
//   • "alongside full-time product work" removed — not currently true.
// ─────────────────────────────────────────────────────────────────

import type { Metadata } from "next";
import { Container } from "@/components/layout/Container";
import { Section } from "@/components/layout/Section";
import { Stack } from "@/components/layout/Stack";
import { Grid } from "@/components/layout/Grid";
import { Display } from "@/components/typography/Display";
import { Headline } from "@/components/typography/Headline";
import { Lede } from "@/components/typography/Lede";
import { Body } from "@/components/typography/Body";
import { Kicker } from "@/components/typography/Kicker";
import { Button } from "@/components/primitives/Button";
import { Card } from "@/components/primitives/Card";
import { Link } from "@/components/primitives/Link";
import {
  TableOfContents,
  type TocItem,
} from "@/components/chrome/TableOfContents";
import { TocDisclosure } from "@/components/chrome/TocDisclosure";
import { TrackOnClick } from "@/components/analytics/TrackOnClick";
import { ANALYTICS_EVENTS } from "@/lib/analytics";
import { SITE_URL } from "@/lib/site-config";
import { CONTACT } from "../resume/resume-data";

// ─── Metadata ────────────────────────────────────────────────────
// Per-page openGraph + twitter blocks because the App Router REPLACES
// (does not merge) the parent layout's OG block when a page declares
// its own. Without these, a shared /consulting link unfurls with the
// sitewide stub rather than the offer.
const CONSULTING_DESCRIPTION =
  "Fixed-scope audits, project builds, and retainers in growth systems, customer data platforms, and AI-native operations—for media, publishing, and mission-driven teams.";
const CONSULTING_OG_TITLE =
  "Consulting · Growth systems, customer data, and AI-native operations";

export const metadata: Metadata = {
  // The root layout's `%s—Malcolm Xavier` template appends the brand
  // once, so it is not repeated here.
  title: "Consulting · Growth, MarTech, and AI-native operations",
  description: CONSULTING_DESCRIPTION,
  // Explicit canonical — without it this route inherits the root
  // layout's canonical-of-"/" and reads to Googlebot as a duplicate
  // of the landing page.
  alternates: {
    canonical: "/consulting",
  },
  openGraph: {
    title: CONSULTING_OG_TITLE,
    description: CONSULTING_DESCRIPTION,
    type: "website",
    url: "/consulting",
    siteName: "Malcolm Xavier",
    locale: "en_US",
    // No explicit `images` — ./opengraph-image.tsx resolves this
    // route's own card via the App Router file convention.
  },
  twitter: {
    card: "summary_large_image",
    title: CONSULTING_OG_TITLE,
    description: CONSULTING_DESCRIPTION,
  },
};

// ─── Offer data ──────────────────────────────────────────────────
// One shape for every rung of the ladder. `price` is the display
// string a reader sees; `amount` + `from` are the machine-readable
// pair the JSON-LD offer catalog is built from, so the page and the
// structured data can never drift apart by hand-editing one of them.
type Offer = {
  name: string;
  /** Display price, e.g. "$3,500" or "from $6,000". */
  price: string;
  /** Timing/units note rendered beside the price, e.g. "~2 weeks". */
  unit?: string;
  /** Numeric price in USD, for structured data. */
  amount: number;
  /** True when `amount` is a floor rather than a fixed price. */
  from: boolean;
  description: string;
  /**
   * Scannable specifics under the prose — three per card, in the same
   * order every time: what you get, how it runs, and who it suits.
   *
   * PLACEHOLDER COPY. These are a first pass so the prose/bullet mix
   * can be judged at real length; the facts are drawn from each
   * scope's own description and are Malcolm's to confirm or rewrite.
   *
   * They deliberately do not restate the prose above them. A bullet
   * that repeats the sentence it sits under costs a reader a line and
   * tells them nothing, which is the usual failure of this pattern.
   */
  highlights?: string[];
  /**
   * Badge text that promotes this offer to the highlighted card in
   * its tier — the subscription-page "this is the one" treatment.
   *
   * PLACEHOLDER SELECTION. Which offers carry a badge, and whether
   * there is one per tier at all, is Malcolm's call; these three are
   * a first pass so the styling can be judged against real copy.
   *
   * The vocabulary is deliberately opinion, never popularity. "Most
   * popular" and "most booked" are volume claims, and the practice
   * has not sold enough to make either one true — a defensibility
   * problem on a page that takes money, same standard as the stats.
   * A recommendation is his own judgment and needs no receipt.
   */
  featured?: string;
};

type Tier = {
  id: string;
  kicker: string;
  title: string;
  /** The commitment terms that apply to every offer in the tier. */
  terms: string;
  offers: Offer[];
};

const TIERS: Tier[] = [
  {
    id: "checkups",
    kicker: "01",
    title: "Checkups",
    terms: "Fixed price, fixed scope, two weeks or less",
    offers: [
      {
        name: "AEO/GEO and lifecycle audit",
        price: "$3,500",
        unit: "~2 weeks",
        amount: 3500,
        from: false,
        featured: "Recommended starting point",
        description:
          "A written diagnosis of how your audience finds you, how they enter your funnel, and where they drop off. Includes a strategic plan to make your system work harder for you.",
        highlights: [
          "Technical AEO/GEO review to improve brand discovery",
          "Full-funnel teardown to drive acquisition and engagement",
          "Prioritized recommendations to maximize impact",
        ],
      },
      {
        name: "Data and analytics audit",
        price: "$2,500",
        unit: "~1 week",
        amount: 2500,
        from: false,
        description:
          "A review of your event taxonomy, data schema, dashboards, and governance. Includes an instrumentation plan an engineer or an agent can pick up.",
        highlights: [
          "Current-state map of your events and data flow",
          "Tracking spec and future-state map of events and data flow",
          "Compliance audit (GDPR and CCPA) included",
        ],
      },
    ],
  },
  {
    id: "implementation",
    kicker: "02",
    title: "Implementation",
    terms: "Project scope, quoted after a short discovery call",
    offers: [
      {
        name: "Website and content platform",
        price: "from $6,000",
        unit: "project",
        amount: 6000,
        from: true,
        featured: "Best for individuals",
        // The card sells the build first and the content platform second, on
        // purpose. Everything here used to describe the platform version, so a
        // buyer who wanted a plain site read $6,000 as the price of a system
        // they had no use for. The floor buys the site; the platform is what
        // moves a project up from it.
        description:
          "A fast, accessible site you can self-manage. Can be scaled into a full content platform if you publish regularly. Designed to drive discovery and return traffic by default.",
        highlights: [
          "Design, build, and launch on basic infrastructure",
          "AEO/GEO/SEO, analytics, and accessibility out-of-the-box",
          "A content model and publishing workflow layered on when you need one",
        ],
      },
      {
        name: "Email program design",
        price: "from $6,000",
        unit: "project",
        amount: 6000,
        from: true,
        description:
          "An automated email program that brings your audience back. Segmentation, triggered journeys, and reusable onsite and in-email components. Includes deliverability and data consent mechanics.",
        highlights: [
          "Segment definitions, journey maps, and a template system",
          "Data-driven campaign automations and reporting",
          "Integrate into AI-native operational workflows for continuous optimization",
        ],
      },
      {
        name: "MarTech and data architecture",
        price: "from $8,000",
        unit: "project",
        amount: 8000,
        from: true,
        description:
          "An integrated growth system that grows with your audience. Determine what to build, what to buy, and in what order to scale your operations. Build for today while planning for the future.",
        highlights: [
          "Gap analysis on your existing system",
          "New vendor evaluation and procurement",
          "Phased development plan that optimizes and builds onto your existing setup at the same time",
        ],
      },
    ],
  },
  {
    id: "ongoing-support",
    kicker: "03",
    title: "Ongoing Support",
    terms: "Monthly retainer, three-month minimum",
    offers: [
      {
        name: "AI-native operations",
        price: "from $2,500",
        unit: "setup",
        amount: 2500,
        from: true,
        featured: "Best for small teams",
        description:
          "A working setup for your team to drive operations with modern, agentic workflows. Seamless automations that allow your time to be spent on valuable, human work.",
        highlights: [
          "Human-in-the-loop workflows that automate low-value work and focus your time on delivering your expertise",
          "Live training sessions and written runbooks that keep your AI skills fresh",
          "Ongoing monthly support once the setup is in place",
        ],
      },
      {
        name: "Fractional product partner",
        price: "from $1,500",
        unit: "per month",
        amount: 1500,
        from: true,
        description:
          "End-to-end product support when you need a thought partner, but not a full-time employee. Assistance from roadmapping to development management.",
        highlights: [
          "Standing weekly time, including development rituals, plus async access in between",
          "Prioritization, documentation, user research, and data analysis",
          "Everything between the gaps that you need a product person to help with",
        ],
      },
    ],
  },
];

// ─── Engagement terms ────────────────────────────────────────────
// The rules that sit under every tier. "Arts and nonprofits" is the
// door for reduced-rate work: it commits to flexibility publicly
// without publishing a second, lower number that would then become
// the anchor for commercial buyers.
const ENGAGEMENT_TERMS: { term: string; detail: string }[] = [
  {
    term: "Hourly",
    detail:
      "$150 for advisory work that does not fit a fixed scope.",
  },
  {
    term: "Projects",
    detail:
      "Half at kickoff, bi-weekly thereafter. Significant scope changes addressed per project.",
  },
  {
    term: "Arts, nonprofits, and small businesses",
    detail:
      "Reduced rates, based on project scope.",
  },
  {
    term: "Availability",
    detail:
      "Selective. I commit to a small number of engagements at a time, so clients receive high quality.",
  },
  {
    term: "Not my work",
    detail:
      "Paid media buying, brand identity design, and anything that needs a designer more than it needs a product person. I would rather refer you well than take it on.",
  },
];

// ─── Proof ───────────────────────────────────────────────────────
// Past clients and quotes, sourced from the "Malcolm Xavier
// Consulting" role in app/resume/resume-data.tsx but deliberately not
// imported from it. The résumé answers "what has he done" in the
// compressed grammar a recruiter reads; this page answers "who has
// trusted him with this", which a buyer asks differently. Sharing the
// strings would force one voice onto both surfaces, so the facts are
// mirrored and the phrasing is local — if an engagement is added to
// the résumé, add it here too.
type Client = {
  /**
   * Kept to one line at the card's width. The card stacks years, name, and
   * work in flow, so a name that wraps pushes the work line below its
   * neighbours' and the row loses its shared baseline. Reserving a fixed
   * two-line slot was the alternative and it costs every card a line of
   * dead space to insure against a length that is not in the data — so the
   * constraint lives here, on the content, and an organization that needs
   * more room goes in by the short form it is known by, with the full name
   * carried in `work`.
   */
  name: string;
  /** Optional outbound link. Omitted for clients under NDA. */
  href?: string;
  /** Engagement window, e.g. "2022" or "2026 – present". */
  years: string;
  /** One line on the work itself, in buyer language. */
  work: string;
};

const CLIENTS: Client[] = [
  {
    name: "Fleet",
    href: "https://www.fleetai.com",
    years: "2026 – present",
    work: "AI training and evaluation—prompting for simulated-environment research.",
  },
  {
    name: "DataAnnotation",
    href: "https://www.dataannotation.tech",
    years: "2023 – 2026",
    work: "LLM and agent training—chain-of-thought and meta-prompting, evaluation rubrics and criteria, and peer review of model outputs.",
  },
  {
    name: "Artist Growth",
    href: "https://www.artistgrowth.com",
    years: "2022",
    work: "Product operations, plus GDPR and CCPA compliance work.",
  },
  {
    name: "NEFA",
    href: "https://www.nefa.org",
    years: "2022",
    work: "Content strategy for the New England Foundation for the Arts—what to publish, for whom, and how the programs it funds get found.",
  },
  {
    // No link, no name: the engagement is private. Naming the work
    // without naming the client is the honest version of a logo wall.
    name: "Private client",
    years: "2022",
    work: "Analytics architecture and data strategy, from event design through to the reporting decisions and dashboard design.",
  },
  {
    // Last, and named as what it is. Running my own products is the
    // longest engagement in the list and the one a buyer can inspect
    // in full — but it is not a client, and dressing it as one would
    // be the first thing a careful reader caught.
    name: "My own products",
    years: "Ongoing",
    work: "This site and the editorial operation behind my published writing, built and run on an AI-native setup with agentic workflows in the loop.",
  },
];

type Testimonial = {
  quote: string;
  name: string;
  /** Role and organization, rendered under the name. */
  credit?: string;
};

// PLACEHOLDER. The section below renders only entries with a non-empty
// `quote`, and the TOC entry follows the same test — so emptying the
// string removes the section, its anchor, and its rail item together,
// with no orphaned link left pointing at nothing.
//
// This one is unfilled on purpose and must not ship as written: it is
// bracketed rather than plausible-sounding precisely so a draft quote
// can never be mistaken for a real one on a page that takes money.
const TESTIMONIALS: Testimonial[] = [
  {
    quote: "",
    name: "Morganna",
    credit: "[Role, organization]",
  },
];

const VISIBLE_TESTIMONIALS = TESTIMONIALS.filter(
  (testimonial) => testimonial.quote.trim().length > 0,
);

// ─── In-page navigation ──────────────────────────────────────────
// Sticky rail at lg+, disclosure below it — the same pair /resume and
// /case-studies use. Tier entries are generated from TIERS so a new
// rung cannot ship without an entry, and the two fixed sections
// bracket them: "↑ Top" returns to the CTAs, and the last two are the
// terms and the close.
const TOC_ITEMS: TocItem[] = [
  { href: "#top", label: "↑ Top" },
  ...TIERS.map((tier) => ({
    href: `#${tier.id}`,
    prefix: tier.kicker,
    label: tier.title,
  })),
  { href: "#past-clients", label: "Past clients" },
  ...(VISIBLE_TESTIMONIALS.length > 0
    ? [{ href: "#what-clients-say", label: "What clients say" }]
    : []),
  { href: "#how-engagements-work", label: "How engagements work" },
  { href: "#start-a-conversation", label: "Start a conversation" },
];

function ConsultingTableOfContents() {
  return (
    <aside className="hidden lg:block">
      <div className="sticky top-24">
        <TableOfContents items={TOC_ITEMS} ariaLabel="Page sections" />
      </div>
    </aside>
  );
}

// Shared anchor offset so TOC jumps land below the sticky Nav.
// Matches the rail's `top-24` sticky offset, same as /resume.
const sectionAnchorStyle: React.CSSProperties = { scrollMarginTop: "6rem" };

// ─── JSON-LD ─────────────────────────────────────────────────────
// Two connected nodes, following STRUCTURED-DATA.md's two-tier rule:
//
//   WebPage  → isPartOf   → #website   (the site)
//            → mainEntity → #service   (what the page is about)
//            → about      → #person    (the canonical Malcolm entity)
//   Service  → provider   → #person
//
// The offer catalog is generated from TIERS so the prices a reader
// sees and the prices a search engine reads come from one source.
// "from $X" prices emit a PriceSpecification with minPrice rather
// than a flat `price`, because publishing a floor as a fixed price
// would misrepresent the offer in rich results.
const SERVICE_ID = `${SITE_URL}/consulting/#service`;

const CONSULTING_SCHEMA = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": `${SITE_URL}/consulting/#webpage`,
      url: `${SITE_URL}/consulting`,
      name: CONSULTING_OG_TITLE,
      description: CONSULTING_DESCRIPTION,
      isPartOf: { "@id": `${SITE_URL}/#website` },
      mainEntity: { "@id": SERVICE_ID },
      about: { "@id": `${SITE_URL}/#person` },
    },
    {
      "@type": "Service",
      "@id": SERVICE_ID,
      name: "Product and data consulting",
      description: CONSULTING_DESCRIPTION,
      provider: { "@id": `${SITE_URL}/#person` },
      areaServed: "Remote, worldwide",
      serviceType: [
        "Growth and lifecycle strategy",
        "Customer data platform architecture",
        "Marketing technology consulting",
        "Data privacy and governance review",
        "AI-native operations training",
      ],
      hasOfferCatalog: {
        "@type": "OfferCatalog",
        name: "Consulting engagements",
        itemListElement: TIERS.map((tier) => ({
          "@type": "OfferCatalog",
          name: tier.title,
          itemListElement: tier.offers.map((offer) => ({
            "@type": "Offer",
            name: offer.name,
            description: offer.description,
            priceCurrency: "USD",
            ...(offer.from
              ? {
                  priceSpecification: {
                    "@type": "PriceSpecification",
                    priceCurrency: "USD",
                    minPrice: offer.amount,
                  },
                }
              : { price: offer.amount }),
            itemOffered: {
              "@type": "Service",
              name: offer.name,
              provider: { "@id": `${SITE_URL}/#person` },
            },
          })),
        })),
      },
    },
  ],
};

// ─── Offer card ──────────────────────────────────────────────────
// One card per offer. A featured offer gets three signals rather than
// one, because a single cue (colour alone) fails for a reader who
// cannot see it: the badge names the recommendation in text, the
// border takes the accent, and the surface lifts to --surface-muted.
// Colour is never the only carrier.
//
// The accent is --cs-accent-strong, the site's existing recruiter
// green — the same token the TOC active state and case-study chrome
// read, declared at :root and already contrast-checked in both
// themes (green-700 on white, green-500 on black). Reaching for a
// new highlight colour here would have put a fourth palette on a
// page whose whole job is to look like the rest of the site. The
// badge sits the page colour on top of it, so it inverts cleanly in
// both themes.
function OfferCard({
  offer,
  reserveBadge,
}: {
  offer: Offer;
  /**
   * True when any offer in this row carries a badge. The badge is the
   * first thing in the card, so on a row where only one card has one
   * every other card starts a badge-height lower — the name, the
   * price, and the prose under them all step out of line across the
   * row. Rendering the slot on every card in the row, filled or not,
   * puts them back on one baseline.
   *
   * A hidden copy of the real element rather than a hard-coded
   * height: the pill's height comes from its font, its line box, and
   * its padding, and a magic number here would drift the first time
   * any of the three is touched.
   */
  reserveBadge: boolean;
}) {
  const isFeatured = Boolean(offer.featured);

  return (
    <Card
      padded={false}
      className="h-full"
      style={
        isFeatured
          ? {
              borderColor: "var(--cs-accent-strong)",
              background: "var(--surface-muted)",
            }
          : undefined
      }
    >
      {/* padded={false} + a tighter inner pad: Card's default
          p-6/sm:p-8 is sized for case-study tiles and would push this
          page past three screens on a laptop. */}
      <div className="flex flex-col gap-3 p-5 h-full">
        {reserveBadge ? (
          <p
            // `invisible` is visibility: hidden, so the placeholder
            // holds its space and is dropped from the accessibility
            // tree at the same time — no aria-hidden needed, and no
            // empty pill announced to a screen reader.
            className={`m-0 self-start rounded-full px-2.5 py-1 text-[10px] uppercase tracking-[0.18em]${
              // Below sm the grid is one column, so each card is its
              // own row and there is nothing to line up with — an
              // empty slot there is dead space on the smallest screen.
              // The placeholder only exists where cards share a row.
              offer.featured ? "" : " invisible hidden sm:block"
            }`}
            style={{
              fontFamily: "var(--font-mono)",
              background: "var(--cs-accent-strong)",
              color: "var(--surface-page)",
            }}
          >
            {offer.featured ?? "\u00A0"}
          </p>
        ) : null}
        <Headline level={3}>{offer.name}</Headline>
        {/* Price and unit read as one line but are two elements so the
            unit can stay visually subordinate without faking it with
            markup. */}
        <p className="m-0 flex flex-wrap items-baseline gap-2">
          <span
            className="text-[24px] leading-none tracking-[-0.02em]"
            style={{
              fontFamily: "var(--font-primary)",
              color: "var(--text-heading)",
            }}
          >
            {offer.price}
          </span>
          {offer.unit ? (
            <span
              className="text-[12px] uppercase tracking-[0.12em]"
              style={{
                fontFamily: "var(--font-mono)",
                color: "var(--text-caption)",
              }}
            >
              {offer.unit}
            </span>
          ) : null}
        </p>
        <Body size="sm">{offer.description}</Body>
        {offer.highlights ? (
          /* Held at the same size and colour as the prose above rather
             than shrunk into a caption: this is the part a buyer scans
             hardest, and tinting it would trade legibility for a visual
             distinction the disc markers already carry. Body renders as
             the <ul> so the list inherits the type scale instead of
             hard-coding a second one. */
          <Body
            as="ul"
            size="sm"
            className="m-0 flex list-disc flex-col gap-1.5 pl-5 marker:text-[var(--text-caption)]"
          >
            {offer.highlights.map((highlight) => (
              <li key={highlight}>{highlight}</li>
            ))}
          </Body>
        ) : null}
      </div>
    </Card>
  );
}

// ─── Client card ─────────────────────────────────────────────────
// Years lead, then the client, then the work. That order is on purpose:
// a roster is read for range and recency before it is read for names,
// and leading with the date lets a reader see at a glance that the
// practice has been running since 2022. The heading is an h3 held at
// the h5 size step, matching the case-study tiles, so six of these in
// a grid stay a list rather than becoming six competing headlines.
function ClientCard({ client }: { client: Client }) {
  return (
    <Card padded={false} className="h-full">
      <div className="flex flex-col gap-2 p-5 h-full">
        <p
          className="m-0 text-[12px] uppercase tracking-[0.12em]"
          style={{
            fontFamily: "var(--font-mono)",
            color: "var(--text-caption)",
          }}
        >
          {client.years}
        </p>
        <Headline
          level={3}
          className="text-balance"
          style={{
            fontSize: "var(--h5-font-size)",
            lineHeight: "var(--h5-line-height)",
          }}
        >
          {client.href ? (
            <Link href={client.href}>{client.name}</Link>
          ) : (
            client.name
          )}
        </Headline>
        <Body size="sm">{client.work}</Body>
      </div>
    </Card>
  );
}

// ─── Testimonial card ────────────────────────────────────────────
// figure/blockquote/figcaption rather than a styled div, so the
// attribution is programmatically tied to the quote it belongs to
// instead of just sitting near it. The quote takes the muted surface
// and the display font at h5 to read as testimony rather than as more
// body copy.
function TestimonialCard({ testimonial }: { testimonial: Testimonial }) {
  return (
    <Card
      padded={false}
      className="h-full"
      style={{ background: "var(--surface-muted)" }}
    >
      <figure className="m-0 flex flex-col gap-4 p-6 h-full">
        <blockquote className="m-0">
          <p
            className="m-0 text-pretty"
            style={{
              fontFamily: "var(--font-primary)",
              fontSize: "var(--h5-font-size)",
              lineHeight: "var(--h5-line-height)",
              color: "var(--text-heading)",
            }}
          >
            “{testimonial.quote}”
          </p>
        </blockquote>
        {/* mt-auto pins the attribution to the bottom edge so a short
            quote and a long one still line their credits up. */}
        <figcaption className="mt-auto flex flex-col gap-1">
          <span
            className="text-[14px]"
            style={{
              fontFamily: "var(--font-primary)",
              color: "var(--text-heading)",
            }}
          >
            {testimonial.name}
          </span>
          {testimonial.credit ? (
            <span
              className="text-[12px] uppercase tracking-[0.12em]"
              style={{
                fontFamily: "var(--font-mono)",
                color: "var(--text-caption)",
              }}
            >
              {testimonial.credit}
            </span>
          ) : null}
        </figcaption>
      </figure>
    </Card>
  );
}

export default function ConsultingPage() {
  return (
    <>
      <script
        type="application/ld+json"
        // JSON.stringify output is machine-generated from the constant
        // above, never user input, so there is no injection surface.
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(CONSULTING_SCHEMA),
        }}
      />

      <Container size="lg">
        {/* Two-column on desktop: TOC rail in the left gutter, the menu
            on the right. Below lg the rail is hidden and the content
            reverts to a single readable column constrained to ~64rem —
            the same wrapper /resume and /case-studies use. */}
        <div className="mx-auto max-w-[64rem] lg:max-w-none lg:grid lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-16">
          <ConsultingTableOfContents />
          <div>
            {/* ─── Hero ───────────────────────────────────────────── */}
            {/* Short on purpose — see the LAYOUT note at the top of the
                file. The proof this page used to carry as a stat block
                is one sentence and two links now; the numbers live on
                the surfaces built to hold them. */}
            <Section id="top" style={sectionAnchorStyle} padding="lg">
              <Stack gap="400">
                <Kicker as="p">Consulting</Kicker>
                <Display as="h1">Growth consulting for the AI era</Display>
                <Lede>
                  Work with me to level up your relationship with your audience. I can help you design and develop
                  AI-native growth and lifecycle marketing operations that meet your needs, whether you want to
                  scale your operations or you’re just getting started.
                </Lede>
                <Body size="sm" style={{ color: "var(--text-caption)" }}>
                  I’ve spent nearly a decade building growth and data
                  infrastructure across a variety of businesses in the
                  SaaS and consumer product spaces. Most recently, I
                  built and operated MarTech infrastructure for 22M+ users
                  across People Inc.’s 40+ brands, driving 33% YoY email
                  revenue growth. Find more details on{" "}
                  <Link href="/resume">my résumé</Link> and{" "}
                  <Link href={CONTACT.linkedin}>LinkedIn</Link>.
                </Body>

                {/* Primary CTA sits above the fold on desktop so a buyer
                    who already knows what they want never has to scroll
                    the whole menu to act. Repeated at the foot for the
                    reader who does scroll. */}
                <div className="flex flex-wrap gap-3 pt-2">
                  <TrackOnClick
                    event={ANALYTICS_EVENTS.CALENDLY_CLICK}
                    eventData={{
                      kind: "outbound",
                      surface: "consulting-hero",
                    }}
                  >
                    <Button
                      as="a"
                      href={CONTACT.calendly}
                      variant="primary"
                      size="lg"
                    >
                      Book a discovery call
                    </Button>
                  </TrackOnClick>
                  <TrackOnClick
                    event={ANALYTICS_EVENTS.EMAIL_CLICK}
                    eventData={{ kind: "direct", surface: "consulting-hero" }}
                  >
                    <Button
                      as="a"
                      href={`mailto:${CONTACT.email}`}
                      variant="secondary"
                      size="lg"
                    >
                      Email me
                    </Button>
                  </TrackOnClick>
                </div>
              </Stack>
            </Section>

            {/* ─── Contents (below lg) ────────────────────────────── */}
            {/* The rail is desktop-only, so phones and small tablets get
                the shared disclosure instead of scrolling the whole
                ladder to find a rung. */}
            <div className="lg:hidden pb-8">
              <TocDisclosure items={TOC_ITEMS} ariaLabel="Page sections" />
            </div>

            {/* ─── The ladder ─────────────────────────────────────── */}
            {TIERS.map((tier) => (
              <Section
                key={tier.id}
                id={tier.id}
                style={sectionAnchorStyle}
                padding="md"
                bordered
              >
                <Stack gap="400">
                  <Stack gap="200">
                    <Kicker as="p" accent>
                      {tier.kicker}
                    </Kicker>
                    <Headline level={2}>{tier.title}</Headline>
                    <Body size="sm" style={{ color: "var(--text-caption)" }}>
                      {tier.terms}
                    </Body>
                  </Stack>

                  <Grid cols={tier.offers.length === 2 ? 2 : 3} gap="400">
                    {tier.offers.map((offer) => (
                      <OfferCard
                        key={offer.name}
                        offer={offer}
                        reserveBadge={tier.offers.some((o) => o.featured)}
                      />
                    ))}
                  </Grid>
                </Stack>
              </Section>
            ))}

            {/* ─── Past clients ───────────────────────────────────── */}
            {/* Below the ladder, never above it: proof is what a reader
                goes looking for once a price has caught their eye, and
                putting it first would cost the menu the fold. */}
            <Section
              id="past-clients"
              style={sectionAnchorStyle}
              padding="md"
              bordered
            >
              <Stack gap="400">
                <Stack gap="200">
                  <Headline level={2}>Past clients</Headline>
                  <Body size="sm" style={{ color: "var(--text-caption)" }}>
                    Selected engagements since 2022, across AI research,
                    music-industry SaaS, and arts nonprofits.
                  </Body>
                </Stack>
                <Grid cols={3} gap="400">
                  {CLIENTS.map((client) => (
                    <ClientCard key={client.name} client={client} />
                  ))}
                </Grid>
              </Stack>
            </Section>

            {/* ─── What clients say ───────────────────────────────── */}
            {/* Renders only when a quote is actually filled in — an
                empty testimonials list takes the whole section and its
                TOC entry with it rather than leaving a heading over
                nothing. */}
            {VISIBLE_TESTIMONIALS.length > 0 ? (
              <Section
                id="what-clients-say"
                style={sectionAnchorStyle}
                padding="md"
                bordered
              >
                <Stack gap="400">
                  <Headline level={2}>What clients say</Headline>
                  {/* A lone quote goes full-bleed at 1 column, which
                      runs the line past a comfortable measure on a wide
                      screen — so the single case is capped rather than
                      orphaned at half width. */}
                  <Grid
                    cols={VISIBLE_TESTIMONIALS.length === 1 ? 1 : 2}
                    gap="400"
                    className={
                      VISIBLE_TESTIMONIALS.length === 1
                        ? "max-w-[44rem]"
                        : undefined
                    }
                  >
                    {VISIBLE_TESTIMONIALS.map((testimonial) => (
                      <TestimonialCard
                        key={testimonial.name}
                        testimonial={testimonial}
                      />
                    ))}
                  </Grid>
                </Stack>
              </Section>
            ) : null}

            {/* ─── How engagements work ───────────────────────────── */}
            {/* A description list, not a table: these are term/definition
                pairs, and <dl> keeps that relationship for screen readers
                without inventing a grid that would have to be made
                responsive for no reader benefit. */}
            <Section
              id="how-engagements-work"
              style={sectionAnchorStyle}
              padding="md"
              bordered
            >
              <Stack gap="400">
                <Headline level={2}>How engagements work</Headline>
                <dl className="m-0 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
                  {ENGAGEMENT_TERMS.map((item) => (
                    <div key={item.term} className="flex flex-col gap-1">
                      <dt
                        className="text-[12px] uppercase tracking-[0.12em]"
                        style={{
                          fontFamily: "var(--font-mono)",
                          color: "var(--text-caption)",
                        }}
                      >
                        {item.term}
                      </dt>
                      <dd className="m-0">
                        <Body size="sm">{item.detail}</Body>
                      </dd>
                    </div>
                  ))}
                </dl>
              </Stack>
            </Section>

            {/* ─── Closing CTA ────────────────────────────────────── */}
            {/* bordered, like every other section break on the page —
                without it the close ran straight on from the terms and
                read as a sixth term rather than the next move. */}
            <Section
              id="start-a-conversation"
              style={sectionAnchorStyle}
              padding="lg"
              bordered
            >
              <Stack gap="400">
                <Headline level={2}>Start a conversation</Headline>
                <Body>
                  Tell me what you need and I will tell you whether
                  it is something I can help with. If it is not, I will
                  do my best to point you toward someone that can.
                </Body>
                <div className="flex flex-wrap gap-3">
                  <TrackOnClick
                    event={ANALYTICS_EVENTS.CALENDLY_CLICK}
                    eventData={{
                      kind: "outbound",
                      surface: "consulting-footer",
                    }}
                  >
                    <Button
                      as="a"
                      href={CONTACT.calendly}
                      variant="primary"
                      size="lg"
                    >
                      Book a discovery call
                    </Button>
                  </TrackOnClick>
                  <Button
                    as="a"
                    href="/contact"
                    variant="secondary"
                    size="lg"
                  >
                    Other ways to reach me
                  </Button>
                </div>
                <Body size="sm" style={{ color: "var(--text-caption)" }}>
                  {CONTACT.location} · available remote
                </Body>
              </Stack>
            </Section>
          </div>
        </div>
      </Container>
    </>
  );
}
