# Resume surfaces map

The resume has five surfaces inside this repo plus one external (LinkedIn). Each surface has its own optimization target and its own source of truth. This file is the canonical map of what's shared, what diverges, and how to keep them in sync.

The shared-field expectations are enforced by `npm run resume:check`, which lives at `scripts/check-resume-sync.mjs` and fails loudly if any listed field drifts between surfaces.

**Scope of the check, stated honestly (corrected 2026-08-19).** It covers the four builder/data files listed in its `SURFACES` map — `resume-data.tsx` and the three docx scripts — and only the fields in its `FIELDS` list. It does **not** cover the site's other positioning surfaces: `app/layout.tsx` (site description and the JSON-LD `Person.jobTitle`, `description`, and `knowsAbout`), `public/llms.txt`, per-page metadata and OG images, the repeated alt/caption strings, or `app/styles/page.tsx`. Those carry the same positioning and drift silently; they are tracked as the `headline-rollout` node in the Booth backlog.

**Sent artifacts are records, not surfaces.** `_private/cover-letter/build-apollo.mjs` also carries a headline, and it is deliberately **not** synced: it generated a cover letter that was actually sent to Apollo.io in May 2026, so its values must stay as they went out. Retroactively updating it would falsify the record. It is frozen with a header comment saying so. The same rule applies to any future per-application letter or tailored resume once it has been sent — copy the template to make a new one, never edit the old one to match current positioning. Earlier revisions of this file implied the check covered everything, which is how the bullet bank's summary drifted in three places unnoticed.

## Surfaces in this repo

