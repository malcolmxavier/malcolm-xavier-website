// ─────────────────────────────────────────────────────────────────
// /case-studies/architecture-under-contract — sequel to building-this-site.
//
// Uses the case-study primitives shared with building-this-site so
// the chrome, typography, and scroll behavior match the rest of the
// cluster.
//
// Story arc (7 beats):
//   01 · The Brief                  — what /films and /television had to be
//   02 · Three Core Sources, One Enrichment Source — the comparative spine
//   03 · One Rendering Contract     — snapshot-canonical, shared across feeds
//   04 · Three Refresh Models       — manual ritual / RSS cron / polite cron
//   05 · The Polite Client          — Serializd ethics, the User-Agent posture
//   06 · Automated Editorial        — BLOCKING categories, miniseries rule
//   07 · What's Live                — current numbers, what's next, lessons that travel
// ─────────────────────────────────────────────────────────────────

import { Link } from "@/components/primitives/Link";
import {
  TableOfContents,
  type TocItem,
} from "@/components/chrome/TableOfContents";
import { ScrollProgress } from "@/components/case-study/ScrollProgress";
import { CaseStudyHero } from "@/components/case-study/Hero";
import {
  Beat,
  BeatSeparator,
  Body,
  CASE_STUDY_WIDTH,
  CaseStudyKicker,
  ClaudeNote,
  Code,
  Emph,
  Pullquote,
} from "@/components/case-study/primitives";
import { formatLastUpdated } from "@/lib/case-studies/basecamp-coffee/last-updated";
// Snapshot meta readers — used by the end-of-study CTA grid so the
// counts shown next to each sub-brand link reflect the same fixture
// files the article just described. Server-only modules; safe here
// because this page is a server component.
import { getSnapshotMeta as getSpotifyMeta } from "@/lib/feeds/spotify";
import { getLetterboxdSnapshotMeta } from "@/lib/feeds/letterboxd";
import { getSerializdSnapshotMeta } from "@/lib/feeds/serializd";
// Click instrumentation for the end-of-article CTAs and the
// hero-lede cross-link back to building-this-site. Wraps each
// link in a client boundary that fires CASE_STUDY_CTA_CLICK on
// click — lets the dashboard answer "does this article actually
// pull clicks through to the sub-brand pages / sibling case study,
// or do readers bounce at the close?" Pairs with the matching
// reciprocal forward-link from building-this-site to here.
import { TrackOnClick } from "@/components/analytics/TrackOnClick";
import { ANALYTICS_EVENTS } from "@/lib/analytics";

const CASE_STUDY_SLUG = "architecture-under-contract";

const BUILDING_THIS_SITE_HREF = "/case-studies/building-this-site";

// TOC schema matches the chrome/TableOfContents primitive used by
// every other case study. First entry is the return-to-top action
// (anchors to the Hero, whose id defaults to "intro"); remaining
// entries mirror the seven-beat structure below. Labels stay short
// so the rail stays single-line at every breakpoint.
const TOC_ITEMS: TocItem[] = [
  { href: "#intro", label: "↑ Top" },
  { href: "#brief", prefix: "01", label: "The Brief" },
  { href: "#sources", prefix: "02", label: "Source Postures" },
  { href: "#contract", prefix: "03", label: "One Contract" },
  { href: "#refresh", prefix: "04", label: "Refresh Cadence" },
  { href: "#polite", prefix: "05", label: "Polite Client" },
  { href: "#automated-editorial", prefix: "06", label: "Automated Editorial" },
  { href: "#live", prefix: "07", label: "What's Live" },
];

export default function FeedTrilogyCaseStudy() {
  return (
    <>
      <ScrollProgress />

      {/* xl+ fixed-position TOC rail + dual-mode wrapper for lg.
          Same treatment as the building-this-site case study so the
          chrome reads consistently across the /case-studies cluster.
          xl keeps original behavior (fixed rail off the article
          column); lg-but-not-xl uses the grid wrapper with an
          in-flow sticky rail; <lg has neither rail. */}
      <aside className="hidden xl:block fixed top-32 left-4 w-[180px] 2xl:left-8 2xl:w-[220px] z-30">
        <TableOfContents items={TOC_ITEMS} ariaLabel="Article sections" />
      </aside>

      <div className="lg:grid lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-16 xl:block">
        <aside className="hidden lg:block xl:hidden">
          <div className="sticky top-24 pl-4">
            <TableOfContents items={TOC_ITEMS} ariaLabel="Article sections" />
          </div>
        </aside>
        <article>
          <Hero />
          <BeatSeparator />
          <CaseStudyTLDR />
          <BeatSeparator />
          <BeatBrief />
          <BeatSeparator />
          <BeatSources />
          <BeatSeparator />
          <BeatContract />
          <BeatSeparator />
          <BeatRefresh />
          <BeatSeparator />
          <BeatPolite />
          <BeatSeparator />
          <BeatAutomatedEditorial />
          <BeatSeparator />
          <BeatLive />
        </article>
      </div>
    </>
  );
}

