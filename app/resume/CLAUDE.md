# Resume content

Source of truth: `app/resume/resume-data.tsx`. Edit that file for routine
bullet, role, or headline changes. They appear on `/resume` after the next
dev reload or deploy.

## Two outputs, one not-quite-shared source

The same conceptual data drives:

1. The `/resume` page (this directory).
2. The downloadable `.docx` / `.pdf` resume (built by
   `scripts/build-resume-docx.mjs` then `scripts/build-resume-pdf.mjs`).

The docx script reads its **own** bullet set, **not** `resume-data.tsx`.
Edits here change the site only.

## When to mirror

**Only when explicitly asked.** Site copy is iterated more frequently than
the printable resume; most edits should stay site-only to avoid churning
the downloadable artifact every minor wording change. If Malcolm asks for
"the resume" without specifying which output, ask.
