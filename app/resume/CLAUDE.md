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
