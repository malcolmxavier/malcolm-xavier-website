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

This is the rule that most of the existing drift violated. `Body`, `Lede`, and
`HeroNote` each clamped *themselves* at 60ch, which produced two failures:

- **It cannot be composed.** Two `<Body>` blocks side by side in a two-column
  layout each clamp independently and neither fills its column.
- **It makes a page ragged from the inside.** On a case study, every `<Body>`
  clamped at 60ch while pull quotes and figures beside it ran the full column
  width, and `CASE_STUDY_WIDTH` was `"w-full"`—a no-op. Nothing on the page
  defined a column, so the prose read as a stack of arbitrarily narrow blocks
  in a wide box rather than as a column with things set beside it.

The evidence that a self-clamping type component is the wrong shape is that
three separate surfaces had to fight it: `/booth` overrode the cap with
`--booth-row-measure`, `/resume` inlined `70ch` four times, and `/films/[slug]`
inlined `65ch`. Each of those is someone working around a decision the
component should not have been making.

---

## 3. The values

| State | Token | Value | Applies to |
| --- | --- | --- | --- |
| Reading column | `--measure-read` | `60ch` | Essay, case study, and research prose |
| Header block | `--measure-header` | `90ch` | Eyebrow / headline / deck groups |
| Page geometry | `--container-page` | `104rem` | Grids, tables, cards, data |

**`--measure-header` is provisional.** It is the one number here set by
reasoning rather than by looking: wide enough that a deck stops reading as
indented under its headline, narrow enough that two sentences do not run to
150 characters at 1664px. It wants a look on screen at 1280 / 1440 / 1664
before it counts as settled.

### Why `ch` and not `rem`

`ch` is font-relative—one `ch` is the width of the font's `0` glyph—so a
`ch` clamp holds the *character count* roughly constant when the font changes.
This site swaps typefaces between the recruiter-facing pages and the sub-brand
pages, and a `rem` clamp would silently change the line length across that
boundary while a `ch` clamp does not. **New measures are written in `ch`.**

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
than read start to finish, so a wider line is defensible; the footer's `30ch`
is a deliberately narrow column, not a reading measure at all.

An exception is fine. **A silent exception is not.** To add one:

1. Define it as a token in `tokens/`, next to the three above.
2. Name what kind of text it is for and why the canonical value is wrong for
   it—in the token file, not only at the use site.
3. Never write a bare `maxWidth: "NNch"` at a call site. That is how the site
   accumulated eleven values nobody could reconcile.

---

## 5. Current state

Converted as of 2026-09-28: *(update this list as the conversion lands)*

- [ ] Tokens defined and emitted
- [ ] `Body`, `Lede`, `HeroNote` stop clamping themselves
- [ ] Case studies get a real reading column (`CASE_STUDY_WIDTH` is currently
      a no-op and is still described in `ArticleContainer.tsx` as a deleted
      560→1024px ladder)
- [ ] Header blocks on `/essays`, `/music`, and the other prose indexes take
      the header measure
- [ ] Inline literals on `/resume`, `/films/[slug]`, `/television/[showSlug]`,
      `/contact`, `/stats/connected`, `/booth` reconciled or tokenized as
      named exceptions

**Two long-form routes still disagree about more than the number.**
`ArticleContainer` (essays) centres on the viewport at `40rem` and sits
*outside* `Container`; `ProjectContainer` (research) left-aligns at
`46rem → 54rem` *inside* `Container`, and argues in its own comments that
centring is wrong. Their left edges land in different places on a wide screen.
That is a separate decision from measure and is not settled here.
