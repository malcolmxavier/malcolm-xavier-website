# Resume content

Source of truth for the `/resume` page: `app/resume/resume-data.tsx`. Edit
that file for routine bullet, role, or headline changes. They appear on
`/resume` after the next dev reload or deploy.

## Five surfaces, not one

The resume actually lives across five files in this repo (six surfaces if
you count LinkedIn, which is maintained manually off-repo). Most edits
touch more than one of them. The full surface map — including which
fields are shared, which are intentionally divergent, and how to keep
them in sync — lives in `app/resume/SURFACES.md`. Read that before
making non-trivial resume changes.

## Default: site-only

**Most edits should stay site-only.** Site copy is iterated more frequently
than the printable resume; updating all five surfaces for every wording
tweak churns the downloadable artifact unnecessarily. If Malcolm asks for
"the resume" without specifying which output, ask.

When mirroring is requested, the affected surfaces are documented in
SURFACES.md. After any multi-file edit, run:

```
npm run resume:check
```

This greps the shared scalar fields (headline, contact info, role
companies/dates/titles) across all four scripts and reports drift. It
exits non-zero on failure, so it doubles as a pre-commit guard.

## Why a dual source of truth

`build-resume-docx.mjs` hardcodes its own copy of the data rather than
importing from this file because `resume-data.tsx` carries JSX (inline
`<Link>` components inside bullets and context lines). Pulling JSX into
a Node script would mean TS compilation plus React-element walking — a
lot of plumbing for an artifact regenerated rarely. The duplication is
the simpler tradeoff; the check script catches drift.

## Tailored cuts, and reviewing one

A resume cut for a single application ships as a small module in
`scripts/resume-variants/` that exports only the blocks it changes —
anything it leaves out falls through to the canonical content in
`build-resume-docx.mjs`. Those modules stay out of the repo: this one is
public, and a file named for the employer a cut was tailored to would
publish the application.

```
RESUME_VARIANT=scripts/resume-variants/<variant>.mjs npm run resume:docx
```

Reviewing one by reading it start to finish is the slow way to find what
actually moved. Swap the script for `resume:review` and the build marks
its own changes:

```
RESUME_VARIANT=scripts/resume-variants/<variant>.mjs npm run resume:review
```

Highlighted wording is new or rewritten, struck-through grey wording is
canonical text the cut drops (shown where it used to sit), and whole
entries the cut drops are named in a Review notes section at the end.
Both marks survive the Google Docs import.

**Most cuts build on a named base and list only their changes.** Every
canonical role, bullet, and education entry in `build-resume-docx.mjs`
carries a short id (`people-email-revenue`), and a cut names the base it
builds on and lists its swaps by id—replace this bullet, drop that one,
add a new one after a third—rather than retyping every role to change
one line. The bases live in `scripts/resume-variants/_bases/`, gitignored
for the same reason the cuts are. The full vocabulary, with an example,
is the "Variant overlay" comment in the builder. A cut that is genuinely
a different document can still replace whole blocks outright.

To build anything without overwriting a copy that was already reviewed or
sent, set `RESUME_OUT_DIR` (or `COVER_LETTER_OUT_DIR` for letters) to a
scratch folder. The file keeps its usual name there.

**The review copy is a second artifact, never a flag on the deliverable.**
It lands beside the real file with `.review` in its name and says so in
its own first line and in Word's properties pane, so the copy carrying
highlights cannot become the copy that gets submitted. It is also a
little longer than the deliverable — restoring dropped wording inline
makes the text longer — so **the page-count check belongs to the real
build**, not to this one.

## Keeping the cuts in agreement with each other

`resume:review` diffs one cut against canonical, which is the right tool
for reviewing a cut before it ships and is structurally blind to the
problem this section is about. Drift between cuts does not show up there:
two variants can each look reasonable against canonical and still say two
different things about the same job. A 2026-09-10 sweep across all nine
cuts found one factual conflict (DataAnnotation described as evaluation
work in four cuts and training work in two), five wordings of one claim
that differed for no reason at all, three context lines trimmed
separately for the same page-fit problem, and one cut using a curly
apostrophe in a line every other cut wrote straight.

Three rules came out of it.

**The strongest shared version wins, and deviation has to be earned.**
The goal is the same details across as much of each cut as possible,
deviating only where the req actually calls for it. A wording that is
simply better belongs to every cut, and it belongs in canonical or in
`_bases/` rather than being retyped per variant — three cuts carrying
identical text under three ids is drift waiting to happen.

**Standardizing a new variant means running the whole comparison**, not
only the review copy against canonical. Every claim the new cut makes
that an existing cut also makes gets compared, and the two either agree
or the difference is written down as a decision.

**A one-off cut still gets asked the promotion question.** A variant
built for a single application is where the better sentence usually gets
written, under real pressure, for a real reader. Before it is set aside,
ask whether anything in it deserves promotion to another cut or to
canonical. The HubSpot bullet ("give the business live visibility into
funnel performance") reached every cut that way; it was written for one
application and sat unnoticed beside a nominalized canonical version for
weeks.

**And cascade is never automatic in the other direction.** When canonical
changes, each cut is a separate question — a cut deviates on purpose, so
a canonical edit can silently undo a tailoring decision. Ask per cut.
This applies to `resume-data.tsx` too: the site is a tenth surface and a
canonical .docx edit does not reach it (see "Why a dual source of truth").

**Articles are skipped on resume bullets** (his rule, 2026-09-10).
"Improved core marketplace fulfillment metric by 15%", not "the core
marketplace fulfillment metric". Summaries and role context lines are
slightly more formal and keep their articles, because they are sentences
rather than compressed claims.
