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

## The button bug (or, what AI pair-programming actually looks like)

The other instructive incident on this build was small but more
revealing about the human-in-the-loop dynamic than anything else
in the project.

The hero CTA on the landing page was supposed to be a filled black
pill in light mode and a filled white pill in dark mode — the
recruiter's eye anchor. It rendered as an outlined transparent pill
in both modes. The text labels were correct, the click targets
worked, the layout was fine. Just no fill.

What followed was a four-round debugging session. The agent kept
generating plausible-sounding hypotheses about CSS specificity,
layer ordering, and shorthand-vs-longhand parsing quirks. Each round
produced a different syntactic fix for what was effectively the same
code path — switching from inline styles to Tailwind utility classes
to unlayered CSS with `!important` and the elaborate
`[data-variant="primary"]` selector. None of it worked.

The actual bug was that the CSS variable `var(--text-heading)` was
silently resolving to nothing at the button element specifically,
despite cascading correctly to body, paragraphs, and other elements
on the same page. When `var()` fails to resolve, the browser doesn't
error — the property silently falls back to its initial value
(`transparent` for `background-color`). The dev tools Styles panel
showed the rule as applied with no override; the Computed tab would
have shown `background-color: rgba(0, 0, 0, 0)`. Same variable
resolved fine for `border-color`, but `border-color`'s fallback
(`currentColor`) coincidentally produced the same visual result as
the variable would have, so the breakage was invisible there. One
property failed loudly, one failed quietly, and the difference
masked the diagnosis for three rounds.

The fix that worked: replace `var(--text-heading)` with hardcoded
hex (`#000` / `#fff`) and use `[data-theme="dark"]` descendant
selectors for theme awareness. Bypass the variable cascade entirely.

The PM lesson buried in this story is the more useful artifact than
the technical one. Pair-debugging with an AI agent looks deceptively
like pair-debugging with a person, but the failure mode is different.
A human collaborator who's been wrong twice will usually abandon
their hypothesis class and try something fundamentally different.
The agent will keep generating refined variations of the same
hypothesis as long as you let it. The PM job — and specifically the
PM skill — is to recognize when an iterative loop is producing
diminishing returns and force a fundamentally different test. In
this case the right move was: "stop changing the syntax, replace
the value with `red`, tell me if the button is red." Binary outcome,
30-second test. The agent eventually arrived at this diagnostic on
its own, but four rounds late. Catching the agent in that loop is
the work I'd be paying a PM to do anyway.

There's a quieter lesson too about brittle defaults: critical UI
primitives shouldn't depend on indirection that can fail silently.
A button is too important to break invisibly. The new rule on this
codebase: theme-aware components use direct color values via theme
selectors, not variables. Variables are still fine for sub-brand
flips and one-off tokens, but the buck stops at the visual baseline.

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