// ─── Hero ────────────────────────────────────────────────────────
function Hero() {
  return (
    <CaseStudyHero
      title="Architecture under contract"
      subtitle="How three integrations stay online when their upstreams don't."
      readMin={10}
      updatedDate={formatLastUpdated()}
    >
      Three pages, three integrations that look nothing alike, one
      architectural rule that keeps all three online when an upstream breaks.
      The rule: the page never calls the upstream at request time. Every
      render reads from a snapshot file on disk; the snapshot is refreshed on
      a separate path, on a separate cadence, with its own failure mode. This
      is what makes <Code>/music</Code>,{" "}<Code>/films</Code>, and{" "}
      <Code>/television</Code>{" "}survive a rate-limit incident, a CSV
      no-show, and an unofficial endpoint going dark—without the page ever
      knowing which upstream is broken. Sequel to{" "}
      <TrackOnClick
        event={ANALYTICS_EVENTS.CASE_STUDY_CTA_CLICK}
        eventData={{
          surface: CASE_STUDY_SLUG,
          destination: "case-study:building-this-site",
        }}
      >
        <Link href={BUILDING_THIS_SITE_HREF}>building this site</Link>
      </TrackOnClick>
      . Same posture, harder upstreams.
    </CaseStudyHero>
  );
}

// ─── TL;DR — skim layer for LinkedIn-driven arrivals ─────────────
//
// Sits directly under the Hero, before the first BeatSeparator,
// so a reader who lands cold from a feed share gets the headline
// value in ~30 seconds: the architectural rule, the proof point
// (the 91%→0% Vercel-Cron-migration stat that previously lived in
// Beat 4 as a buried ClaudeNote), and the three lessons that used
// to live at the bottom of the article. Per the 2026-05-11
// /full-review (ft-no-tldr-for-skim-arrivals,
// ft-lessons-that-travel-is-the-hero, ft-no-quantified-outcomes,
// ft-beat4-claudenote-best-pm-signal-buried).
function CaseStudyTLDR() {
  return (
    <section
      className={`${CASE_STUDY_WIDTH} pt-4 pb-6 md:pt-6 md:pb-9`}
    >
      <div className="mb-3 md:mb-4">
        <CaseStudyKicker as="h2">If you&apos;re skimming</CaseStudyKicker>
      </div>
      <Body>
        <p>
          After migrating refresh crons from GitHub Actions (91% miss rate) to
          Vercel Cron (0%), zero render-path incidents since launch—because
          the page never calls the upstream at request time. Three completely
          different upstreams agreed to that contract.
        </p>
        <ul className="m-0 pl-5 list-disc marker:text-[var(--text-caption)] flex flex-col gap-2">
          <li>The render contract shouldn&apos;t know how the data got there.</li>
          <li>Editorial intent belongs upstream of the writer, not the reader.</li>
          <li>Unofficial integrations call for politeness, not workarounds.</li>
        </ul>
      </Body>
    </section>
  );
}

// ─── Beat 1 — The Brief ──────────────────────────────────────────
function BeatBrief() {
  return (
    <Beat
      id="brief"
      number="01"
      title="The Brief"
      headline="Three pages. Three upstreams that look nothing alike."
    >
      <Body>
        <p>
          Three pages—<Code>/music</Code>, <Code>/films</Code>,{" "}
          <Code>/television</Code>—needed data from three completely different
          upstreams, plus TMDB for metadata enrichment on two of them. The
          brief: ship them under one rendering pattern so a visitor lands on a
          page that doesn&apos;t know—and doesn&apos;t need to know—which
          upstream fed it. Spotify is the easy case structurally (real OAuth
          API). Letterboxd has no API. Serializd has a publicly-callable
          internal endpoint that no one promised to keep stable. TMDB is the
          easy supporting case (public API, API-key auth), but it only matters
          if the upstream it&apos;s enriching landed cleanly.
        </p>
        <p>
          <TrackOnClick
            event={ANALYTICS_EVENTS.CASE_STUDY_CTA_CLICK}
            eventData={{
              surface: CASE_STUDY_SLUG,
              destination: "case-study:building-this-site",
              placement: "beat-1-inline",
            }}
          >
            <Link href={BUILDING_THIS_SITE_HREF}>Building this site</Link>
          </TrackOnClick>{" "}
          covers Spotify; this study works the harder two.
        </p>
      </Body>
    </Beat>
  );
}

