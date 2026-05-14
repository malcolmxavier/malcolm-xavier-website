// ─────────────────────────────────────────────────────────────────
// check-resume-sync.mjs
//
// Asserts that genuinely-shared scalar fields (headline, contact
// info, role companies/dates/titles) match across all four resume
// surfaces in this repo. Each surface intentionally diverges on
// bullets, formatting, and a few characters (U+2011 vs regular
// hyphen) — that divergence is allowed and documented in
// app/resume/SURFACES.md. This script only checks the fields that
// MUST stay in sync.
//
// Run after any resume-touching change:
//   npm run resume:check
//
// Exit code 0 if all shared fields match, 1 if any drift detected.
//
// When you update a shared field (e.g. the headline), update it in
// each source file AND in the FIELDS list below. The check then
// catches the case where one source file gets missed.
// ─────────────────────────────────────────────────────────────────

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// The four resume surfaces in this repo. Each one carries its own
// copy of the shared fields below — by design, since they format
// differently (JSX on site, plain text in docx) and the docx files
// can't import the .tsx without a build step.
const SURFACES = {
  site: "app/resume/resume-data.tsx",
  resumeDocx: "scripts/build-resume-docx.mjs",
  bulletBank: "scripts/build-bullet-bank-docx.mjs",
  coverLetter: "scripts/build-cover-letter-docx.mjs",
};

// Normalize U+2011 (non-breaking hyphen) to a regular hyphen before
// comparing. The site headline uses U+2011 in "AI‑Native" so the
// term wraps as a single word at narrow viewports; the docx scripts
// use a regular hyphen because Word hyphenation rules differ. The
// divergence is intentional, so we normalize it out for the check.
const normalize = (s) => s.replace(/‑/g, "-");

// Canonical values for the fields that must stay in sync. The
// `value` is the literal substring to search for inside each
// surface's source file. The `in` array lists which surfaces must
// contain it.
//
// Per-role titles are wrapped in double quotes so we match the
// declaration (`title: "..."`) rather than any prose mention. Dates
// use the en-dash (–) that the source files use literally.
const FIELDS = [
  // ─── Top-of-page positioning ─────────────────────────────────────
  {
    label: "Headline",
    value:
      "Senior Product Manager · Growth and Data Platform · Media, Publishing, and Streaming · AI-Native",
    in: ["site", "resumeDocx", "bulletBank", "coverLetter"],
  },

  // ─── Contact block ───────────────────────────────────────────────
  // Name lives as a literal string in the docx scripts; on the site
  // it's rendered from page.tsx, not present as a string in
  // resume-data.tsx — so the site is excluded from this one check.
  {
    label: "Name",
    value: "Malcolm Xavier",
    in: ["resumeDocx", "bulletBank", "coverLetter"],
  },
  {
    label: "Email",
    value: "malcolm@malxavi.com",
    in: ["site", "resumeDocx", "bulletBank", "coverLetter"],
  },
  {
    label: "Phone",
    value: "(774) 262-2606",
    in: ["site", "resumeDocx", "bulletBank", "coverLetter"],
  },
  {
    label: "Location",
    value: "Los Angeles, CA",
    in: ["site", "resumeDocx", "bulletBank", "coverLetter"],
  },
  {
    label: "LinkedIn URL",
    value: "https://www.linkedin.com/in/malxavi/",
    in: ["site", "resumeDocx", "bulletBank", "coverLetter"],
  },
  {
    // Bullet bank intentionally omits GitHub — it's a private working
    // doc, not an external-facing artifact, so the leaner contact
    // block stops at LinkedIn. See SURFACES.md, "Intentional
    // divergences" → "Bullet bank contact block".
    label: "GitHub URL",
    value: "https://github.com/malcolmxavier",
    in: ["site", "resumeDocx", "coverLetter"],
  },

  // ─── Per-role titles + dates ─────────────────────────────────────
  // Roles appear on the site, the docx resume, and the bullet bank.
  // The cover letter has no roles. We check title and date pairs so
  // a stale title in one file or a wrong date span gets flagged.
  {
    label: "People Inc. title",
    value: '"Senior Product Manager, Audience Relationships"',
    in: ["site", "resumeDocx", "bulletBank"],
  },
  {
    label: "People Inc. dates",
    value: "Feb 2024 – Oct 2025",
    in: ["site", "resumeDocx", "bulletBank"],
  },
  {
    label: "Muck Rack title",
    value: '"Technical Product Manager, Content and Data Ingestion"',
    in: ["site", "resumeDocx", "bulletBank"],
  },
  {
    label: "Muck Rack dates",
    value: "Sep 2022 – Feb 2024",
    in: ["site", "resumeDocx", "bulletBank"],
  },
  {
    label: "User Interviews title",
    value: '"Product Manager"',
    in: ["site", "resumeDocx", "bulletBank"],
  },
  {
    label: "User Interviews dates",
    value: "Sep 2020 – Feb 2022",
    in: ["site", "resumeDocx", "bulletBank"],
  },
  {
    label: "Fullstack Academy title",
    value: '"Admissions Lead, Project Manager"',
    in: ["site", "resumeDocx", "bulletBank"],
  },
  {
    label: "Fullstack Academy dates",
    value: "Jun 2018 – Feb 2020",
    in: ["site", "resumeDocx", "bulletBank"],
  },
];

// Read each surface once, cache, and normalize hyphens up front so
// comparisons are O(1) per check.
const cache = new Map();
function readSurface(key) {
  if (!cache.has(key)) {
    cache.set(key, normalize(readFileSync(resolve(SURFACES[key]), "utf8")));
  }
  return cache.get(key);
}

// Walk every field × every required surface and collect mismatches.
// We collect all failures before exiting so the user sees the full
// picture in one run rather than fixing one at a time.
const failures = [];
for (const field of FIELDS) {
  const expected = normalize(field.value);
  for (const surface of field.in) {
    const contents = readSurface(surface);
    if (!contents.includes(expected)) {
      failures.push({
        field: field.label,
        surface,
        path: SURFACES[surface],
        expected: field.value,
      });
    }
  }
}

if (failures.length === 0) {
  const fieldCount = FIELDS.length;
  const surfaceCount = Object.keys(SURFACES).length;
  console.log(
    `✓ ${fieldCount} shared field(s) match across ${surfaceCount} resume surface(s).`,
  );
  process.exit(0);
}

console.error(`✗ ${failures.length} drift(s) detected:\n`);
for (const f of failures) {
  console.error(`  • ${f.field} missing from ${f.path}`);
  console.error(`    Expected: ${f.expected}`);
  console.error("");
}
console.error(
  "If the divergence is intentional, document it in app/resume/SURFACES.md",
);
console.error(
  "and update FIELDS in scripts/check-resume-sync.mjs. Otherwise, mirror",
);
console.error("the value across the listed files.");
process.exit(1);
