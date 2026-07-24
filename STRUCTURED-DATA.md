# Structured data (JSON-LD)—entity-graph conventions

How this site models itself for search engines and answer engines (AEO). The
pattern is deliberate and load-bearing: it is what lets a retriever (Google's
Knowledge Graph, Perplexity, ChatGPT search, Gemini, AI Overviews) resolve
"who is Malcolm Xavier" and "what is this page" without guessing. When adding a
new primary page, or extending the graph for a second brand (Fourth Unit),
follow this—do not improvise a one-off schema block.

## The two tiers

Structured data lives at two tiers, and they connect by `@id`, not by nesting.

**Tier 1—the sitewide graph** (`app/layout.tsx`, `STRUCTURED_DATA`). One
`<script type="application/ld+json">` in `<head>` on *every* page, holding a
`@graph` array with two top-level sibling entities:

- `WebSite`—`@id` `${SITE_URL}/#website`, carrying `publisher: { "@id": "…/#person" }`.
- `Person`—`@id` `${SITE_URL}/#person`, the canonical Malcolm entity, with
  `sameAs` (LinkedIn, GitHub, Letterboxd, Serializd, Spotify), `knowsAbout`,
  `jobTitle`, and `alumniOf`.

These two `@id`s are the anchors the whole graph hangs off. `SITE_URL` and
`SITE_NAME` come from `lib/site-config.ts`—the single source for the `@id`
base.

**Tier 2—per-page nodes.** Each primary recruiter page emits its *own*
separate `<script type="application/ld+json">` block from its page component—**not** wrapped in the sitewide `@graph`. Current nodes:

| Route | Node type | `@id` |
|---|---|---|
| `/resume` | `ProfilePage` | `…/resume/#profilepage` |
| `/about` | `AboutPage` | `…/about/#aboutpage` |
| `/case-studies` | `CollectionPage` | `…/#…` |
| `/contact` | `ContactPage` | `…/contact/#contactpage` |
| `/case-studies/<slug>` | `Article` + `BreadcrumbList` | per-article |

So `/resume` ships **two** ld+json blocks in total: the sitewide `@graph`
(WebSite + Person) plus ProfilePage. The two schools are *not* standalone
nodes—they are anonymous, `@id`-less `EducationalOrganization` objects nested
inside `Person.alumniOf` in the sitewide graph (`app/layout.tsx`), so they ride
on *every* page, not just `/resume`.

## The connectivity rule

Every primary page-type node must connect back to both anchors:

```ts
isPartOf:   { "@id": `${SITE_URL}/#website` },   // → the site
mainEntity: { "@id": `${SITE_URL}/#person` },    // → the canonical Person
```

Every node links to the site through `isPartOf → #website`. The link to the
*person* varies by type: most (`ProfilePage`, `AboutPage`, `ContactPage`) use
`mainEntity → #person`; `CollectionPage` uses `about → #person` (a collection is
*about* the person, it does not have them as its single main entity); and
`Article` (the case studies) uses `author → #person` and `publisher → #person`—more
idiomatic than forcing `mainEntity` onto an article—while still carrying
`isPartOf → #website`. A node missing *both* the site link and any person link
is an orphan—it validates, but tells a retriever nothing about how the page
relates to the person or the site, which is the entire point of the graph.
(An `Article` with `author`/`publisher` but no `isPartOf` was a *half*-orphan,
connected to the person but not the site—fixed 2026-07-24.)

## Why separate blocks still form one graph

A conformant JSON-LD parser (Google, and the schema.org validator) merges *all*
`<script type="application/ld+json">` blocks on a page into a single graph
**before** resolving `@id` references. So a cross-block link—`ProfilePage`
in one block pointing `isPartOf` at `#website` declared in a different block—resolves fine. "Separate `<script>` tags" ≠ "disconnected."

This is also why the **validator tree looks split**: validator.schema.org draws
each block's root object as its own top-level tree item, so `ProfilePage` /
`AboutPage` / `ContactPage` appear "at the top" while `WebSite` and `Person`
sit "inside the graph." That is correct and expected—they are different
`<script>` blocks; the `@id` links join them.

## Which validator to use

Route by whether the type is a **rich-result type** (renders an enhanced SERP
result) or schema that is valid but not rich-result-eligible:

- **Google Rich Results Test**—`Article` and `BreadcrumbList` only (the case
  studies). These are the only types that produce a rich result, so they are
  the only ones this tool reports on.
- **validator.schema.org**—everything else: `ProfilePage`, `AboutPage`,
  `ContactPage`, `CollectionPage`, `WebSite`, `Person`. Valid, retriever-useful
  schema that is *not* a rich-result type. Rich Results Test will show these as
  "no rich results detected," which is not an error—use the schema.org
  validator to confirm zero errors/warnings and that `@id`s resolve.

Practical consequence: a change that touches only the non-rich-result nodes
(the `isPartOf`/`mainEntity` graph plumbing) needs **no** Rich Results re-review—validate at validator.schema.org.

## Adding a new primary page

1. Import `SITE_URL` from `@/lib/site-config`.
2. Define a `const <PAGE>_SCHEMA` with `@context`, the right `@type`, a stable
   `@id` (`${SITE_URL}/<path>/#<type-lowercased>`), `url`, `name`, plus the
   connectivity: `isPartOf → #website` always, plus the person link for the
   type (`mainEntity` for most, `about` for a collection, `author`/`publisher`
   for an `Article`).
3. Wrap the page return in a fragment and emit
   `<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(<PAGE>_SCHEMA) }} />`
   before the `<Container>`.
4. Confirm the route stays `○ Static` in the build output (additive JSON-LD
   does not drag a route dynamic).
5. Validate the deployed page at validator.schema.org: the new node appears as
   its own tree item and resolves `isPartOf → #website` and `mainEntity → #person`.

## Fourth Unit / multi-brand forward-note

When the brand split lands, the `@id` base stops being the single `SITE_URL`
const and becomes brand-derived (see the brand-resolver in the split plan). At
that point:

- Each brand gets its own `WebSite` + `Person`/`Organization` anchor pair under
  its own host (`…/#website`, `…/#person` resolve per brand because `SITE_URL`
  is brand-aware).
- Per-page nodes inherit the brand-correct `@id` base automatically—the
  connectivity rule above is unchanged; only the host in the `@id` differs.
- Keep the two-tier structure and the connectivity rule identical across brands
  so the pattern stays mechanical rather than re-derived per surface.