| Surface | Source | Output | Audience |
|---|---|---|---|
| `/resume` page | `app/resume/resume-data.tsx` | rendered React page | recruiters, hiring managers, human readers |
| Public PDF download | `scripts/build-resume-docx.mjs` → `scripts/build-resume-pdf.mjs` (LibreOffice) | `public/resume/malcolm-xavier-resume.pdf` | recruiters who download to save or forward |
| Public .docx template | `scripts/build-resume-docx.mjs` | `public/resume/malcolm-xavier-resume-template.docx` | Malcolm's per-application tailoring workflow (Drive → Docs → tailor → PDF) |
| Bullet bank | `scripts/build-bullet-bank-docx.mjs` | `public/resume/malcolm-xavier-bullet-bank-template.docx` — **committed and web-reachable**, despite what this row used to claim | Malcolm's reference document when drafting bullets per-application |
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
- **Headline length** (settled 2026-08-19): every surface in this repo carries the same three-segment headline. A four-segment version adding `Media, Publishing, and Streaming` was tried and reverted the same day—it wrapped to two lines in the docx at 10.5pt, and it wrapped on the web page too, because the `/resume` content column caps at **864px** and stops growing (measured at 1728px wide; the string needs roughly 1,000px for one line). No viewport renders it on one line, so the earlier claim in this file that "the site has no width constraint" was wrong. Dropping the domain segment costs nothing: the summary directly beneath opens "in media, publishing, and B2B SaaS," and the body evidences the domain twice more (People Inc. as "America's largest publisher," Muck Rack as a PR tool). LinkedIn is the one surface that carries a fourth segment—see below.
- **Color and formatting**: site uses sub-brand accent colors and rich typography. Docx uses black text only, DM Sans throughout, single column — clean ATS extraction.
- **`SUMMARY` section header**: site renders a SUMMARY label above the paragraph. Docx omits the label; the paragraph sits between contact and EXPERIENCE.
- **LinkedIn headline** (updated 2026-08-19): LinkedIn carries `Senior Product Manager | Growth, MarTech, and Customer Data Platforms | AI-Native Operations | Principal Consultant, Malcolm Xavier Consulting`—pipes rather than middots, per LinkedIn's own convention, and a fourth segment naming the consultancy that no repo surface carries. The divergence is deliberate: the headline is Boolean-searchable by recruiters and renders **detached from the About section** everywhere except the profile page itself (search results, the feed, comments, messages), so keywords have to live in the headline rather than lean on the summary. Manually maintained and out of the check. Supersedes the older `Senior Product Manager, Audience Relationships (Growth, MarTech, and Data Platform)` form this file used to describe. (Memory: `feedback_linkedin_vs_resume_keyword_strategy.md`.)
- **LinkedIn About is its own piece of writing, and `SUMMARY` does not cascade to it** (his call, 2026-09-10). The résumé summary is a dense four-sentence block written to be skimmed above a page of receipts; the About section is read on its own, at length, by someone who arrived at the profile — so it deviates deliberately in register, structure, and what it chooses to say. **A résumé summary edit is therefore not automatically a LinkedIn punch-list item**; the question is whether the *fact* is missing from the profile, never whether the two paragraphs match. He maintains it by hand and it is out of the check, like the headline. **The text itself is not on file here** — that is the gap that produced the bad punch-list item, which proposed appending a résumé clause to a paragraph nobody had read.
- **Every LinkedIn body section deviates, so a punch list names facts and never blocks** (his call, 2026-09-10). The profile's prose is his, written per section for a reader who is already on it, and it does not mirror the résumé anywhere: About is its own paragraph, the consulting entry states the build work as **prose where the résumé uses bullets** (the client lines beneath it stay line-shaped), and the People Inc. entry differs again — he applied that one as a surgical edit rather than a replacement. **So a résumé bullet does not port as a bullet.** The fact travels and the form is rewritten for the section it lands in, which makes the useful punch-list item "this claim changed, here is the new wording of the claim", not a paste-ready block. **None of this text is on file here**, and two bad punch-list items came straight out of that: a résumé clause proposed for a paragraph nobody had read, and bullet-for-bullet replacements for a section with no bullets.
- **Bullet bank contact block**: the bullet bank is a private working doc for drafting per-application bullets — not an external-facing artifact. Its contact block intentionally stops at LinkedIn (no GitHub) to keep the header lean. The check script excludes `bulletBank` from the GitHub URL field for this reason.
- **The sync check covers header fields, not body prose** (found 2026-09-10). `check-resume-sync.mjs` compares 17 shared fields — name, headline, contact, URLs — across the four in-repo surfaces, and nothing compares a bullet or a role context line. A sweep across all nine tailored cuts that day found one factual conflict and a dozen wordings of claims that had drifted apart unnoticed, none of which the check could see. Two of them were in the bullet bank, which is why a bullet promoted into canonical has to be chased into `build-bullet-bank-docx.mjs` by hand. The convergence rules are in `app/resume/CLAUDE.md`, "Keeping the cuts in agreement with each other."
- **"First product manager" is a resume claim and never a LinkedIn one** (his call, 2026-09-10). The `internal-platforms` cut's People Inc. context line ends "as its first product manager"; no other surface carries it, and it must not be cascaded to LinkedIn or to `resume-data.tsx`. What actually happened is that he was the first (re-)hire into the function after the M&A — a company with People Inc.'s history has surely hired someone like him before. On a resume the line is a **story opening**: it invites the question and he answers it in the room. On LinkedIn the reader can date the company in about two seconds, so the same words read as an inaccuracy rather than an opening, and there is no room to answer. **The qualified form travels and the bare one does not** — "the first product manager *in a platform function*", or "*in a function staffed by operators*", names the scope the claim is true of, which is why both Anthropic letters and the referral block carry it safely.
- **Case study curation**: the `/resume` carousel and the resume docx's Case Studies section both surface case studies, but with intentionally different curation rules — see the dedicated "Case studies" section below. The sync check does not enforce parity here.
- **MSL presentation lines**: the Northwestern MSL education entry lists **two** presentation lines onsite—the second-year privacy paper (`/projects/privacy-law-social-media-era`) and the first-year video-sharing-ethics paper (`/projects/ethics-video-sharing-apps`), each linked to its project page. The docx carries **only the first**. The onsite surface has hypertext room and the links are load-bearing (they're the primary path a human reaches those `noindex` project pages); the docx is ATS- and page-bound, and the first-year title is long, so a second presentation line would cost a full line for a secondary credential. The sync check does not cover education `details`, so this needs no `FIELDS` change.

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

### The Desktop set — where the standard cuts actually live

The .docx builds land in `~/Downloads`; the copies Malcolm **sends** are PDFs
on his **Desktop**, and that is the set to refresh whenever canonical or a base
changes. They are already-named files: overwrite them in place, one copy each,
rather than adding a dated or suffixed second copy.

| Desktop file | built from |
| --- | --- |
| `Malcolm Xavier Resume.pdf` (spaces) | canonical, no variant |
| `Malcolm_Xavier_Resume_ABM.pdf` | `abm-demand-gen` |
| `Malcolm_Xavier_Resume_Data_Platform.pdf` | `data-platform` |
| `Malcolm_Xavier_Resume_GTM.pdf` | `gtm-measurement` |
| `Malcolm_Xavier_Resume_Growth.pdf` | `subscription-growth` |
| `Malcolm_Xavier_Resume_Internal_Platform.pdf` | `internal-platforms` |

**Two traps in that table, and both cost a wrong file if you guess.**
`Malcolm_Xavier_Resume.pdf` — underscores, the plainest name in the folder — is
the **non-PM customer service and administration cut**, not the canonical
resume. The canonical one is the same words with spaces. And
`..._Growth.pdf` is `subscription-growth`, not `growth-monetization`, which has
no Desktop copy at all. Confirm a mapping by reading the headline out of the
existing PDF (`pdftotext -f 1 -l 1 <file> - | sed -n 3p`) before overwriting it;
the filenames are Malcolm's shorthand and do not track the variant ids.

**What is out of scope for a refresh:** the non-PM cuts
(`Malcolm_Xavier_Resume.pdf`, `.Hospitality.pdf`, `.République.pdf`) and every
employer-tailored file, which are records of what was sent and must not be
rewritten under the same name.

The safe build route keeps `public/resume/` out of it, since that directory
publishes with the site:

```
RESUME_OUT_DIR=<scratch> npm run resume:docx                      # canonical
RESUME_VARIANT=scripts/resume-variants/<v>.mjs \
  RESUME_OUT_DIR=<scratch> npm run resume:docx                    # each cut
soffice --headless --convert-to pdf --outdir <scratch> <scratch>/*.docx
cp <scratch>/<built>.pdf ~/Desktop/<existing name>.pdf
```

Regenerating the published assets in `public/resume/` is a separate, deliberate
step (see "Source edit → PDF download update"), not a side effect of refreshing
the Desktop set.

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
