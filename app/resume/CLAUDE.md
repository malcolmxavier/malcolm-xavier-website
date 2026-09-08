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

**The review copy is a second artifact, never a flag on the deliverable.**
It lands beside the real file with `.review` in its name and says so in
its own first line and in Word's properties pane, so the copy carrying
highlights cannot become the copy that gets submitted. It is also a
little longer than the deliverable — restoring dropped wording inline
makes the text longer — so **the page-count check belongs to the real
build**, not to this one.
