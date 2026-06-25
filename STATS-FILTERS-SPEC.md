# Stats-page filters — build spec

Status: design locked, pre-build. Supersedes the throwaway prototype at
`_private/_sketches/filter-prototype.html` (which exists only to settle
look-and-feel, not as a reference implementation).

Scope: `/films/stats`, `/television/stats`, `/stats/connected`. All three
ship together; connected is **not** deferred.

---

## 1. What a filter is here

A stats-page filter **recomputes the statistics themselves over a subset
of the corpus** — it is not navigation into reviews. Selecting
`genre = Horror, NOT country = US` re-runs every tile's compute against
the films that satisfy that predicate, then re-renders the dashboard. The
per-tile deep-links (row → filtered reviews) **compose the active predicate
with the row subject** — clicking the Horror bar while `NOT US` is active
lands on "Horror, excluding US," so the reviews count matches the number
the tile just showed (see §11). The filter layer sits above the deep-links;
it does not replace them.

This is a richer query model than the reviews page. The reviews filter
*rails* stay **include-only** binary chips (`aria-pressed`); the stats
filters are a **boolean expression** — and exclusion propagates *into*
reviews on click-through without converting those rails (see §11):

- **AND across dimensions** — `genre AND country AND decade`.
- **OR within a dimension** — `genre ∈ {Horror, Thriller}`.
- **NOT / exclusion per value** — `NOT country = US`.

Every dimension the dashboard reports on is filterable (locked: launch
with all of them).

---

## 2. The query model and the tri-state control

Each selectable value has three states:

| State | Meaning | Predicate contribution |
|---|---|---|
| neutral | not part of the query | ignored |
| include | value must be present | `OR` within its dimension |
| exclude | value must be absent | `AND NOT` |

Include and exclude within the **same** dimension are legal and compose as
`(a OR b) AND NOT c`. An all-exclude dimension (`NOT US, NOT UK`) is just
the complement.

The reviews page cannot express this with its binary chip, so the stats
page needs its own affordance. The prototype carries two candidates;
**pick one before build** (this is the open look-and-feel decision):

- **Style A — cycling chip.** One control per value, click cycles
  neutral → include → exclude → neutral. Exclude renders struck-through
  with a leading `−`. Compact, but the third state is a discoverability
  risk.
- **Style B — body toggles, dedicated remove.** Click the chip *body* to
  flip include ⇄ exclude (one large target for the common act); a separate
  `×` removes the value. No `+/−` control — the body is the toggle. The `×`
  is a circular "cutout" badge floated over the pill's **top-right corner**
  (a removable-tag idiom that keeps the body a clean toggle target); the
  body carries trailing padding so the bubble never covers the label.

**LOCKED:** **Style A** for the bounded chip rails (density matters in a
rail), **Style B** for the high-cardinality summary chips (§4) — exclusion
there is rarer, so the whole-pill toggle handles include ⇄ exclude and the
corner-bubble `×` keeps removal deliberate and separate. The reviews rails
are **not** touched (§11), so this tri-state affordance is stats-only and
carries no funnel cost. Built as `components/filters/SummaryFilterChip.tsx`
(rails) + `TriStateChip.tsx` (Style A); see the dev-only preview at
`/stats/filter-preview`.

---

## 3. Cardinality — the controlling design axis

This is the constraint that the prototype glossed (it flattened everything
to chip rails). The real UI splits every dimension by cardinality, exactly
as the reviews shell already does:

- **Bounded** (a closed or slow-growing value set) → **tri-state chip
  rail** via `FilterRow`. Primary dimensions sit at the top; the long tail
  goes behind a `FacetAccordion` "More filters" disclosure (mobile drawer
  collapses it; desktop sidebar renders it inline — same `collapsible`
  prop split the reviews shell uses).
