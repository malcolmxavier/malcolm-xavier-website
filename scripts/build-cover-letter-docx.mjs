// ─────────────────────────────────────────────────────────────────
// build-cover-letter-docx.mjs
//
// Generates a matched cover-letter template (.docx) — same visual
// identity as the resume so the pair reads as a set when a recruiter
// opens both: DM Sans, 10.5pt body, 0.5" margins, all-black palette,
// hyperlinked contact line, hairline rule under the header.
//
// Output: _private/cover-letter/malcolm-xavier-cover-letter-template.docx
//   • _private/ is gitignored — this artifact is never served by the
//     site and never committed to the repo.
//
// Workflow (mirrors the resume):
//   1. npm run cover-letter:docx
//   2. Upload to Google Drive
//   3. Right-click → "Open with" → Google Docs (Drive imports it as
//      a real, fully-editable Google Doc)
//   4. For each application: File → Make a copy → fill in the
//      [BRACKETED PLACEHOLDERS] → tailor body paragraphs → File →
//      Download → PDF Document
//
// Editing the template:
//   The body copy below is scaffolding — it shows the recommended
//   four-paragraph structure (hook, primary fit, secondary fit,
//   close) with [BRACKETED SLOTS] for the role/company specifics.
//   When the structure itself needs to change (e.g. add a fifth
//   paragraph for a particular role), edit the BODY array. When the
//   placeholder copy needs sharpening, edit it inline — the bracket
//   markers are the visual signal that a slot is unfilled.
// ─────────────────────────────────────────────────────────────────

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  ExternalHyperlink,
  PageOrientation,
  convertInchesToTwip,
  BorderStyle,
} from "docx";
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { z } from "zod";

// ─── Schemas ──────────────────────────────────────────────────────
// Light validation — the cover letter is simpler than the resume,
// but we still want a clear failure if a placeholder url is malformed
// or the contact block drifts out of sync with the resume.

const ContactSchema = z.object({
  name: z.string().min(1),
  headline: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(1),
  location: z.string().min(1),
  website: z.string().min(1),
  websiteUrl: z.string().url(),
  linkedin: z.string().min(1),
  linkedinUrl: z.string().url(),
  github: z.string().min(1),
  githubUrl: z.string().url(),
});

// ─── Content ──────────────────────────────────────────────────────
// Mirrors the contact block in scripts/build-resume-docx.mjs. When
// the resume contact info changes, update both files.

const CONTACT = {
  name: "Malcolm Xavier",
  headline:
    "Senior Product Manager · Growth, MarTech, and Data Platform · Media, Publishing, and Streaming · AI-Native",
  email: "malcolm@malxavi.com",
  phone: "(774) 262-2606",
  location: "Los Angeles, CA",
  website: "malxavi.com",
  websiteUrl: "https://malxavi.com",
  linkedin: "linkedin.com/in/malxavi",
  linkedinUrl: "https://www.linkedin.com/in/malxavi/",
  github: "github.com/malcolmxavier",
  githubUrl: "https://github.com/malcolmxavier",
};

// Recipient block — every field is a placeholder. The Hiring Manager
// name slot accepts "Hiring Manager" if the actual name isn't known;
// modern conventions allow either.
const RECIPIENT = {
  date: "[DATE — e.g., May 7, 2026]",
  hiringManager: "[HIRING MANAGER NAME, or omit this line if unknown]",
  roleTitle: "[ROLE TITLE]",
  company: "[COMPANY NAME]",
  // Mailing address is optional in modern cover letters — left here as
  // a placeholder for application portals that still expect it.
  companyAddress: "[COMPANY ADDRESS — optional; many applications omit]",
};

const SALUTATION = "Dear [HIRING MANAGER NAME or Hiring Manager],";