// ─── Beat 2 — Three Core Sources, One Enrichment Source ──────────────────────────────────────
function BeatSources() {
  return (
    <Beat
      id="sources"
      number="02"
      title="Three Core Sources, One Enrichment Source"
      claudeTag="comparative architecture"
      claudeTagLiteral
      headline="Architecture frames product UX."
    >
      <Body>
        <p>
          Three pages that look the same to a visitor sit on three
          architectures that look nothing alike. Likeness at the page level
          doesn&apos;t require likeness at the integration level—and forcing
          it would have meant compromising either the page or one of the
          upstreams.
        </p>
      </Body>

      <ComparisonTable />

      <Body>
        <p>
          <Emph>Spotify is the easy case structurally</Emph>. There&apos;s an
          API, the auth flow is documented, and the data shapes are generally stable.
          The hard part was operational—rate limits,
          deprecations—and is covered in the{" "}
          <TrackOnClick
            event={ANALYTICS_EVENTS.CASE_STUDY_CTA_CLICK}
            eventData={{
              surface: CASE_STUDY_SLUG,
              destination: "case-study:building-this-site",
              placement: "beat-2-inline",
            }}
          >
            <Link href={BUILDING_THIS_SITE_HREF}>previous case study</Link>
          </TrackOnClick>.
        </p>
        <p>
          <Emph>Letterboxd is the hard case</Emph>. No API
          at all. The site is read-friendly to humans and hostile to
          scrapers. But Letterboxd does publish two parseable surfaces: a
          CSV export a user can request by hand from account settings (ground
          truth, complete history, manual, ZIPped), and an RSS feed of
          recent activity (last ~50 entries, public, fast, machine-readable,
          but truncated to the recent window). This site's integration treats a CSV as the
          seed and the RSS as the delta. The CSV bootstraps the catalog; RSS keeps
          it warm. The two fix each other&apos;s blind spots.
        </p>
        <p>
          <Emph>Serializd is the awkward middle</Emph>. No documented API,
          but the site itself is a React app that talks to a public-by-design
          endpoint at <Code>serializd.onrender.com</Code>. Anyone with
          browser DevTools can see the URL. The integration uses it the same
          way the site&apos;s own frontend does, with a few extra
          courtesies. More on that a couple of sections below.
        </p>
        <p>
          <Emph>TMDB is the reference layer</Emph>. A stateless catalog API
          with an API-key auth model and rate limits generous enough to
          never matter at this scale. It supplies the metadata the other
          three sources don&apos;t return themselves—poster art, genre
          taxonomy, episode counts, and the show-type classification downstream
          editorial logic depends on. TMDB has no cron of its own; it rides
          whichever pipeline is enriching new items. The other three sources
          are about behavior; TMDB is about catalog.
        </p>
      </Body>
    </Beat>
  );
}

// ComparisonTable row data. Hoisted to module scope so it isn't
// re-allocated on every server-component render — the data is
// fully static and the ReadonlyArray intent is honored cleanly
// outside the function body.
const COMPARISON_ROWS: ReadonlyArray<{
  source: string;
  api: string;
  auth: string;
  path: string;
  cadence: string;
}> = [
  {
    source: "Spotify",
    api: "Yes",
    auth: "OAuth (Auth Code)",
    path: "Live HTTP",
    cadence: "Manual ritual",
  },
  {
    source: "Letterboxd",
    api: "No",
    auth: "None",
    path: "CSV export + RSS feed",
    cadence: "Hourly cron (RSS)",
  },
  {
    source: "Serializd",
    api: "No (internal)",
    auth: "None (anon)",
    path: "Polite paginate of internal endpoint",
    cadence: "Hourly cron (offset)",
  },
  {
    source: "TMDB",
    api: "Yes",
    auth: "API key",
    path: "Per-item enrichment during films + television refresh",
    cadence: "Inherited (no own cron)",
  },
];