- **High-cardinality** (hundreds–thousands of distinct values: people,
  studios, networks, collections) → **no rail**. Selected by name through
  the `SearchOmnibox` typeahead (backed by `lib/feeds/entity-typeahead.ts`),
  never enumerated.

### The high-cardinality exclusion wrinkle

The reviews omnibox is include-by-selection only. Our query model wants
NOT on these dimensions too, and a typeahead has no persistent surface to
hang a tri-state on. Resolution:

> A selected high-cardinality value lands as a chip in the active-filter
> summary: the **pill body toggles include ⇄ exclude**, and a
> **corner-bubble `×` removes** it. The summary becomes the home for
> excluded entities; the rails own the bounded dimensions.

Built as `components/filters/SummaryFilterChip.tsx` — a **sibling** of the
reviews `DismissableChip`, not an extension of it: `DismissableChip` is the
binary single-button chip the reviews "Active filters" rail uses and must
stay untouched (§11, locked decision #6). `SummaryFilterChip` shares
`chipBaseStyle` so the two read as one system. This makes the sticky
summary do double duty: live readout **and** the editing surface for
high-cardinality values.

---

## 4. The active-filter summary (sticky)

One sticky bar, always present once any filter is active:

- **Live n** — the recomputed corpus size for the current predicate
  (e.g. "47 films"). This is the single most important affordance: it
  tells the user when they're about to thin the page into collapse before
  they commit.
- **Plain-language readback** — `Horror or Comedy · not US — 47 films`.
- **High-cardinality chips** — dismissable, tri-state (per §3).
- **Clear all.**

The bar is the only place excluded entities live, so it must stay legible
when it holds a mix of bounded-summary chips and high-cardinality chips.

---

## 5. Dimension → tile catalog

"Affected tiles" = tiles whose compute changes when the dimension is
filtered. **Self-reference**: a tile whose primary axis *is* the filtered
dimension goes degenerate (one bar / one row) and collapses to a readout
(§6). All other tiles simply recompute over the narrowed subset.

### 5a. Films (`FilmFilters`, `lib/feeds/stats/film-stats.ts`)

| Dimension | Card. | Control | Self-ref tiles (→ readout) |
|---|---|---|---|
| `ratings` | bounded (10) | rail | Rating distribution |
| `genres` | bounded (~20) | rail | Genres; Genres vs. baseline |
| `decades` / release year | bounded | rail | Release type by year; Budget tier by year; both era heatmaps |
| `runtimeBuckets` | bounded (4) | rail | — (no runtime tile; pure subset) |
| `releaseTypes` | bounded (4) | rail | Theatrical vs. streaming; Release type by year; Release type × era |
| `budgetTiers` | bounded (~5) | rail (accordion) | Budget tier by year; Budget tier × era |
| `watchedYears` / `watchedWindow` | bounded | rail | Watch pace; Watched by month; Watched by weekday |
| `languages` | medium-high | omnibox + summary | World cinema lean; Language × country; Languages |
| `countries` | medium-high | omnibox + summary | World cinema lean; Language × country; Countries |
| `conglomerates` | medium (~dozens) | omnibox + summary | By conglomerate |
| `actors` | high | omnibox + summary | Actors |
| `directors` | high | omnibox + summary | Directors |
| `writers` | high | omnibox + summary | Writers |
| `studios` | high | omnibox + summary | Studios |
| `collections` (franchises) | high | omnibox + summary | Collections |

Note: `directorQuery` (the fuzzy `?director=` box) is a reviews-page
concept; on stats use the exact `directors` slug facet via the omnibox so
the recompute is deterministic.

### 5b. Television (`ShowFilters`, `lib/feeds/stats/tv-stats.ts`)

| Dimension | Card. | Control | Self-ref tiles (→ readout) |
|---|---|---|---|
| `ratings` | bounded | rail | Rating distribution by level |
| `genres` | bounded | rail | Genres; Genres vs. baseline |
| `types` | bounded | rail | Type (donut) |
| `networks` | medium | omnibox + summary | Networks; Shows across networks |
| `decades` / premiere year | bounded | rail | — (no premiere-year tile; pure subset) |
| `watchedYears` / `watchedWindow` | bounded | rail | Season pace; Seasons by month/weekday; Episodes by month |
| `languages` | medium-high | omnibox + summary | World cinema lean; Language × country; Languages |
| `countries` | medium-high | omnibox + summary | World cinema lean; Language × country; Countries |
| `conglomerates` | medium | omnibox + summary | By conglomerate |
| `actors` | high | omnibox + summary | Actors |
| `creators` | high | omnibox + summary | Creators |

**TV-specific: the review-level control.** `cardKind` (show / season /
episode) is not a corpus filter in the same sense — it selects the *unit
of analysis*. Season is TV's canonical rating unit; counts must route
through `modesForReview` (`lib/feeds/serializd-mode-counts.mjs`) so the
miniseries double-count rule holds at every count surface. The level
control sits as its own segmented control (mirrors `RatingByLevelTabs`),
distinct from the dimension rails, and rebinds which level every per-level
tile reports on. When `cardKind` narrows to one level, the
"Rating distribution by level" tabs collapse to that level's single pane.

### 5c. Connected (`lib/feeds/stats/connected-stats.ts`)

Only the dimensions that exist on **both** sides are filterable here:
`ratings`, `genres`, `languages`, `countries`, `conglomerates`,
`watched*`, and crossover `actors`. Film-only or TV-only dimensions
(studios, networks, writers, creators, types, budget) are **not offered** —
they'd silently empty one side of every blended figure.

| Dimension | Self-ref tiles (→ readout) |
|---|---|
| `genres` | Genres — film vs. TV (dumbbell) |
| `languages` | World cinema lean; Languages; Language × country |
| `countries` | World cinema lean; Countries; Language × country |
| `conglomerates` | By conglomerate — film vs. TV |
| `watched*` | Film and television by month; By weekday |
| `actors` | Crossover actors |

---

## 6. The recursive collapse system

One rule, applied at three altitudes. Degradation is **not** a corpus-count
floor — it's about *which tiles break*, and tiles break non-uniformly
(counters tolerate thinness; distributions don't).

### Two-axis tile model

Each tile carries:

- **Robustness archetype** → sets the tile's **floor** (the minimum
  surviving n below which the chart is noise).
- **Criticality** → sets the tile's **page impact** (does its loss
  collapse a band / the page).

