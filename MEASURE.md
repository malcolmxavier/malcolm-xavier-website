# Measure—how wide text is allowed to get

**Measure** is the width of a line of text, counted in characters rather than
pixels. This document is the single source for how it is set on this site.

It exists because there wasn't one. Before 2026-09-28 the rule lived only in
code comments in three files, and they disagreed: `scripts/build-tokens.mjs`
said "60ch, mostly", `components/writing/ArticleContainer.tsx` said "around a
65-character line", and `app/films/[slug]/page.tsx` said "≈60–75ch is
standard". Eleven distinct literal widths were scattered across the codebase—
`60ch`, `65ch`, `70ch`, `52ch`, `80ch`, `30ch`, `40rem`, `46rem`, `54rem`,
`32rem`, `720px`—each written at its use site, none derived from anything.
Only the well (`--container-page`, 104rem) was tokenized, and the well
constrains no text at all.

---

## 1. Three states, and picking the right one is the whole rule

Text on this site is in exactly one of three states. Almost every width bug
here has been a block in the wrong one.

### Reading column—takes the reading measure

Continuous prose read line after line, start to finish: an essay body, a case
study's beats, a research write-up. Past roughly 90 characters the eye starts
losing its place on the carriage return, which is what the measure prevents.

### Header block—takes the header measure

The eyebrow / headline / deck group at the top of a page. This is **not** a
reading column. It is two or three sentences at large type, taken in as a unit
with the headline above it, and it is read once. Clamping it to a reading
measure buys no legibility and costs the alignment—the headline runs to its
own natural width while the deck stops a third of the way across, and the
header reads as ragged rather than as a block.

**If a deck is too wide to read comfortably, the deck is too long.** Fix the
copy, not the width.

### Page geometry—takes the well

Card grids, tables, data, figures, navigation, anything scanned rather than
read. No measure. These fill `Container` and that is correct.

---

## 2. Measure belongs to the column, never to the paragraph

**A container sets the measure once; its children fill it.**

This is the rule most of the existing drift violated. `components/typography/`
gives `Body`, `Lede`, and `HeroNote` a 60ch cap *on themselves*, which cannot
be composed: two `<Body>` blocks side by side in a two-column layout each clamp
independently and neither fills its column.

The evidence that a self-clamping type component is the wrong shape is that
three separate surfaces had to fight it: `/booth` overrode the cap with
`--booth-row-measure`, `/resume` inlined `70ch` four times, and `/films/[slug]`
inlined `65ch`. Each of those is someone working around a decision the
component should not have been making.

### Two components are named `Body`, and that trap has already been sprung

**`components/typography/Body.tsx` self-clamps at 60ch. The `Body` exported
from `components/case-study/primitives.tsx` is a different component and, until
2026-09-28, set no width at all.** The six case studies import the second one.

The first draft of this document asserted the opposite—that case-study prose
was clamped at 60ch while pull quotes ran wide, making the page ragged from the
inside. **That was wrong, and it was wrong in the more damaging direction.**
Case-study prose was running the full grid column: about 1024px at a 1440px
viewport and 1248px at 1664px, which is well past a hundred characters on a
line. The narrow things on the page were the pull quotes, pinned to a
hardcoded `max-w-[720px]`.

The error came from reading a `<Body>` call site and assuming which import it
resolved to, twice, without grepping. **When a width looks wrong on a page,
resolve the import before reasoning about the value.**

---

## 3. The values

| State | Token | Value | Applies to |
| --- | --- | --- | --- |
| Reading column | `--measure-read` | `60ch` | Essay, case study, and research prose |
| Header block | `--measure-header` | `90ch` | Eyebrow / headline / deck groups |
| Page geometry | `--container-page` | `104rem` | Grids, tables, cards, data |
| *(exception)* | `--measure-panel` | `52ch` | A dashboard panel's lede—see §4 |
| *(exception)* | `--measure-scan` | `70ch` | Text that is scanned, not read—`/resume` |
| Essay column | `--column-essay` | `46rem` | The whole `/essays` article—rem, not ch; see §3 |