// Body paragraphs — scaffolding with bracketed slots. Voice mirrors
// Malcolm's resume summary so the letter reads continuous with the
// resume when a recruiter opens both.
//
// Structure:
//   1. Hook — why THIS company/role specifically; tie a JD signal or
//      recent company news to background.
//   2. Primary fit — the strongest quantified accomplishment relevant
//      to the target role; framed as a story, not a stat dump.
//   3. Secondary fit — the second-best signal: AI-native posture, MS
//      in Law (privacy/IP), multi-brand media scale, marketplace or
//      two-sided product work, ingestion-at-scale, etc. Pick one.
//   4. Close — reiterate enthusiasm, point to attached resume and
//      malxavi.com case studies, friendly CTA.
const BODY = [
  // ─── Paragraph 1 — hook ─────────────────────────────────────────
  "Your search for a [ROLE TITLE] to lead [SPECIFIC TEAM, INITIATIVE, OR PROBLEM SPACE FROM THE JD] at [COMPANY] caught my attention because [SPECIFIC, NON-GENERIC CONNECTION — e.g., recent product launch, public-facing strategy shift, a sub-brand or audience segment that maps to my work]. I've spent the last seven years building growth and data platforms at the intersection of media, publishing, and SaaS, and the shape of this role looks like a strong fit.",

  // ─── Paragraph 2 — primary fit ──────────────────────────────────
  "Most recently at People Inc. (formerly Dotdash Meredith), I scaled the audience-relationships MarTech platform for 40+ brands and 22M+ users — work that grew email revenue 33% YoY and lifted user LTV 2x through a content-specific newsletter program. The piece most relevant to [COMPANY]'s [SPECIFIC PRIORITY] is [SHARPEN: e.g., the experimentation infrastructure I operationalized to enable AI-based personalization, or the cross-brand component system that let us ship lifecycle playbooks once and reuse them everywhere]. [ONE MORE SENTENCE: how that experience would compound at COMPANY's stage/scale.]",

  // ─── Paragraph 3 — secondary fit ────────────────────────────────
  "[PICK ONE ANGLE: (a) AI-native posture — concurrent prompt-engineering work training LLMs across agentic and RAG use cases, applied to product discovery and delivery loops; (b) MS in Law from Northwestern, focused on data privacy and IP — applied to data-governance and compliance tradeoffs in MarTech roadmaps; (c) Muck Rack — scaled content ingestion 350% YoY and reduced parsing errors 45%, enabling downstream search and ML; (d) marketplace work at User Interviews — drove 135% increase in participant re-recruitment via targeting features and SQL-modeled fulfillment metrics.] [ONE SENTENCE: tie the angle directly to a JD requirement.]",

  // ─── Paragraph 4 — close ────────────────────────────────────────
  "I'd welcome the chance to talk about how my background applies to [SPECIFIC ROLE PRIORITY OR OUTCOME]. My resume is attached, and recent case studies — including a meta one on shipping malxavi.com with Claude Code as build partner — are at malxavi.com/case-studies. Looking forward to hearing from you.",
];

const SIGN_OFF = "Sincerely,";

// ─── Validate ─────────────────────────────────────────────────────
ContactSchema.parse(CONTACT);

// ─── Style helpers (matched to the resume) ────────────────────────

const FONT = "DM Sans";

// docx convention: half-points. 21 = 10.5pt, etc.
const SIZE = {
  name: 44, // 22pt
  headline: 21, // 10.5pt
  contact: 21, // 10.5pt
  body: 21, // 10.5pt
  recipient: 21, // 10.5pt
  date: 21, // 10.5pt
};

const COLOR = {
  black: "000000",
  link: "000000", // Underline carries the link affordance, not color.
};

/** Plain text run — base font, black, 10.5pt body unless overridden. */
function run(text, opts = {}) {
  return new TextRun({
    text,
    font: FONT,
    color: COLOR.black,
    size: opts.size ?? SIZE.body,
    bold: opts.bold ?? false,
    italics: opts.italics ?? false,
  });
}

/** Hyperlinked text run — black with a single underline. */
function linkRun(text, url, opts = {}) {
  return new ExternalHyperlink({
    link: url,
    children: [
      new TextRun({
        text,
        font: FONT,
        color: COLOR.link,
        size: opts.size ?? SIZE.body,
        bold: opts.bold ?? false,
        italics: opts.italics ?? false,
        underline: { type: "single", color: COLOR.link },
      }),
    ],
  });
}

/** Separator " · " — used between contact items. */
function sep() {
  return run(" · ", { size: SIZE.contact });
}

/** Spacer paragraph — empty line for visual rhythm between blocks. */
function spacer() {
  return new Paragraph({
    spacing: { before: 0, after: 0 },
    children: [run("")],
  });
}

// ─── Document construction ────────────────────────────────────────

const children = [];

// — Name (matches resume hero treatment)
children.push(
  new Paragraph({
    spacing: { before: 0, after: 60 },
    children: [
      new TextRun({
        text: CONTACT.name,
        font: FONT,
        bold: true,
        size: SIZE.name,
        color: COLOR.black,
      }),
    ],
  }),
);

// — Headline
children.push(
  new Paragraph({
    spacing: { before: 0, after: 80 },
    children: [run(CONTACT.headline, { size: SIZE.headline, italics: true })],
  }),
);