Archetype floors (surviving items in the tile's primary axis, after the
existing min-count + Bayesian-shrinkage gates):

| Archetype | Component(s) | Floor |
|---|---|---|
| counter | `Bigs`, lifetime levels | 1 |
| single-axis bar | `Bars`, `ColumnChart` | 5 |
| donut | `Donut` | 2 categories |
| versus | `Versus` (most-logged / rated) | 3 per column |
| diverging | `Diverging` | 15 |
| dumbbell | `Dumbbell` | 8 shared rows |
| stacked-by-year | `StackedBars`, `GroupedStackedBars` | 10 |
| heatmap | `Heatmap` | 25 |
| line | `LineChart` | 20 |

### Degradation ladder (per tile)

`T0 Full → T1 Thinned → T2 Skeletal → T3 Empty`, driven by surviving n vs.
the archetype floor:

- **T0 Full** — n comfortably clears floor: render the chart.
- **T1 Thinned** — n near floor: render with fewer rows / a caption noting
  the thinning.
- **T2 Skeletal** — below floor **or** self-referenced to a single value:
  collapse to a **readout** (the headline number(s) the tile would have
  shown, no chart). A genre-filtered Genres tile shows "Horror — 47 films
  (100% of selection)", not a one-bar chart.
- **T3 Empty** — zero surviving values: the tile **suppresses** (it does
  not render an empty stub).

### Altitude 1 — tile