`--measure-header` was set by reasoning rather than by looking: wide enough
that a deck stops reading as indented under its headline, narrow enough that
two sentences do not run to 150 characters at 1664px. **Malcolm reviewed it on
`/essays` at his own window width on 2026-09-28 and it held**, so it is no
longer provisional at that size. It has still not been checked at the extremes
of 1280 and 1664.

### Why `ch` and not `rem`

`ch` is font-relative—one `ch` is the width of the font's `0` glyph—so a
`ch` clamp holds the *character count* roughly constant when the font changes.
This site swaps typefaces between the recruiter-facing pages and the sub-brand
pages, and a `rem` clamp would silently change the line length across that
boundary while a `ch` clamp does not. **New measures are written in `ch`.**

**`--column-essay` is the one exception, and it is not a measure.** It caps a
whole column holding a 52px title, 19px body copy, and 16px notes at once, and
"sixty characters" has three different answers inside that, because `ch`
resolves against each element's own font size. A column width is page geometry
for the things stacked in it; the measure *inside* it is still `ch`. So the test
is what the value is clamping: **one block of text takes `ch`, a column of mixed
sizes takes `rem`.**

### Why 60ch when the literature says 65–75 characters

It isn't a contradiction, and this is why the three old comments all looked
right to whoever wrote them. `ch` is the width of the `0` glyph, and in a
proportional font the average character is narrower than that—so `60ch`
renders roughly **68–72 actual characters**. The old 60ch, 65ch, and "60–75ch"
notes were all describing about the same rendered line; they were just
measuring it three different ways.

---

## 4. Adding an exception

Some surfaces genuinely want a different measure. `/resume` is scanned rather
than read start to finish; the footer's `30ch` is a deliberately narrow column,
not a reading measure at all.

**An exception is earned with a measurement, not an argument.** `--measure-scan`
is the worked example. The case for it sounds like taste—a resume is skimmed, so
a wider line is fine—and the number that settles it is the corpus: across the 41
bullets `/resume` renders, the median is 87 characters and the mean 98. At
`70ch` (roughly 78–84 rendered characters) 13 fit on one line; at the reading
measure, 4 do. Converging would push **nine bullets onto a second line** on the
most recruiter-facing page on the site. That is the kind of fact that should be
in the token's own comment, because it is what stops the next person re-opening
the decision on the general principle.

An exception is fine. **A silent exception is not.** To add one:

1. Define it as a token in `scripts/build-tokens.mjs`, next to the three
   above. That is where the measures and `--container-page` are emitted—**not**
   in `tokens/`, which holds the colour and type JSON. `app/globals.css` is
   generated, so never hand-edit it; run `npm run tokens:build`, and clear
   `.next` afterwards or the old value survives in the dev cache.
2. Name what kind of text it is for and why the canonical value is wrong for
   it—in the token file, not only at the use site.
3. Never write a bare `maxWidth: "NNch"` at a call site. That is how the site
   accumulated eleven values nobody could reconcile.

---

## 5. Current state

Converted as of 2026-09-28: *(update this list as the conversion lands)*

- [x] Tokens defined and emitted (batch A)
- [x] Header blocks take the header measure. `Lede` carries it, so roughly
      twenty pages got the fix at once—a lede *is* a deck by definition, so
      this belonged on the component rather than per page. `/music` separately
      needed `wide`, matching `/films` and `/television`, which it should have
      had all along.
- [x] Case studies get a real reading column (batch B). `.cs-column` states
      the measure, `.cs-read` takes it, `.cs-breakout` opts out. The section
      itself is deliberately *not* clamped, so grids and tables inside a Beat
      keep their room. **This visibly narrowed prose on all six studies**—
      see the correction in §2 for why that was a bigger change than expected.
- [x] The inline literals that were *already* a canonical value, swapped with
      no change on screen: `/contact`'s caption and `/booth`'s
      `--booth-row-measure` default were both hand-written `60ch`, which is
      `--measure-read` spelled out. And `52ch` was reasoned out separately in
      `app/stats/connected` and `components/stats/StatsHandoffPanel`, with the
      why recorded in only one of the two—now `--measure-panel`, a named
      exception under §4.
