# Resume surfaces map

The resume has five surfaces inside this repo plus one external (LinkedIn). Each surface has its own optimization target and its own source of truth. This file is the canonical map of what's shared, what diverges, and how to keep them in sync.

The shared-field expectations are enforced by `npm run resume:check`, which lives at `scripts/check-resume-sync.mjs` and fails loudly if any listed field drifts between surfaces.

## Surfaces in this repo

| Surface | Source | Output | Audience |
|---|---|---|---|
| `/resume` page | `app/resume/resume-data.tsx` | rendered React page | recruiters, hiring managers, human readers |
| Public PDF download | `scripts/build-resume-docx.mjs` → `scripts/build-resume-pdf.mjs` (LibreOffice) | `public/resume/malcolm-xavier-resume.pdf` | recruiters who download to save or forward |
| Public .docx template | `scripts/build-resume-docx.mjs` | `public/resume/malcolm-xavier-resume-template.docx` | Malcolm's per-application tailoring workflow (Drive → Docs → tailor → PDF) |
| Bullet bank | `scripts/build-bullet-bank-docx.mjs` | generated locally, not committed | Malcolm's reference document when drafting bullets per-application |
| Cover letter | `scripts/build-cover-letter-docx.mjs` | generated locally, not committed | Malcolm's per-application cover letter header |

## External surface

| Surface | Source | Audience |
|---|---|---|
| LinkedIn profile | manually maintained on linkedin.com | LinkedIn Recruiter Boolean searches; passive network discovery |

LinkedIn is intentionally out of the sync check. It carries a keyword-stuffed job title for Boolean search that does not mirror the clean title in this repo — see "Intentional divergences" below.

## Shared fields (must stay in sync where marked •)

The `npm run resume:check` script verifies these. Update the script's `FIELDS` list whenever you add a new shared field or change a canonical value.

| Field | `resume-data.tsx` | `build-resume-docx.mjs` | `build-bullet-bank-docx.mjs` | `build-cover-letter-docx.mjs` |
|---|:-:|:-:|:-:|:-:|
| Headline | • (U+2011) | • | • | • |
| Name | — (rendered from `page.tsx`) | • | • | • |
| Email | • | • | • | • |
| Phone | • | • | • | • |
| Location | • | • | • | • |
| LinkedIn URL | • | • | • | • |
| GitHub URL | • | • | — (intentional, see below) | • |
| Per-role: company | • | • | • | — |
| Per-role: dates | • | • | • | — |
| Per-role: title | • | • | • | — |

## Intentional divergences (do NOT sync)

These differences are by design. The check script normalizes them out where applicable so they don't trigger false alarms.

- **Bullets**: site uses inline JSX `<Link>`s for cross-references; docx scripts hardcode ATS-friendly plain text. Each script's bullets can differ in wording, ordering, and count. Edits default to site-only — mirror to docx only when explicitly asked.
- **Headline hyphen**: site uses U+2011 (non-breaking hyphen) in `AI‑Native` so the term wraps as a single word at narrow viewports. Docx scripts use a regular hyphen because Word hyphenation rules differ from CSS line-breaking.
- **Color and formatting**: site uses sub-brand accent colors and rich typography. Docx uses black text only, DM Sans throughout, single column — clean ATS extraction.
- **`SUMMARY` section header**: site renders a SUMMARY label above the paragraph. Docx omits the label; the paragraph sits between contact and EXPERIENCE.
- **LinkedIn vs resume title**: LinkedIn carries `Senior Product Manager, Audience Relationships (Growth, MarTech, and Data Platform)` for Boolean search. The repo carries the clean form. The bullets on the resume already establish scope; the parenthetical just causes line wraps. (Memory: `feedback_linkedin_vs_resume_keyword_strategy.md`.)
- **Bullet bank contact block**: the bullet bank is a private working doc for drafting per-application bullets — not an external-facing artifact. Its contact block intentionally stops at LinkedIn (no GitHub) to keep the header lean. The check script excludes `bulletBank` from the GitHub URL field for this reason.

## Workflows

### Source edit → site update

Edit `app/resume/resume-data.tsx`. The `/resume` page updates on the next dev reload or Vercel deploy. No further action.

### Source edit → PDF download update

The production PDF (`public/resume/malcolm-xavier-resume.pdf`) is regenerated from the docx, which is generated from the docx script. To refresh after a change:

```
npm run resume:pdf
```

This runs `build-resume-docx.mjs` (writes the .docx template), then `build-resume-pdf.mjs` (LibreOffice headless → PDF). Both files land in `public/resume/`.

Requires DM Sans installed system-wide (`brew install --cask font-dm-sans`); without it, LibreOffice substitutes a different sans-serif and the page breaks shift.

### Per-application tailoring

The .docx template is the starting point for tailored versions, not the final artifact:

1. `npm run resume:docx`
2. Upload `public/resume/malcolm-xavier-resume-template.docx` to Google Drive
3. Right-click → Open with → Google Docs (Drive imports as a fully-editable doc)
4. File → Make a copy → tailor the copy per the application
5. File → Download → PDF Document
6. The tailored PDF lives outside this repo

The bullet bank (`npm run bullet-bank:docx`) generates a reference document with a broader bullet inventory to draw from during step 4.

### Sync verification

```
npm run resume:check
```

Greps every shared scalar field across all four scripts and reports drift. Run after any change that touches resume content; ideally wire as a pre-commit hook for `app/resume/**` or `scripts/build-*.mjs` paths.

## Adding a new surface

If you add a new resume surface (Notion page, speaker bio, newsletter author card, etc.):

1. Add a row to the "Surfaces in this repo" table.
2. Mark which shared fields it inherits in the sync table.
3. Add it to `SURFACES` and the relevant `in` arrays inside `scripts/check-resume-sync.mjs`.
4. If it has its own intentional divergences, document them under "Intentional divergences".