As above. A suppressed tile (T3) does not leave a per-tile placeholder; it
vanishes into a **band footnote** (§ altitude 2).

### Altitude 2 — band (`StatsSection`)

A band collapses when **fewer than half its chart-bearing tiles survive**
(recommended; the alternative is "zero charts survive" — confirm). On
collapse:

- if the band owns a **robust counter** (e.g. "The corpus" owns Lifetime,
  "Where it comes from" owns World cinema lean), it degrades to a
  **band-readout**: the counter stays, the charts fold away;
- otherwise the whole band degrades to a one-line **band footnote** naming
  what was hidden ("Genres, Directors, and 3 more breakdowns need a wider
  selection").

Suppressed tiles within a surviving band roll up into that band's footnote
rather than each showing a stub. (Confirm this footnote-rollup vs.
per-tile-stub choice — prototype implemented the footnote.)

### Altitude 3 — page

The page hands off to reviews when the **Taste band collapses** — Taste
(Genres + Genres-vs-baseline) is the load-bearing band; if the selection
is too thin to support taste distribution, it's too thin for a dashboard.
The handoff replaces the dashboard with a funnel panel: "This selection
has N titles — too few for the full breakdown. See the N reviews →"
deep-linking into the corresponding reviews query.

**Connected exception.** Connected tiles don't click through to a single
reviews list (every figure blends both libraries). So its page floor
**cannot** hand off to one reviews query. Instead, when connected thins
out, it keeps the **Head-to-head counter** (Films vs. television — always
n≥1 per side) and points to the two per-cluster dashboards, which *can*
hand off. Connected never shows the reviews-funnel panel.

---

## 7. URL state and SEO

- Filter state is **URL-encoded** so a query is shareable. Exclusion is a
  **leading `!` per excluded value** (`?genre=horror&country=!us,!uk`) —
  locked. The same encoding round-trips through the reviews URL (§11).
- Every filtered state is **`noindex`** (matches the reviews-filter
  posture — filtered permutations are not canonical surfaces). The
  unfiltered dashboard stays the indexable canonical.
- The JSON-LD `CollectionPage` describes the **unfiltered** dashboard only;
  filtered states drop it.

---

## 8. Accessibility (WCAG 2.2 AA, from the start)

- Tri-state chips: `aria-pressed` cannot carry three states. Use a
  `<button>` with `aria-label` that names the current state ("Horror:
  included — activate to exclude") and a visible non-color cue for exclude
  (the `−` / strike), so the state never rests on color alone.
- The omnibox is a real combobox (`role="combobox"`, `aria-expanded`,
  `aria-activedescendant`) — reuse `SearchOmnibox` semantics.
- Summary chips: each is a labelled control with a reachable remove and a
  reachable include/exclude toggle, both ≥24px targets.
- Live n updates announced via an `aria-live="polite"` region on the
  summary so the recompute is perceivable without sight.
- Collapse transitions respect `prefers-reduced-motion` (instant `hidden`
  toggle, as `FacetAccordion` already does).
- Re-run axe against `/films/stats?…` filtered states in **both** themes
  on the rendered page — the sketch's tokens are approximate, so contrast
  and the tri-state cue must be re-validated on real tokens (recall:
  `--primary-500` doesn't exist; verify via computed style, not nominal
  token step).

---

## 9. Recompute mechanics

- The dashboards are **server components** reading typed compute at request
  time. Filtering re-runs the same `computeFilmStats` /
  `computeTvStats` / `computeConnectedStats` against a **predicate-narrowed
  corpus**, so the compute libs need to accept an optional filter
  predicate (the same `FilmFilters` / `ShowFilters` shape the reviews
  `applyFilters` already consumes — single source of truth for the
  predicate, reused, not reimplemented).
- Keep it a **server round-trip per filter change** (URL drives state,
  page re-renders) to preserve the no-client-data / no-live-API posture
  and keep figures un-drift-able from the reviews surface. The filter
  controls are the only client islands; the dashboard stays server-rendered.
- The collapse decisions (§6) are computed server-side from the narrowed
  result and baked into the response, so there's no client flash of a
  broken chart before it folds.

---

## 10. Build sequence

1. **Predicate plumbing.** Make `computeFilmStats` / `computeTvStats` /
   `computeConnectedStats` accept an optional `FilmFilters` / `ShowFilters`
   predicate and narrow the corpus before compute. Reuse the reviews
   `applyFilters` predicate; add tests on the narrowed-compute path
   (empty selection, single-value selection, exclusion-only selection).
2. **Collapse engine.** A pure function: given per-tile surviving-n and the
   archetype/criticality table, emit each tile's ladder rung + each band's
   state + the page verdict. Unit-tested in isolation (this is the part
   most worth tests — it's the logic that prevents a broken page).
3. **Tri-state chip + rails.** Build the chip (chosen style), wire
   `FilterRow` + `FacetAccordion` for the bounded dimensions per page.
4. **Omnibox + summary.** Extend `DismissableChip` to tri-state; wire the
   omnibox to deposit high-cardinality selections into the sticky summary;
   live n + `aria-live`.
5. **URL state + noindex.** Encode/decode filter state; flip `noindex` on
   any active filter; drop JSON-LD on filtered states.
6. **TV review-level control.** Segmented level control routing through
   `modesForReview`; rebind per-level tiles.
7. **Connected handoff variant.** Page-floor → keep head-to-head + point to
   per-cluster dashboards (no reviews-funnel panel).
8. **Reviews exclusion intake (minimal).** Teach `applyFilters` +
   the reviews URL parser to read exclusion (the predicate is shared, so
   this is the same work as step 1, surfaced on the reviews side). Render
   inherited exclusions in the **existing** "Active filters" dismissable-chip
   rail with a "not " prefix and a working remove. **Do not** convert the
   reviews rails to tri-state (§11).
9. **A11y + regression pass.** axe both themes on rendered filtered states;
   keyboard the tri-state and omnibox; verify the per-tile deep-links carry
   the active predicate AND resolve correctly on reviews; class-audit every
   tile archetype against its floor.

---

## 10a. Build status (as of 2026-06-21)

Films is the proving slice and is **shipped on branch `feat/stats-filters`**
(commit `72702db`, not yet pushed). Status against the §10 sequence:

| Step | Area | Films | TV | Connected |
|------|------|-------|----|-----------|
| 1 | Predicate plumbing | ✅ `computeFilmStats(FilmFilters)`; fuzzy `?title=`/`?director=` wired into `resolveFilmCorpus` (matches reviews count) | ❌ still unfiltered | ❌ still unfiltered |
| 2 | Collapse engine | ✅ `collapse.ts` wired into films render: per-tile rung, band footnotes/readouts, page handoff all live | reuse | — |
| 3 | Tri-state chip + rails | ✅ `TriStateChip`, `FilterRail`, `FacetAccordion` | reuse | — |
| 4 | Omnibox + summary | ✅ `SearchOmnibox`, `SummaryFilterChip`, `DismissableChip`, live n + `aria-live` | reuse | — |
| 5 | URL state + noindex | ✅ `parseFilmFilters`, noindex + JSON-LD drop on filtered | reuse | — |
| 6 | TV review-level control | — | ❌ | — |
| 7 | Connected handoff variant | — | — | ❌ |
| 8 | Reviews exclusion intake | ❌ (shared predicate exists; reviews side not surfaced) | | |
| 9 | A11y + regression pass | ❌ films slice not yet axe/keyboard-audited | | |

**Next-steps queue (agreed priority):**

1. ~~**Wire `collapse.ts` into the films/stats render**~~ ✅ **DONE 2026-06-21.**
   `computeFilmStats` now bakes a `collapse: CollapseResult` into `FilmStats`;
   `Tile`/`StatsSection` are decision-aware (T3/suppressed→null, T2→readout,
   T1→thinning caption); new primitives `TileReadout`, `BandFootnote`,
   `StatsHandoffPanel`. Half-empty Versus tiles now degrade to a readout of
   their surviving column. (See "Collapse wiring decisions" below.)
2. **A11y/axe pass on the finished films slice** (step 9, films-scoped):
   both themes, panel open, full keyboard trap + Esc/focus-restore,
   class-audit the tile archetypes under filtering. Cheap insurance *before*
   replicating the pattern across clusters.
3. **Replicate to TV** (steps 1, 3–6 for TV) reusing `StatsFilterControls`
   — build TV's rails/summary-dims, drop the island in; the "Type: Name"
   prefix and sticky behaviour come along for free. Confirm
   `TelevisionShell`'s existing active-chips already follow the prefix
   convention. Then **connected** (step 7).
4. **Reviews exclusion intake** (step 8).

Rationale for the order: verify-then-replicate (don't port bugs into TV),
and finish the proving slice before widening.

**Durable approach notes (so re-entry doesn't relearn):**

- **Sticky bar layout.** The bar and the dashboard must live in **one
  bordered `<Section>`** — a `position:sticky` element only travels within
  its DOM parent, so a bar boxed in its own short section never sticks.
- **Stuck-state edge.** The bar's separating edge (soft shadow + dark-mode
  hairline) appears **only while pinned**, toggled by an
  `IntersectionObserver` on a **1px** sentinel (a zero-height sentinel reads
  as non-intersecting in Chrome → permanently "stuck"). The border is driven
  as **longhands** (`borderBottomColor` toggled), never the `borderBottom`
  shorthand — mixing the two leaves the color reverting to `currentColor`
  (an opaque line) on un-pin. `STICKY_TOP_PX` is the single source for both
  `barStyle.top` and the observer's `rootMargin`.
- **Chip labels.** Entity-facet (omnibox) chips carry a `"Type: Name"`
  prefix (matches the reviews `ActiveFilterChips` convention); bounded rail
  values stay bare. Lives in `StatsFilterControls`, so TV inherits it.
- **Lede vs live count.** The hero lede reads the **unfiltered**
  `summary.totalFilms`; the filter-aware count lives **only** in the sticky
  bar (a recompute must not rewrite an out-of-view headline).

**Collapse wiring decisions (2026-06-21, adjudicated with Malcolm):**

- **Surviving-n is per-axis, NOT uniform "films feeding the tile".** Two
  failure modes degrade differently and one yardstick misses one of them.
  *Sample-driven* tiles (counters, the diverging genre tile, stacked-by-year,
  heatmap, line) gate on the feeding-FILM/event count. *Structure-driven*
  tiles (single-axis bars → non-empty categories; versus → the weaker column)
  gate on the CATEGORY/COLUMN count. A uniform film-count gate is blind to
  column emptiness — the exact thing this feature exists to catch. See
  `filmTileSurvival` in `lib/feeds/stats/film-stats.ts`.
- **The diverging tile is the one sample-gated exception in Taste.**
  `divergingGenre` is hard-capped at 12 rows, so the §6 `diverging` floor of
  15 is unsatisfiable as a ROW count and would collapse the tile even on the
  full corpus. It gates on the surviving corpus (films) instead. Floors in
  `ARCHETYPE_FLOORS` were left untouched.
- **Versus degrades to a readout, not suppression.** When a versus tile's
  gated "highest-rated" column drops below the per-column floor while
  "most-logged" survives, `TileSurvival.degradeToReadout` forces T2 (readout
  the surviving column) rather than T3. `degradeToReadout` is a general
  secondary-axis signal in the engine, distinct from `selfReferenced`.
- **Page handoff fires on THINNESS, not self-reference.** A Taste collapse
  caused purely because the user filtered BY genre (tautological distribution,
  but the corpus is still rich — e.g. 360 Drama films) keeps the dashboard:
  Taste folds to a footnote and the other bands carry the page. The
  reviews-handoff fires only when a Taste chart tile is genuinely below floor
  (`collapse.ts` altitude-3 `collapsedForThinness` check).
- **Readout copy is generic, flagged for voice.** `TileReadout` shows the
  narrowed corpus count + "Needs a wider selection to chart"; the band
  footnote names the hidden breakdowns. Per-tile voice (e.g. a versus readout
  rendering the actual most-logged rows; a self-ref Genres readout reading
  "Horror — 47 films, 100% of selection") is a deferred refinement.
- **Handoff deep-link carries the raw stats query** to `/films/reviews`
  verbatim (stats and reviews share the filter param vocabulary, §11). **KU:**
  validate that every stats param resolves identically on the reviews side.

---

## 11. Click-through propagation and reviews

The deep-link from a stats tile means "see the reviews behind *this*
number." Once the dashboard can be filtered, that promise only holds if the
**active predicate travels with the link**. So a tile deep-link is now
`active filter ∧ row subject`, not the row subject alone. Clicking the
Horror bar under `NOT US` must land on horror-excluding-US, or the reviews
count contradicts the tile — a trust break on the funnel's entry point.

That forces reviews to **understand exclusion** at the predicate and URL
layers. But understanding it is not the same as authoring it, and the two
have very different costs:

- **The predicate + URL work is shared and unavoidable.** Stats reuses
  `applyFilters` (§9), so exclusion lands in `FilmFilters` / `ShowFilters`
  and the URL parser exactly once, and both surfaces inherit it. This
  happens no matter what the reviews UI does.
- **Converting the reviews rails to tri-state is neither necessary nor
  cheap.** Reviews is the core funnel surface; most reviews users only ever
  *include*. A cycling chip taxes that common path (extra clicks to clear an
  include) and adds interaction complexity to the highest-leverage page for
  a capability they won't author.

**Decision (answering "is it less work to just make reviews cycling
chips?"): no — do the opposite.** Build the shared predicate, and on the
reviews side only *represent* an inherited exclusion. Reviews already has an
"Active filters" dismissable-chip rail with Clear all
(`FilmsShell.tsx`/`TelevisionShell.tsx`); an excluded value arriving via
deep-link renders there as a removable chip ("not United States"). The
reviews rails stay binary include-only and untouched. This is strictly less
code than a tri-state conversion, carries zero funnel cost, and still makes
the click-through truthful and editable.

The asymmetry this leaves — you author exclusions on stats (the query
surface) but only inherit-and-remove them on reviews (the browse surface) —
is intentional and matches each surface's job. If a future need to author
exclusions directly on reviews appears, the predicate already supports it
and the rails can adopt the same chip then; nothing here forecloses it.

---

## Locked decisions (resolved 2026-06-20)

1. **Chip affordance** — Style A (cycling: neutral → include → exclude) on
   the bounded stats rails (`TriStateChip.tsx`); Style B on the
   high-cardinality summary chips (`SummaryFilterChip.tsx`) — pill body
   toggles include ⇄ exclude, corner-bubble `×` removes, no `+/−` control.
   Reviews rails unchanged (§11). *(Refined 2026-06-21: body-toggle +
   corner-bubble `×` replaced the original separate-`−` sketch.)*
2. **Band collapse trigger** — collapses when **fewer than half** its
   chart tiles survive.
3. **Suppressed-tile display** — **band-footnote rollup** (no per-tile
   stubs).
4. **Exclusion URL encoding** — **leading `!` per excluded value**
   (`?country=!us,!uk`).
5. **Films people band label** — **"People and critics."**

New decision logged this round:

6. **Reviews exclusion handling** — represent inherited exclusions as
   removable "Active filters" chips; do **not** convert reviews rails to
   tri-state (§11).