// Custom comparison table — the shared MetricsTable primitive
// hard-codes "6mo ago / Now / Target" headers, which don't fit a
// non-metric comparison. Markup mirrors MetricsTable's layout
// (proper <table> with thead/th scope on tablet+, stacked cards on
// mobile) so the rendering is a11y-clean and visually consistent
// with the rest of the case-study chrome.
function ComparisonTable() {
  const monoHeader = { fontFamily: "var(--font-mono)" } as const;
  const headerCell =
    "text-left text-[10px] uppercase tracking-[0.22em] font-normal text-[var(--text-caption)] pb-3 pr-4";
  const bodyCell =
    "py-3 pr-4 text-[15px] leading-[1.45] align-top text-[var(--text-body)]";

  return (
    <div className="my-8 md:my-10">
      {/* Tablet + desktop */}
      <table className="hidden md:table w-full border-collapse">
        <thead>
          <tr className="border-b border-[var(--border-default)]">
            <th scope="col" className={`${headerCell} w-[16%]`} style={monoHeader}>
              Source
            </th>
            <th scope="col" className={`${headerCell} w-[14%]`} style={monoHeader}>
              Public API
            </th>
            <th scope="col" className={`${headerCell} w-[20%]`} style={monoHeader}>
              Auth
            </th>
            <th scope="col" className={`${headerCell} w-[32%]`} style={monoHeader}>
              Architecture
            </th>
            <th scope="col" className={`${headerCell} w-[18%]`} style={monoHeader}>
              Refresh cadence
            </th>
          </tr>
        </thead>
        <tbody>
          {COMPARISON_ROWS.map((row) => (
            <tr
              key={row.source}
              className="border-b border-[var(--border-default)] last:border-b-0"
            >
              <th
                scope="row"
                className="py-3 pr-4 text-left font-normal text-[15px] text-[var(--text-heading)] align-top"
              >
                {row.source}
              </th>
              <td className={bodyCell}>{row.api}</td>
              <td className={bodyCell}>{row.auth}</td>
              <td className={bodyCell}>{row.path}</td>
              <td className={bodyCell}>{row.cadence}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Mobile — stacked cards */}
      <div className="md:hidden flex flex-col gap-3">
        {COMPARISON_ROWS.map((row) => (
          <div
            key={row.source}
            className="px-4 py-3.5 rounded-[22px] border border-[var(--border-default)]"
          >
            <h3 className="m-0 mb-2 text-[15px] font-medium text-[var(--text-heading)]">
              {row.source}
            </h3>
            <dl className="m-0 grid grid-cols-2 gap-x-3 gap-y-2">
              {(
                [
                  ["Public API", row.api],
                  ["Auth", row.auth],
                  ["Path", row.path],
                  ["Cadence", row.cadence],
                ] as const
              ).map(([label, value]) => (
                <div key={label} className="flex flex-col gap-0.5">
                  <dt
                    className="m-0 text-[10px] uppercase tracking-[0.18em] text-[var(--text-caption)]"
                    style={monoHeader}
                  >
                    {label}
                  </dt>
                  <dd className="m-0 text-[14px] text-[var(--text-body)]">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Beat 3 — One Rendering Contract ─────────────────────────────
function BeatContract() {
  return (
    <Beat
      id="contract"
      number="03"
      title="One Rendering Contract"
      claudeTag="shared shape"
      claudeTagLiteral
      headline="Rendering convergence."
    >
      <Body>
        <p>
          Every Vercel environment runs with <Code>SPOTIFY_OFFLINE=1</Code>{" "}
          and equivalents for the other feeds. Pages render from{" "}
          <Code>lib/feeds/_fixtures/&lt;service&gt;-snapshot.json</Code>.
          Zero live API calls per render; deterministic latency. The
          rate-limit incident that almost broke <Code>/music</Code>{" "}
          couldn&apos;t break it again, because the page never talks to
          Spotify in production. The same property protects{" "}
          <Code>/films</Code> from Letterboxd outages and{" "}
          <Code>/television</Code> from a Serializd 5xx.
        </p>
        <p>
          Each snapshot envelope carries the same four things: a{" "}
          <Code>capturedAt</Code>{" "}ISO timestamp (used for &ldquo;data as
          of&rdquo; UI captions and freshness diagnostics), a{" "}
          <Code>summary</Code>{" "}block with the headline numbers pre-tallied so
          the page doesn&apos;t have to total them up on every visit, the
          full content list already in display order, and a lookup map so
          any <Code>/[slug]</Code> detail page can find its item instantly.
          Each reader implements the same three things: a schema-shape guard
          that fails loud at module load instead of cryptic-undefined deep
          in a render, a module-scoped cache that builds derived indices
          once and shares a lifetime with the snapshot itself, and a{" "}
          <Code>/api/&lt;service&gt;/health</Code>{" "}probe that answers
          &ldquo;would a refresh work right now?&rdquo; in one call.
        </p>
        <p>
          The shared-lifetime detail is worth flagging. The cache holds the
          snapshot, the slug map, and the chronological position map for
          prev/next neighbor nav as one object. The
          alternative—evict the snapshot but keep the slug map—is a
          class of bug that&apos;s easy to write, impossible to debug from
          the symptom, and trivially prevented by making them rise and fall
          together.
        </p>
        <p>
          The cost: every render is reading data that is, on average, half
          the cron interval old. For <Code>/music</Code>{" "}it could be days
          old. The pages are editorial, not realtime, so the freshness
          budget is generous. The trade-off is that there&apos;s no
          moment-of-truth retrieval; a play-history change at T+0
          doesn&apos;t appear at T+0. None of these surfaces need it.
        </p>
      </Body>
    </Beat>
  );
}

// ─── Beat 4 — Three Refresh Models ───────────────────────────────
function BeatRefresh() {
  return (
    <Beat
      id="refresh"
      number="04"
      title="Three Refresh Models"
      claudeTag="scheduling and posture"
      claudeTagLiteral
      headline="Refresh divergence."
    >
      <Body>
        <p>
          <Emph>Spotify is human-in-the-loop</Emph>.{" "}
          <Code>npm run music:refresh</Code> is a guarded ritual: kill any
          running dev, spawn <Code>dev:online</Code>, probe{" "}
          <Code>/api/spotify/health</Code> for rate-limit clearance on both{" "}
          <Code>/me</Code> and <Code>/me/playlists</Code> buckets, call{" "}
          <Code>/api/spotify/snapshot</Code>, diff old vs new, write the new
          fixture. No cron. The 21-hour penalty box from case study #1 was
          earned in dev, and Spotify&apos;s rate limiter is sticky and
          per-app—a cron firing during a dev iteration could chain into
          it. Manual gating means the only refreshes that happen are ones
          I&apos;m ready for.
        </p>
        <p>
          <Emph>Letterboxd is hourly, RSS-driven</Emph>.{" "}
          <Code>/api/cron/films-refresh</Code> runs at{" "}
          <Code>0 * * * *</Code>{" "}UTC. It fetches the RSS feed, parses the
          last ~50 entries, diffs against the snapshot, enriches any new
          films via TMDB&apos;s <Code>/movie/&#123;id&#125;</Code>{" "}
          endpoint, merges, re-aggregates, and commits the new snapshot
          back to the repo via the GitHub contents API. Vercel rebuilds on
          push. The CSV bootstrap path is separate: when a fresh export
          lands, <Code>parse-letterboxd-export.mjs</Code> reads the unzipped
          folder, joins <Code>diary.csv</Code> with{" "}
          <Code>reviews.csv</Code> on{" "}
          <Code>(Date, Letterboxd URI)</Code>, applies the prose-only scope
          filter (rating-only watches don&apos;t qualify a film for{" "}
          <Code>/films</Code>), and rebuilds the snapshot from scratch. RSS
          catches edits inside its ~50-entry window but goes blind on older
          edits and on deletions; the CSV bootstrap is the ground-truth
          corrective for both.
        </p>
        <p>
          <Emph>Serializd is hourly, paginated, with a thirty-minute offset</Emph>.{" "}
          <Code>/api/cron/television-refresh</Code> runs at{" "}
          <Code>30 * * * *</Code>{" "}UTC. The offset is a race-guard so the
          films and television crons don&apos;t push to <Code>main</Code>{" "}
          simultaneously and collide on the GitHub contents API SHA. The
          pipeline paginates{" "}
          <Code>/api/user/malxavi/diary?page=1..N</Code>{" "}with a 500ms gap
          between pages, groups reviews by show, enriches each unique show
          via TMDB&apos;s <Code>/tv/&#123;id&#125;</Code> endpoint, runs an
          editorial-cleaning pass (next section), aggregates the summary, and
          commits.
        </p>
      </Body>

      <ClaudeNote kicker="On building in public, at the commit level">
        <p className="m-0">
          Both routes commit via the GitHub contents API rather than writing
          to Vercel Blob. Blob would be faster (no rebuild) and quieter (no
          commit chatter). The integration uses commit-via-API anyway
          because the chatter is a feature during the building-in-public
          phase—every refresh produces a real commit on{" "}
          <Code>main</Code>, which keeps the public GitHub history visible.
          A different posture (mature product, no audience for the commit
          log) would pick Blob.
        </p>
      </ClaudeNote>
    </Beat>
  );
}

// ─── Beat 5 — The Polite Client ──────────────────────────────────
function BeatPolite() {
  return (
    <Beat
      id="polite"
      number="05"
      title="The Polite Client"
      claudeTag="ethics and posture"
      claudeTagLiteral
      headline="It's easier to ask forgiveness..."
    >
      <Body>
        <p>
          The Serializd integration calls an endpoint that no public
          documentation describes. The endpoint is the same one
          Serializd&apos;s own React frontend calls; it&apos;s discoverable
          in two minutes with browser DevTools. The integration includes
          three deliberate courtesies. First, an identifying{" "}
          <Code>User-Agent</Code>: not a browser-spoof, but{" "}
          <Code>
            &quot;malxavi.com /television cluster - read-only,
            snapshot-driven, hourly (https://malxavi.com)&quot;
          </Code>
          —a name, a scope, a cadence, and a contact path. Second, an{" "}
          <Code>X-Requested-With</Code>{" "}header that matches their own
          frontend&apos;s; the integration looks like the client their
          service expects to answer. Third, a 500ms gap between paginated
          requests, so a full bootstrap spreads ~28 requests over ~14
          seconds rather than hammering. The cron fires once an hour and
          almost always pulls a single incremental page anyway.
        </p>
        <p>
          This is closer in posture to scraping a public website than to
          consuming an API. The site isn&apos;t doing anything
          Serializd&apos;s own frontend doesn&apos;t do; it&apos;s doing it
          less often, more slowly, and identifying itself. There&apos;s no
          auth bypass—the endpoint is anonymous-by-design. There&apos;s
          no volume that would resemble an attack vector. There&apos;s no
          data resale, no aggregation product, no exposure of any user
          other than mine. If Serializd publishes a public API tomorrow,
          the integration switches to it tomorrow. If they ask the
          integration to stop, it stops. The disclosure path is real; the
          User-Agent is the address.
        </p>
      </Body>

      <Pullquote attribution="the polite-client rule">
        Identifying User-Agent, low volume, documented fallback. The
        default for any unofficial integration, not a special case.
      </Pullquote>
    </Beat>
  );
}

// ─── Beat 6 — Automated Editorial ─────────────────────────────────
function BeatAutomatedEditorial() {
  return (
    <Beat
      id="automated-editorial"
      number="06"
      title="Automated Editorial"
      claudeTag="quality as plumbing"
      claudeTagLiteral
      headline="Automating editorial intent."
    >
      <Body>
        <p>
          The Serializd bootstrap script runs an editorial-cleaning pass
          with seven categories—miniseries detection, show-vs-season
          ambiguity, in-progress vs completed shows, posterless entries,
          and a few others. Each is either INFORMATIONAL or BLOCKING. If
          any BLOCKING category has unresolved entries, the script exits
          non-zero and refuses to write the snapshot. The cron run fails
          noisily; the existing snapshot stays in production. The page
          never silently regresses to a misclassified state.
        </p>
        <p>
          The miniseries double-count rule is the touchstone example. A
          miniseries occupies one season but reads editorially as a
          complete show—so a show-level review on a miniseries also
          counts in season totals, and a season-level review on a
          miniseries also counts in show totals. The rule lives in{" "}
          <Code>lib/feeds/serializd-mode-counts.mjs</Code>; both the
          bootstrap script and the runtime page consume it. Skipping it
          produces counts that are technically right and editorially wrong.
        </p>
        <p>
          Most data pipelines treat editorial quality as a downstream
          review concern. Pulling it left into the writer means the
          snapshot file <Emph>is</Emph>{" "}the contract—if it&apos;s on
          disk, it&apos;s reviewable, and pipelines that don&apos;t enforce
          editorial intent eventually surface that gap to the user.
        </p>
      </Body>
    </Beat>
  );
}

// ─── Beat 7 — What's Live ────────────────────────────────────────
function BeatLive() {
  return (
    <Beat
      id="live"
      number="07"
      title="What's Live"
      headline="What shipped and what's next."
    >
      <Body>
        <p>As of writing:</p>
        {/* Counts are hand-keyed on purpose — this is the "as of
            writing" snapshot referenced by the article's prose. The
            ExploreCTAGrid below the article reads the same counts
            LIVE from each snapshot meta API at request time, so any
            future refresh updates that grid automatically while this
            list intentionally stays frozen at publish. Re-sync these
            three numbers (+ the capture date) only on a deliberate
            article-prose revision — typically alongside an updated
            "Snapshot captured" date. */}
        <ul className="m-0 pl-5 list-disc marker:text-[var(--text-caption)] flex flex-col gap-2">
          <li>
            <Emph><Code>/music</Code></Emph>—39 owned public Spotify
            playlists, OAuth-fetched at refresh time, snapshot-cached,
            manually refreshed. Snapshot captured 2026-05-12.
          </li>
          <li>
            <Emph><Code>/films</Code></Emph>—745 reviewed films, 104 in
            2026 so far, sourced from a Letterboxd CSV export and topped up
            hourly via RSS, all enriched through TMDB. Snapshot captured
            2026-05-12.
          </li>
          <li>
            <Emph><Code>/television</Code></Emph>—153 shows across 37
            show-level, 230 season-level, and 489 episode-level reviews,
            sourced from Serializd&apos;s internal API under a polite-client
            posture and enriched through TMDB. Snapshot captured 2026-05-12.
          </li>
        </ul>
        <p>
          All three pages render from disk. None of them call an upstream
          during a request. The next public API change in any of the three
          sources will move the refresh script, not the page.
        </p>
        <p>
          <Emph>What&apos;s next</Emph>. Build the cleanup gate even
          earlier on any future integration of this shape; building it
          after the parser meant a round of avoidable manual classification.
          Smooth the Letterboxd CSV re-seed into a{" "}
          <Code>films:reseed</Code> script that takes a path arg. With six
          months of clean Spotify health data, reconsider moving{" "}
          <Code>/music</Code> to a daily cron with a pre-flight rate-limit
          probe. And document the snapshot envelope shapes in a README so
          each fixture file doubles as a tiny public dataset.
        </p>
      </Body>

      <Pullquote attribution="the lesson that travels">
        The render contract should not know how the data got there.
      </Pullquote>

      <Body>
        <p>
          Three takeaways that survive any specific upstream. First, the
          render contract should not know how the data got there.{" "}
          <Code>/music</Code>, <Code>/films</Code>, <Code>/television</Code>{" "}
          all read from a snapshot file with a guarded shape. The
          ingestion pipeline can change underneath without touching the
          page. Three completely different upstreams, one rendering model,
          no special cases at the page level.
        </p>
        <p>
          Second, editorial intent belongs upstream of the writer, not the
          reader. The miniseries double-count rule is a one-line editorial
          decision and a thirty-line bug if it lives in the page instead of
          the snapshot. Pipelines that treat editorial quality as a
          downstream concern eventually ship the gap.
        </p>
        <p>
          Third, the polite client is a posture, not a workaround.
          Identifying User-Agent, low volume, documented
          fallback. That&apos;s the default for any unofficial integration,
          not a special case.
        </p>
      </Body>

      <ExploreCTAGrid />
    </Beat>
  );
}

// ─── End-of-study CTA ────────────────────────────────────────────
//
// Three-card explore grid, one per sub-brand destination. Each card
// wears the destination's `data-subbrand` attribute so the typography
// and accent color flip to match the sub-brand the visitor is about
// to enter. Counts are pulled live from each feed's snapshot meta API
// at request time, so the numbers stay in sync with the same fixture
// files the article cited.
//
// The article-narrative ties the three cards together: each card's
// blurb names the integration shape that beat made the case for
// (OAuth / CSV+RSS / polite client), so a reader who skimmed the
// case study still gets the through-line on the way out.
//
// Server-side data fetch happens inline (no async barrier) because
// every meta call is synchronous JSON read. If any snapshot is
// missing, the read APIs throw with a clear rebuild instruction,
// which is the correct fail-loud behavior the case study itself
// argues for.
function ExploreCTAGrid() {
  // Read the three snapshot metas behind a try/catch so a missing
  // fixture file degrades to a graceful "see the sub-brand pages"
  // fallback instead of throwing through the render tree and 500'ing
  // the entire article. The article itself argues for fail-loud at
  // the snapshot WRITE path (the refresh script's BLOCKING-category
  // gate); the render path should always succeed. If any meta reader
  // throws (snapshot missing, malformed, schema mismatch), we still
  // ship three working links to the destinations — readers don't see
  // counts, but they do see the article and a working CTA grid.
  let music, films, tv;
  try {
    music = getSpotifyMeta();
    films = getLetterboxdSnapshotMeta();
    tv = getSerializdSnapshotMeta();
  } catch (err) {
    console.error("ExploreCTAGrid: snapshot meta read failed", err);
    return (
      <div className="my-10 md:my-12">
        <CaseStudyKicker as="h2" className="mb-3">
          See it in action
        </CaseStudyKicker>
        <p className="m-0 mb-6 text-[17px] md:text-[19px] leading-[1.55] text-[var(--text-body)]">
          The three sub-brand pages live at{" "}
          <Link href="/music">/music</Link>,{" "}
          <Link href="/films">/films</Link>, and{" "}
          <Link href="/television">/television</Link>.
        </p>
      </div>
    );
  }

  return (
    <div className="my-10 md:my-12">
      <CaseStudyKicker as="h2" className="mb-3">
        What the pages produced
      </CaseStudyKicker>
      <p className="m-0 mb-6 text-[17px] md:text-[19px] leading-[1.55] text-[var(--text-body)]">
        Three integrations, three pages, rendering from the
        same snapshots this article described. Click into each to see
        what they produced.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <TrackOnClick
          event={ANALYTICS_EVENTS.CASE_STUDY_CTA_CLICK}
          eventData={{ surface: CASE_STUDY_SLUG, destination: "music" }}
        >
          <ExploreCard
            subbrand="music"
            href="/music"
            stat={music.playlistCount}
            unit="playlists"
            title="Music"
            description="Every public playlist I've shipped, newest first."
            cta="Find your next listen"
          />
        </TrackOnClick>
        <TrackOnClick
          event={ANALYTICS_EVENTS.CASE_STUDY_CTA_CLICK}
          eventData={{ surface: CASE_STUDY_SLUG, destination: "films" }}
        >
          <ExploreCard
            subbrand="film"
            href="/films"
            stat={films.filmCount}
            unit="films"
            title="Films"
            description="Years of film-watching, distilled into reviews and ratings."
            cta="Find your next watch"
          />
        </TrackOnClick>
        <TrackOnClick
          event={ANALYTICS_EVENTS.CASE_STUDY_CTA_CLICK}
          eventData={{ surface: CASE_STUDY_SLUG, destination: "television" }}
        >
          <ExploreCard
            subbrand="tv"
            href="/television"
            stat={tv.showCount}
            unit="shows"
            title="Television"
            description="Show, season, and episode reviews. Whatever the show earns."
            cta="Find your next binge"
          />
        </TrackOnClick>
      </div>
    </div>
  );
}

// Card-as-link surface. `data-subbrand` flips --font-primary,
// --font-secondary, and the --primary-* ramp inside the card's
// scope, so each card's title renders in its destination's display
// font and the hover/focus accent reads in the destination's color.
//
// `--primary-default` is referenced directly rather than via the
// `--text-action` alias—the alias chain doesn't resolve cleanly
// inside `[data-subbrand]` scopes (a known bug surfaced earlier on
// the site). Direct token reference dodges it.
//
// Whole-card link with `no-underline`: the card's border + arrow +
// hover treatment carries the affordance. Body-content links are
// underlined sitewide; card-as-link surfaces are the explicit
// exception to that rule.
//
// Bare <a> instead of the @/components/primitives/Link primitive —
// deliberate divergence. Link's `quiet` variant adds
// hover/focus-visible underline + sets inline color: var(--text-action)
// on the anchor, both of which conflict with the card-as-link
// pattern: we never want an underline on a whole-card link, and we
// need the [data-subbrand] color cascade (not --text-action) to own
// the text color so the destination accent reads through. Until the
// Link primitive grows a "card" variant, the bare anchor stays.
// Trade-off: loses NextLink hover-prefetch on these three CTAs.
function ExploreCard({
  subbrand,
  href,
  stat,
  unit,
  title,
  description,
  cta,
}: {
  subbrand: "music" | "film" | "tv";
  href: string;
  stat: number;
  unit: string;
  title: string;
  description: string;
  cta: string;
}) {
  return (
    <a
      data-subbrand={subbrand}
      href={href}
      className="group flex flex-col gap-3 p-5 rounded-[22px] border border-[var(--border-default)] no-underline transition-colors hover:border-[var(--primary-default)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary-default)]"
    >
      <p
        className="m-0 text-[10px] uppercase tracking-[0.22em] text-[var(--text-caption)]"
        style={{ fontFamily: "var(--font-mono)" }}
      >
        {stat.toLocaleString()} {unit}
      </p>
      <h3
        className="m-0 text-[28px] md:text-[32px] leading-[1.1] tracking-[-0.02em] text-[var(--text-heading)]"
        style={{ fontFamily: "var(--font-primary)" }}
      >
        {title}
      </h3>
      <p className="m-0 text-[14px] leading-[1.5] text-[var(--text-caption)]">
        {description}
      </p>
      {/* No inline color — the per-subbrand AA-safe color from
          components.css (`a[data-subbrand="music"]` etc. → --purple-700
          light / --purple-300 dark, equivalents for film + tv) cascades
          down from the <a> ancestor. --primary-default (500-step) was
          here previously and failed WCAG 1.4.3 on three of three cards:
          music + tv in dark mode, film in light mode. Per the 2026-05-11
          /full-review (ft-explore-text-contrast-fail). */}
      <p
        className="m-0 mt-auto pt-1 text-[14px] font-medium transition-transform group-hover:translate-x-0.5"
      >
        {cta} <span aria-hidden="true">→</span>
      </p>
    </a>
  );
}