- [ ] `Body`, `Lede`, and `HeroNote` in `components/typography/` stop clamping
      themselves. **Not mechanical**—pulling the self-clamp out sends every
      consumer to the full well until a container sets a measure, across
      roughly twenty pages.
- [ ] The remaining literals are **value decisions, not conversions**, and each
      one changes what is on screen if it moves:
      `CriticDisclaimer` writes `80ch` and the footer `30ch`, neither of which
      is a reading measure at all.
- [x] `ClaudeNote` takes **no** measure, decided by looking (Malcolm,
      2026-09-28). It was clamped to `cs-read` and reversed the same day: a
      note is not prose to be read at the body measure, and narrowing it made
      it read as a second competing column rather than as commentary running
      alongside one. The arithmetic pointed the other way—the default
      variant renders at 15/16px, so unclamped it carries more characters per
      line than the body text above it—and his read of the rendered page is
      what settles it. **Do not re-raise this on the character count.**
- [ ] `Body`, `Lede`, and `HeroNote` in `components/typography/` stop clamping
      themselves. **Not mechanical**—pulling the self-clamp out sends every
      consumer to the full well until a container sets a measure, across
      roughly twenty pages.
- [ ] The remaining literals are **value decisions, not conversions**, and each
      one changes what is on screen if it moves:
      `CriticDisclaimer` writes `80ch` and the footer `30ch`, neither of which
      is a reading measure at all.
- [x] `ClaudeNote` joins the reading column, both variants (Malcolm's call,
      2026-09-28). Unclamped these were the worst lines on the site: the
      default variant renders at 15/16px, *smaller* than the body text, and
      small type in a wide column means more characters per line rather than
      fewer—roughly 150 at 1664px, directly beside a paragraph stopping at
      sixty. `cs-read` goes on the wrapper rather than the inner text div, so
      the left rule and the kicker come with it instead of a label stretching
      across the full column above a narrow paragraph. It lands slightly
      narrower than the prose, which is correct: an aside set inside the text
      column reads as subordinate to it, the same reason `Pullquote` sits just
      inside the prose edge.
- [x] `/resume` keeps its width and loses its literal (Malcolm's call,
      2026-09-28). It was `70ch` at four sites, which I filed as "four
      undocumented copies of one number… a habit"—wrong on the second half:
      it is two things applied twice, a context line and a bullet line, once
      for work and once for education. Consistent, just undocumented. The
      value is right and now `--measure-scan`, with the bullet-length
      measurement in the token's comment. See §4.
- [x] `/films/[slug]` and `/television/[showSlug]` converged on
      `--measure-read` (Malcolm's call, 2026-09-28). Those three sites wrote a
      literal `65ch` with a note that ≈60-75ch is the typographic sweet spot.
      Both halves of that were right; what was missing was that a film review
      is a reading column like any other, and the site was carrying two
      reading measures with nothing written down as a reason for the
      difference. Five characters narrower. `ch` is why the sub-brand typeface
      on those pages is not a reason to differ—the character count holds
      across the swap.

**Open, and it is a visual judgment rather than a rule question:** does
`ClaudeNote` join the reading column? It is a callout, so §1 arguably licenses
it staying wide, but it is also continuous prose, and right now it can sit at
full column width directly above a `Body` that stops at the measure. There is a
mechanical wrinkle behind the aesthetic one: `ch` resolves against the
element's own font size, so `.cs-read` on the wrapper (inheriting 16px) lands
*narrower* than the 19px prose beside it, while putting it on the inner text
div matches exactly and leaves the `callout` variant's card wide around
clamped text.

**The two long-form routes differ on alignment, and that is now a decision
rather than an accident** (2026-09-28). `ArticleContainer` (essays) is centred;
`ProjectContainer` (research) aligns left on the rail and argues in its own
comments that centring is wrong. That argument holds where a page has other
edges to line up with—research carries figures and a datafolio. An essay is
one column and nothing else, so it has none, and Malcolm's read of the rendered
page is that centred is right there. A pass tried left-aligning it for
consistency and he reversed it the same day. **Do not re-raise it on the
consistency argument.** Both now sit *inside* `Container`, so they share the
site's gutters; what differs is only `mx-auto`.
