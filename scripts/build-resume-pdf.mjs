// ─────────────────────────────────────────────────────────────────
// Convert the .docx resume template to the public PDF download via
// LibreOffice headless mode.
//
// Run after `npm run resume:docx` so the .docx is fresh. The npm
// script `resume:pdf` chains the two for one-command regeneration.
//
// Why LibreOffice (and not e.g. pdfkit/pdf-lib direct PDF emission):
// the .docx generator already encodes ~700 lines of careful resume
// formatting (font sizing, page margins, keepNext rules, page-2+
// header, hyperlink handling). Re-encoding all of that in a PDF
// library would duplicate the formatting source of truth. Using
// LibreOffice's writer→PDF filter lets the .docx stay canonical and
// produces a faithful PDF rendering as a side effect.
//
// Metadata: the .docx's `dc:title` is "Malcolm Xavier Resume", which
// LibreOffice carries through to the PDF's Title metadata. Browser
// tabs and Save-As dialogs that prefer metadata-Title over filename
// (Chrome, Safari) therefore read the right name.
//
// Hyperlinks: all http/https links from the .docx survive the export
// natively. mailto:/tel: also pass through (verified spot-check).
//
// Required system fonts: **DM Sans must be installed system-wide**
// (e.g. `brew install --cask font-dm-sans`). Without it, LibreOffice
// silently substitutes a default sans-serif with different metrics,
// which compresses line height and shifts page breaks — User
// Interviews ends up on page 1 instead of page 2, etc. The .docx
// declares "DM Sans" as the family; the only thing that matters at
// PDF time is that the system can resolve it. After installation the
// font is also embedded into the PDF as a subset, so any reader on
// any machine sees the same layout (this is why the PDF is ~200 KB
// rather than ~90 KB).
// ─────────────────────────────────────────────────────────────────

import { execSync } from "node:child_process";
import { existsSync, renameSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");
const sourceDocx = join(
  repoRoot,
  "public/resume/malcolm-xavier-resume-template.docx",
);
const outDir = join(repoRoot, "public/resume");
// LibreOffice writes <input-stem>.pdf into --outdir, so the
// intermediate filename matches the .docx stem. We rename it to the
// public download name once the conversion succeeds.
const intermediatePath = join(outDir, "malcolm-xavier-resume-template.pdf");
const finalPath = join(outDir, "malcolm-xavier-resume.pdf");

if (!existsSync(sourceDocx)) {
  console.error(
    `✗ ${sourceDocx} not found. Run \`npm run resume:docx\` first.`,
  );
  process.exit(1);
}

try {
  execSync(
    `soffice --headless --convert-to pdf:writer_pdf_Export "${sourceDocx}" --outdir "${outDir}"`,
    { stdio: ["ignore", "ignore", "inherit"] },
  );
} catch {
  console.error(
    "✗ LibreOffice conversion failed. Is `soffice` on PATH? Install via `brew install --cask libreoffice`.",
  );
  process.exit(1);
}

if (!existsSync(intermediatePath)) {
  console.error(`✗ Expected ${intermediatePath} not produced.`);
  process.exit(1);
}

renameSync(intermediatePath, finalPath);
const sizeKb = (statSync(finalPath).size / 1024).toFixed(1);
console.log(`✓ Wrote ${finalPath} (${sizeKb} KB)`);
