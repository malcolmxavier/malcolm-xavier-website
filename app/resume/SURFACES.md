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
- **Case study curation**: the `/resume` carousel and the resume docx's Case Studies section both surface case studies, but with intentionally different curation rules — see the dedicated "Case studies" section below. The sync check does not enforce parity here.

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

Greps every shared scalar field across all four scripts and reports drift. Exits non-zero on failure.

This also runs automatically as a **pre-commit hook** whenever a staged file matches one of the four resume content sources. The hook is installed by `scripts/install-git-hooks.mjs`, which is wired to the `prepare` npm lifecycle — so fresh clones get it after the first `npm install`. Manual install / reinstall:

```
npm run hooks:install                  # install or update
npm run hooks:install -- --force       # overwrite an existing custom hook
```

To bypass the hook for an intentional divergence: `git commit --no-verify`. When you do, document the divergence under "Intentional divergences" above and update the `FIELDS` list in `scripts/check-resume-sync.mjs` so the check stops flagging it.

## Case studies

Case studies appear on several surfaces, with two distinct types that follow different rules:

- **Personal / site studies** (no `employer` field) — portfolio pieces built deliberately to demonstrate craft (e.g. `basecamp-coffee`, `building-this-site`, `architecture-under-contract`).
- **Work studies** (`employer` field set to the employer's name) — case studies attached to a specific role, drawn from real work history.

### Surface rules

| Surface | Personal studies | Work studies |
|---|---|---|
| `/resume` carousel | Newest 3, filtered by `!employer` | **Excluded** — they live in the role footer instead |
| `/resume` role footer | Not surfaced here | "Read the case study →" link via the role's `relatedCaseStudies` field |
| `/case-studies` index | Section 1 — appears regardless of work-study volume | Section 2 — appears as soon as ≥1 work study exists |
| Resume docx Case Studies section | Curated 2-entry list (tighter than the carousel; selected for senior-PM signal density on a page-limited surface) | Excluded — the malxavi.com URL in the contact block routes any deeper interest to `/case-studies` |

### Why the docx is tighter than the carousel

The `/resume` carousel has horizontal room and reads as a "selected projects" strip; three entries fit cleanly and each tells a different story. The docx is page-bound and ATS-bound — fewer, denser entries serve the recruiter better. The 2-entry set should lead with the highest signal-density study (currently `architecture-under-contract`, then `building-this-site`).

When you add a personal case study that beats one of the current two on senior-PM signal density, swap it in. The carousel and docx lists evolve independently.

### Why work studies don't appear in the docx body

Each work study is attached to a role via `relatedCaseStudies`. On `/resume`, the role footer renders the link inline next to the role it documents — the strongest possible context. In the docx, the role bullets already carry the "what"; a separate Case Studies section that duplicates the work-study list would add noise without adding signal. The contact-block URL to malxavi.com routes any reader who wants depth.

### Adding a work case study

1. Add the entry to `CASE_STUDIES` in `app/resume/resume-data.tsx` with `employer: "<Employer Name>"`.
2. Add the slug to the relevant role's `relatedCaseStudies` array.
3. Build the case study page at `/case-studies/<slug>`.
4. The study auto-renders on `/case-studies` (Section 2) and on `/resume` (role footer). No docx update needed.

### Adding a personal case study

1. Add the entry to `CASE_STUDIES` in `app/resume/resume-data.tsx` (no `employer`).
2. Build the case study page at `/case-studies/<slug>`.
3. It auto-enters the `/resume` carousel at the top (newest 3 visible).
4. If it should also appear in the docx, edit the `CASE_STUDIES` array in `scripts/build-resume-docx.mjs` (curated independently — swap out the weakest of the existing two if you're at the 2-entry cap).
5. Run `npm run resume:pdf` to regenerate.

## Adding a new surface

If you add a new resume surface (Notion page, speaker bio, newsletter author card, etc.):

1. Add a row to the "Surfaces in this repo" table.
2. Mark which shared fields it inherits in the sync table.
3. Add it to `SURFACES` and the relevant `in` arrays inside `scripts/check-resume-sync.mjs`.
4. If it has its own intentional divergences, document them under "Intentional divergences".
