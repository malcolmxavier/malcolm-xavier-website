---
slug: building-this-site
title: "Building this site, one rate-limit at a time"
summary: "A meta case study on shipping a personal portfolio with Claude Code as a senior PM. AI-native build process, real production incidents, and what got cut."
status: draft
audience: recruiters
last_updated: 2026-04-25
---

# Building this site, one rate-limit at a time

> **Status:** Draft. Voice is approximately Malcolm's — expect a redline pass. Voice flags inline.

## TL;DR

A recruiter-facing personal site, built end-to-end in seven days while
actively interviewing, almost entirely through pair-programming with
Claude Code (the CLI agent, running on Opus 4.7). The build hit two
instructive incidents — Spotify's API quietly deprecated half its
endpoint surface in November 2024 and then locked the app in a
21-hour penalty box for a single careless burst, and a CSS variable
silently failed to resolve at exactly one element on the page,
costing four rounds of plausible-but-wrong debugging before someone
ran the binary test that ended it. Both stories have a PM lesson
underneath the technical one. What follows is the case study version,
not the changelog.

---

## The brief

I was looking for a senior PM role in media and streaming, and I
needed a portfolio surface that did three things at once:

1. **Get a recruiter to my resume in under thirty seconds.** Tech PM
   roles are a scanning game; the resume is the primary artifact and
   nothing should compete with it for attention above the fold.
2. **Show that I can ship product, not just talk about it.** A live,
   well-built site signals more than a deck.
3. **Communicate that I'm an artist who happened to become a PM** —
   theater background, hospitality at USHG, MS in Law focused on
   privacy/IP — without putting that in front of the recruiter
   before they've decided I can do the job.

The constraint was time: a working MVP by end of month, while also
interviewing several days a week. I gave myself seven calendar days
and a hard cutline at Day 4 ("shippable MVP"); Days 5–7 were stretch.

The non-constraint, importantly, was scope: I have ~12 pages worth of
ideas (newsletter, film, TV, music, books, games, podcast, plus the
recruiter and personal pages), and I deliberately scoped MVP down to
five — Landing, Resume, About, Contact, Music — with everything else
gated behind a "no public placeholders" rule.

## How it got built: AI-native, PM-led