// — Contact line 1: email · phone · location
children.push(
  new Paragraph({
    spacing: { before: 0, after: 40 },
    children: [
      linkRun(CONTACT.email, `mailto:${CONTACT.email}`, {
        size: SIZE.contact,
      }),
      sep(),
      linkRun(
        CONTACT.phone,
        `tel:${CONTACT.phone.trim().startsWith("+") ? CONTACT.phone.replace(/[^0-9+]/g, "") : "+1" + CONTACT.phone.replace(/[^0-9]/g, "")}`,
        { size: SIZE.contact },
      ),
      sep(),
      run(CONTACT.location, { size: SIZE.contact }),
    ],
  }),
);

// — Contact line 2: LinkedIn · GitHub · Personal Website
//   Closing border under this paragraph creates the same hairline
//   rule as the resume header — the visual signature that ties the
//   two documents together as a set.
children.push(
  new Paragraph({
    spacing: { before: 0, after: 240 },
    border: {
      bottom: {
        color: COLOR.black,
        space: 8,
        style: BorderStyle.SINGLE,
        size: 4, // 0.5pt thin rule
      },
    },
    children: [
      linkRun("LinkedIn", CONTACT.linkedinUrl, { size: SIZE.contact }),
      sep(),
      linkRun("GitHub", CONTACT.githubUrl, { size: SIZE.contact }),
      sep(),
      linkRun("Personal Website", CONTACT.websiteUrl, {
        size: SIZE.contact,
      }),
    ],
  }),
);

// — Date
children.push(
  new Paragraph({
    spacing: { before: 0, after: 240 },
    children: [run(RECIPIENT.date, { size: SIZE.date })],
  }),
);

// — Recipient block (each line a separate paragraph for clean editing)
children.push(
  new Paragraph({
    spacing: { before: 0, after: 0 },
    children: [run(RECIPIENT.hiringManager, { size: SIZE.recipient })],
  }),
);
children.push(
  new Paragraph({
    spacing: { before: 0, after: 0 },
    children: [run(RECIPIENT.roleTitle, { size: SIZE.recipient })],
  }),
);
children.push(
  new Paragraph({
    spacing: { before: 0, after: 0 },
    children: [run(RECIPIENT.company, { size: SIZE.recipient })],
  }),
);
children.push(
  new Paragraph({
    spacing: { before: 0, after: 240 },
    children: [run(RECIPIENT.companyAddress, { size: SIZE.recipient })],
  }),
);

// — Salutation
children.push(
  new Paragraph({
    spacing: { before: 0, after: 200 },
    children: [run(SALUTATION)],
  }),
);

// — Body paragraphs (one Paragraph per BODY entry, blank line between)
BODY.forEach((para, idx) => {
  children.push(
    new Paragraph({
      spacing: {
        before: 0,
        // Last paragraph gets larger trailing space before sign-off.
        after: idx === BODY.length - 1 ? 240 : 200,
      },
      children: [run(para)],
    }),
  );
});

// — Sign-off
children.push(
  new Paragraph({
    spacing: { before: 0, after: 0 },
    children: [run(SIGN_OFF)],
  }),
);

// — Blank line for handwritten signature space (kept for printed
//   versions; harmless when emailed/uploaded digitally).
children.push(spacer());
children.push(spacer());

// — Typed name
children.push(
  new Paragraph({
    spacing: { before: 0, after: 0 },
    children: [run(CONTACT.name, { bold: true })],
  }),
);

// ─── Document assembly ────────────────────────────────────────────

const doc = new Document({
  creator: CONTACT.name,
  title: `${CONTACT.name} Cover Letter`,
  description: "Cover letter template — Senior Product Manager",
  styles: {
    default: {
      document: {
        run: { font: FONT, color: COLOR.black, size: SIZE.body },
      },
    },
  },
  sections: [
    {
      properties: {
        page: {
          size: { orientation: PageOrientation.PORTRAIT },
          margin: {
            top: convertInchesToTwip(0.5),
            right: convertInchesToTwip(0.5),
            bottom: convertInchesToTwip(0.5),
            left: convertInchesToTwip(0.5),
          },
        },
      },
      children,
    },
  ],
});

// ─── Write to disk ────────────────────────────────────────────────
// Output lives under _private/ — gitignored, never served, local-only.

const outPath = resolve(
  process.cwd(),
  "_private/cover-letter/malcolm-xavier-cover-letter-template.docx",
);
mkdirSync(dirname(outPath), { recursive: true });

const buf = await Packer.toBuffer(doc);
writeFileSync(outPath, buf);

console.log(`✓ Wrote ${outPath} (${(buf.length / 1024).toFixed(1)} KB)`);
console.log(`  Open with: open "${outPath}"`);