I built this with [Claude Code](https://claude.com/claude-code), the
CLI agent. Most of the code is the agent's; most of the decisions are
mine. The interesting part — and the part recruiters keep asking
about — is what that division of labor actually looks like in
practice.

**Where I drove:**

- **Information architecture and brand voice.** What appears on
  landing, in what order, with what weight. The agent never proposed
  a hero structure unprompted; I sketched it (status kicker → name →
  positioning lede → primary CTA) and it built it.
- **Decision-quality reviews.** Several times the agent picked a
  technical fork I'd have picked differently — concurrent vs.
  throttled API fetches; column counts on the music grid; which
  copy was placeholder vs. real. My job was catching those before
  they shipped.
- **Editorial taste.** The agent's first-draft prose is competent
  but generic. Anything published-facing got a redline pass. (You
  may be reading first-draft prose right now. Forgive any clangs.)
- **Constraint discipline.** "No placeholder pages" is a rule the
  agent honors but wouldn't have invented. Same with "platform
  links never show handles" and "the Creative CV stays quietly in
  About, not elevated next to Resume." These are PM judgment calls
  about audience and brand.

**Where the agent drove:**

- **Implementation.** All the React, the Tailwind, the typography
  primitives, the layout system, the Spotify client, the Calendly
  embed, the token-pipeline build script.
- **Defensive engineering once instructed.** Throttling, retries,
  graceful degradation — once we'd hit the rate-limit incident
  (more on this below), the agent built the safety net cleanly.
- **Documentation.** Inline comments dense enough that a
  non-technical reader could navigate the code. Spec docs in
  `/_design/`. This case study, in its first draft.

**The pattern that worked:** plan in conversation, build in code.
Most sessions started with me writing or referencing the plan
(`PLAN.md`), the agent and I aligning on what to build, then the
agent shipping a working iteration in 15–45 minutes. I'd review,
redirect, and redline. The total wall time was a fraction of what
solo-coding would have taken; the cognitive load was almost entirely
on direction and judgment, which is the part of the work I'm hired
to do anyway.

> *Voice flag: this section is the part recruiters will ask about
> in interviews. Keep it in the case study but consider also
> publishing a standalone version on LinkedIn.*

## Architecture decisions worth flagging

A few choices that distinguish this from a generic Next.js portfolio:

**One codebase, many sub-brands, zero JavaScript flips.** Each
"sub-brand" (Music, eventually Film, TV, Books, etc.) gets its own
primary color and display font. The mechanism is data-attribute-scoped
CSS variables: `<div data-subbrand="music">` flips
`--font-primary`, `--font-secondary`, and the entire `--primary-*`
color ramp via cascade. SSR-rendered, no flash, no JS. The Card
primitive can carry a sub-brand accent independently of its surrounding
page, which keeps the landing matrix tiles flashing their destination
colors while staying in the recruiter cluster's typography.

**Tokens-as-source-of-truth, in code.** The design system started as
a Figma file with Tokens Studio. Three days in, I deprecated the
Figma file and made the JSON token files in
`/_design/tokens/` the canonical source. A small parser
(`scripts/build-tokens.mjs`) walks the multi-tier files (Brand →
Alias → Mapped → Responsive), resolves cross-file references, and
emits CSS custom properties grouped by tier into `globals.css`. Edits
happen in code, hot-reload picks them up, no round-trip through
Figma. The lesson: when "design system" means "spreadsheet of values,"
the spreadsheet should live where the values are read.

**No public placeholders, ever.** Routes don't ship until they're
real. Nav only shows live pages. The landing matrix renders only
tiles for sub-brand pages that actually exist. There are no "coming
soon" pages, no skeleton routes, no nav entries pointing at
unbuilt work. The discipline keeps the site small, the chrome
honest, and the surface area genuinely shippable on any given day.

**Recruiter-first, exploration-second, creative-CV-quiet.** The
landing page elevates exactly one CTA — "See my resume →." Below
that, a conditional sub-brand matrix lets cultural-curious visitors
explore. The Creative CV (the artist-side artifact) lives quietly
inline in the About teaser, not elevated alongside Resume. Three
audiences served, each with the surface area they actually need,
without diluting the primary call to action.

## The Spotify story (or, how I lost a day to a 429)

The `/music` page was supposed to be the easiest of the sub-brand
pages. The brief was straightforward: pull the public playlists from
my Spotify account, render them in a grid with cover art, name,
description, song count, total duration, and a four-track preview
on each card. Click into a detail page for the full track list.

This took roughly three times longer than estimated, and the reasons
are worth knowing.

**Plot point one: half the API I planned to use no longer exists for
new apps.** Spotify quietly deprecated a swath of Web API endpoints
in November 2024 — including, critically, the `/v1/users/{id}/playlists`
endpoint that historically mapped 1:1 to "the public playlists on this
user's profile." For apps registered after that cutoff, the endpoint
returns 403 regardless of authentication method. The Client
Credentials flow I'd planned was insufficient; we had to switch to
Authorization Code with refresh-token persistence (one-time
in-browser consent, then server-side token refresh from there on).
Cost: roughly an hour of investigation and refactoring, plus an
unplanned `/api/spotify/callback` route to capture the refresh
token during dev.

**Plot point two: the API itself reshuffled.** Endpoints renamed
(`/tracks` → `/items`), response shapes changed (`tracks: { items, total }`
became a flattened `items` reference object), field names changed
(`item.track` became `item.item` because Spotify unified tracks +
podcast episodes under one model). Each of these surfaced as a
runtime error during dev, requiring a debug-and-patch loop. The
documentation hasn't fully caught up. Cost: another hour of empirical
shape-discovery via logged API responses.

**Plot point three: the rate-limit incident.** The fetch logic, in a
moment of "this works for now" optimism, used `Promise.all` to fetch
track lists for all 57 of my public playlists in parallel. Spotify
allows roughly 180 requests per minute per app under normal
conditions, with bursts forgiven once. Multiple back-to-back bursts
during dev iterations triggered the rate limiter, then triggered an
escalated cool-down period, and at one point Spotify's `Retry-After`
header was returning **77,368 seconds — about 21 hours**. Cost: half
a day of velocity, and a real lesson.

**The fix and the lesson.** The cure was straightforward — concurrency
limiter (3 in-flight max) plus retry-on-429 honoring `Retry-After`
plus a graceful fallback page when Spotify is unreachable. The
lesson was about defensive engineering: rate limits are a property of
production systems, and "I'll add throttling later" is a sentence
that buys you a 21-hour penalty box. Should have throttled from the
first request.

There's also a quieter PM lesson in here: the original ROI estimate
on the Music page assumed the API would behave the way the docs
described. That assumption broke twice (deprecation, reshape) and
the rate-limit incident was the third hit. Multi-day vendor incidents
on a one-week MVP are exactly the kind of thing that should slip
into the buffer, not push out the cutline. The "Day 4 = MVP done"
hard line held; Music slid one day and the rest of the week
absorbed it. Buffer days exist for exactly this.

## Button mashing

Pair-programming with an agent looks deceptively like pair-programming
with a person — until the agent has been wrong twice. A human
collaborator who's been wrong twice will usually abandon the
hypothesis class and try something fundamentally different. The
agent generates refined variations of the same hypothesis as long
as you let it. This build earned three of those loops, each with
a bigger blast radius than the last.

### Movement 1 — the button bug

The first one was small. The hero CTA on landing was supposed to
be a filled black pill in light mode and a filled white pill in
dark mode. It rendered as an outlined transparent pill in both.
Click targets correct, layout fine, just no fill. Four rounds of
debugging followed. The agent generated plausible hypotheses
about CSS specificity, layer ordering, and shorthand-vs-longhand
parsing — each round produced a different syntactic fix for what
was effectively the same code path. None of it worked.

The actual bug: `var(--text-heading)` was silently resolving to
nothing at the button element, despite cascading correctly to
body, paragraphs, and other elements on the same page. When
`var()` fails to resolve, the browser doesn't error — the property
silently falls back to its initial value (`transparent` for
`background-color`). The Styles panel showed the rule applied
with no override; the Computed tab would have shown
`background-color: rgba(0, 0, 0, 0)`. One property failed loudly,
one failed quietly, and the difference masked the diagnosis for
three rounds.

> *Stop changing the syntax. Replace the value with red. Tell me
> if the button is red.*
>
> — the diagnostic that ended it

Binary outcome, 30-second test. The fix that worked: replace
`var(--text-heading)` with hardcoded hex (`#000` / `#fff`) and use
`[data-theme="dark"]` descendant selectors for theme awareness.
Bypass the variable cascade entirely.

### Movement 2 — the progress-bar saga (the recursion)

A week later, building chrome on `/case-studies/basecamp-coffee` —
a 1px scroll-progress bar anchored to the bottom of the Nav.
Conceptually a 50-line CSS change. Took **15 commits and an
evening**. Eventually traced: `--surface-page` resolves to *empty*
on recruiter-cluster pages because `--neutral-white` and
`--neutral-black` are only defined inside `[data-subbrand]` blocks,
not at the recruiter cluster's root. Every
`color-mix(... var(--surface-page))` was silently invalidating.
The page still *looked* right because Chrome's canvas defaults
paint the page bg. Same class of bug as the button. Same silent
fallback masking the diagnosis.

Here's the part worth sitting with: I had a written memory note
from the button bug describing exactly this pattern. **The memory
existed. It wasn't operationalized.** The 15-commit saga happened
anyway. Written documentation of a lesson is not the same as
operational discipline around it. Writing the postmortem feels
like resolution. Carrying it into the next session *is* the
resolution. Almost every product org I've worked in conflates
the two — and an AI-native system will pick up the same
conflation if you're not careful.

> *Memory ≠ discipline.*
>
> — the more interesting PM artifact

### Movement 3 — doubling down

The third loop earned a different magnification. Mid-audit, the
local dev server stopped compiling pages. Boot was instant.
Static assets served fine. Every dynamic-route request stalled
forever on `Compiling /` — no progress, no error, no exception in
the log. Production rendered cleanly. Local-only. A `sample`
profile showed the Node main thread parked in `kevent`, Tailwind
oxide rayon workers idle, zero CPU, zero outbound network. Read
like an ABI deadlock between Node 25 (non-LTS) and a Rust-backed
native module in the compile pipeline. Specific. Coherent. Rhymed
with prior knowledge. Wrong.

On the strength of that diagnosis: brew-install Node 24 LTS,
`brew link --force --overwrite` the global default, `npm rebuild`
to relink native binaries against ABI 137. A real change to global
state on the user's machine. Restarted dev. Still hung, identically.
Bootstrapped a bare-metal Next.js 16 app in `/tmp/next-min-test/` —
ten lines of code, ninety seconds to set up. Compiled `/` in three
seconds on the same Node 24. **Project-specific, not Node-specific.**
The actual fix:
`rm -rf node_modules package-lock.json && npm install`. Two minutes.

The button bug was four rounds of syntactic refinement. The
progress-bar saga was fifteen commits of selector tweaks. Both
were the same failure mode at different magnification — iterating
in code. This was a different magnification entirely: **executing
a real-world action against a wrong hypothesis.** Installing
software, swapping the default Node, modifying global state on
the user's machine. Mildly disruptive to roll back. Easy to skip
the falsification step because the narrative was so coherent —
the clues fit a perfectly ordered detective novel that just
wasn't the actual one. The agent constructs internally-consistent
narratives faster than it falsifies them.

### Three rules

Three loops, three rules. They now load on every Claude session
because they live in `~/.claude/` memory — not because I've
reread the postmortem. The difference, again, is the difference
between memory and discipline.

- **Force the binary test.** When the agent's been wrong twice
  on the same code path, stop refining its syntax and force a
  fundamentally different test. Replace the value with red.
  Toggle the rule off. The 30-second binary outcome ends loops
  that another round of refinement won't.
- **Write the rule, not the note.** Postmortems documented in
  markdown rot the moment the next session starts. Project-level
  rules in `AGENTS.md` and operator-level rules in `~/.claude/`
  load on every turn — that's the surface that drives behavior.
  Two failed fixes means the diagnosis is wrong; root-cause it
  before iterating again.
- **Cheap test before destructive commit.** Any agent-proposed
  fix that touches global state — installing software, swapping
  the default runtime, editing dotfiles — gets gated on the
  cheapest test that would falsify the diagnosis. For
  infra-flavored bugs, that's almost always "bootstrap a minimal
  repro and see if it reproduces."

Senior PM craft includes naming the pattern when it costs you,
not just when it doesn't. The recursion is the more honest case
study than any single incident — and it's the part that travels.

What got committed off the back of all three: `engines.node`
pinned to `">=22 <26"` in `package.json` so a future Node major
bump trips a clear warning before it corrupts local state, plus
a `.nvmrc` pinned to `24` so anyone with `nvm` or `fnm`
auto-switches into a supported version on `cd`. Two lines of
guardrail. Retroactive but durable.

## Two resumes, one source of truth (almost)

The /resume page on this site is built for recruiters: scannable,
web-native, links to live work, theme-aware, and lives inside the
same design system as everything else. It's not, however, what gets
emailed to a hiring manager or uploaded to a Workday portal. That
artifact has to survive ATS extraction, which means: single column,
no tables, no fancy typography, and ideally tailored to the specific
job posting before submission.

So I built two resumes from the same content:

- **The web resume** at `/resume`, rendered in the site's editorial
  typography (Instrument Serif + DM Sans) with company links in their
  actual brand colors, an inline TOC for desktop, and a case-study
  card grid.
- **A `.docx` template** at
  `/resume/malcolm-xavier-resume-template.docx`, generated from a
  Node script (`scripts/build-resume-docx.mjs`, using the `docx`
  package). The intended workflow: upload to Google Drive → open as
  Google Doc → File → Make a copy → tailor for the application →
  Download → PDF.

The dual-output isn't shared source of truth (yet). The web copy lives
in `app/resume/resume-data.tsx` (it's `.tsx` because some bullets
embed inline JSX links). The `.docx` script hardcodes its own copy.
They're parallel, not piped — when content changes, both get edited.
The pragmatic case is real: the script runs in Node, the data file
uses JSX, bridging them means a TS compiler step plus a React-element
walker for an artifact regenerated maybe once a month. Accepted dual
source of truth here, with a comment at the top of each file pointing
at the other.

The two artifacts also intentionally diverge. The web version shows
more (Trinity College stays, Independent Consulting keeps three
sub-bullets) because there's no one-page constraint and the audience
is browsing. The `.docx` template is tighter (Trinity dropped,
Independent Consulting collapses to a one-line context with inline
links) because the audience is scanning a printed page. Same person,
two reading contexts, two editorial decisions.

A few PM-craft details worth flagging for anyone building something
similar:

- **`keepNext: true` on every paragraph in an entry except the last.**
  Prevents Word from breaking a single role across pages, which is
  the rule any recruiter would tell you about a resume but no
  template enforces by default.
- **`titlePage: true` to suppress the page header on page 1.** Page 1
  carries the full hero (name, headline, contact, summary) in the
  body. Pages 2+ get a minimal header so a printed-and-stapled resume
  still identifies itself if the pages get separated. ATS extractors
  that skip headers don't lose anything — every contact field is also
  in the page-1 body.
- **Hyperlinks preserved through the .docx → Google Docs → PDF
  pipeline.** Every company name, every contact item, every
  case-study title carries a real `href`. ATS that strip formatting
  still get the URL as text; humans clicking through the PDF in Gmail
  get a working link.
- **Friendly link labels** ("LinkedIn · GitHub · Personal Website")
  instead of bare URLs in the contact strip. Easier to scan, less
  visual noise, the underlying hyperlink still resolves.

And a small detail almost no one would notice: the company URLs use
whatever hostname each company actually canonicalizes to. People
Inc., Muck Rack, GitHub, and Calendly canonicalize to apex (no
`www.`); LinkedIn, User Interviews, Fullstack Academy, Fractured
Atlas, Artist Growth, and NEFA canonicalize to `www.`. Matching each
site's canonical avoids a 301 redirect hop when the link is clicked
and quietly signals "this person knows what canonicalization is."
That's approximately zero recruiter value and a non-zero number of
senior engineers will notice. Brand-craft is mostly the details
no one's supposed to consciously notice.

> *Voice flag: this section is mostly product-craft — a counterweight
> to the incident vignettes above. The www. callout in particular is
> a "delight a small subset of readers" detail that costs nothing to
> leave in. Trim if the case study runs long.*

## What got cut, and why

PM judgment is mostly about what *not* to ship. A short list:

- **shadcn/ui** — wrong vibe. The site's design language is editorial-
  retro (late-'90s magazine × Beyoncé.com), not the clean SaaS
  shadcn aesthetic.
- **Headless CMS** — overkill at one author. MDX in repo with `zod`
  frontmatter validation is enough.
- **Contentlayer** — unmaintained.
- **GSAP** — overkill for the small motion footprint. `motion` is
  enough, guarded by `prefers-reduced-motion`.
- **Newsletter / Games / Books / Podcast routes** — no content for
  them yet. They appear in nav and on landing the day they ship,
  not before.
- **Long-form case study narratives** — gated behind recruiter
  feedback. If cards-only feels thin, write narratives. If cards
  are enough, save the time.
- **Apple Music as a primary integration** — the Web Playback Kit
  requires a paid Apple Developer account ($99/yr) for a feature
  most visitors won't use. Apple Music links live in a small
  manual-mapping config; if I have an AM counterpart for a
  Spotify playlist, the link surfaces; otherwise it doesn't.

## What I'd do differently

- **Start with rate-limiting on every third-party integration.** Not
  "later." Day one.
- **Build a local fixture cache for dev.** Caching API responses to
  disk during dev would have prevented the rate-limit cascade
  entirely and made iteration faster. Adding it in Day 4 polish.
- **Pre-render the music detail pages at build time** with
  `generateStaticParams`. Currently lazy-rendered on first visit;
  pre-rendering all 57 makes every detail page instant. ~30s of
  build time once per deploy, in exchange for a much better first
  impression on those pages.
- **Cap the music grid above the fold.** 57 playlist cards is a lot
  to scroll. A "top 24, then load more" pattern keeps the initial
  payload light without losing browsability.
- **For critical UI primitives, hardcode the visual baseline.**
  Theme-aware components (Button, Card, etc.) shouldn't depend on
  `var()` references that can fail silently in unexpected scopes.
  Hex literals via `[data-theme="dark"]` descendant selectors are
  more brittle to read but more bulletproof to render. Variables
  stay fine for sub-brand flips and one-off tokens; the buck just
  stops at the visual baseline of the design system's foundation
  primitives.
- **Don't mix `position: fixed` and `position: sticky` on the same
  scroll surface.** They have different overscroll physics —
  sticky elements un-stick and ride down with the document during
  rubber-band, fixed elements stay anchored — and mixing them
  opens visible gaps. Pick one positioning model per
  scroll-anchored element family.
- **Validate visual fixes against the deployed render before
  declaring done.** Computed-style or screenshot, not "the code
  looks right." A "shipped, refresh and test" without
  self-verification is a wasted round-trip on a deploy budget
  that's finite per session.
- **Treat written postmortems as documentation, not as
  discipline.** I had a memory note from the button bug that
  would have collapsed the progress-bar saga to a single commit.
  I didn't reach for it. The takeaway isn't "write better
  postmortems"; it's that documentation and operational
  discipline are different artifacts and product teams need to
  invest in both. (PM-craft equivalent: a beautifully-written
  PRD doesn't run the experiment.)
- **When changing Node major versions, full reinstall &mdash; not
  just `npm rebuild`.** `npm rebuild` relinks native modules
  against the active Node ABI but doesn't fix subtler
  package-state mismatches in linked dependencies that crossed
  the version boundary. The right reflex is
  `rm -rf node_modules package-lock.json && npm install` against
  the new Node. Pinning the supported range via `engines` in
  `package.json` plus a `.nvmrc` makes the switch durable across
  collaborators and CI.
- **Gate high-cost agent-proposed actions on cheap-binary tests
  first.** Anything touching global state &mdash; installing
  software, swapping default Node, editing `~/.zshrc` &mdash; is a
  high-cost action. The gate is "the cheapest test that would
  falsify the diagnosis." For infra-flavored bugs, that's almost
  always "bootstrap a minimal repro and see if it reproduces."
  AI agents will keep generating internally-consistent
  hypotheses; the PM job is to demand the binary test before the
  destructive commit.

## What's live

As of writing:

- **Landing**, **Resume**, **About**, **Contact**, **Music** —
  the five MVP pages, all responsive, light/dark theme aware via
  `next-themes`, and instrumented for accessibility (semantic HTML,
  visible focus states, skip-to-content link, `prefers-reduced-motion`
  honored sitewide).
- **57 public Spotify playlists** rendering on `/music`, sorted by
  most-recent track `added_at` as a proxy for last-edited (Spotify
  doesn't expose a real `modified_at`), with a manual-pin override
  for cases where the proxy is wrong.
- **Calendly inline widget** on `/contact` for the recruiter
  booking flow.
- **Resume PDF** auto-generated filename + LinkedIn / GitHub
  outlinks; case-study card linking to a standalone Vercel
  project that'll be absorbed into this codebase post-MVP.

The site is hosted on Vercel via a custom domain. The full source
is on GitHub. This case study itself is a meta artifact —
documentation of the build, hosted on the build it documents.

---

> *End-of-document voice flag: target word count for a published
> case study is around 1,500–2,500 words; this one's currently in
> the upper half of that range. Trim or expand whichever sections
> recruiters react to most when this gets shared.*
