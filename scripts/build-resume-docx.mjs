// ─────────────────────────────────────────────────────────────────
// build-resume-docx.mjs
//
// Generates an ATS-friendly .docx resume from hardcoded content.
// Output: public/resume/malcolm-xavier-resume-template.docx
//
// Workflow:
//   1. npm run resume:docx
//   2. Upload the file to Google Drive
//   3. Right-click → "Open with" → Google Docs (Drive imports it
//      as a real, fully-editable Google Doc)
//   4. For each application: File → Make a copy → tailor copy →
//      File → Download → PDF Document
//
// Why hardcoded vs. importing app/resume/resume-data.tsx:
//   resume-data.tsx contains JSX (inline <Link>s in bullets and
//   the IC context). Pulling JSX into a Node script means TS
//   compilation + React-element walking — a lot of plumbing for
//   an artifact regenerated rarely. We accept dual source of
//   truth here; when the data changes, both this script and
//   resume-data.tsx need updating. Keep them in sync via the
//   inline content blocks below.
//
// Design (matching what was signed off):
//   • Single column, 0.5" margins, US Letter
//   • DM Sans throughout (10.5pt body, 12pt company headers,
//     22pt name)
//   • Black text only — no accent colors (clean ATS extraction)
//   • Bold headers, italic context lines, • bullets
//   • Hyperlinks for company names + contact info + inline orgs
//   • No section header for SUMMARY (paragraph appears straight
//     after contact, before EXPERIENCE)
// ─────────────────────────────────────────────────────────────────

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Header,
  ExternalHyperlink,
  PageOrientation,
  convertInchesToTwip,
  BorderStyle,
} from "docx";
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { pathToFileURL } from "node:url";
import { z } from "zod";

// ─── Schemas ──────────────────────────────────────────────────────
// The .docx is launch-critical — recruiters open it as the
// downloadable resume. A bullet array with an unexpected segment
// shape would silently produce a malformed paragraph (or crash docx
// mid-render). We zod-parse the source data up-front so the script
// fails loud with a clear message instead of shipping garbage.

const SegmentSchema = z.object({
  text: z.string(),
  bold: z.boolean().optional(),
  url: z.string().url().optional(),
});

// A bullet is either a plain string OR an array of segments.
const BulletSchema = z.union([z.string(), z.array(SegmentSchema).min(1)]);

// Context segments — same shape as bullets but used for the italic
// role-context line that can include inline links.
const ContextSegmentSchema = z.object({
  text: z.string(),
  url: z.string().url().optional(),
});

const RoleSchema = z.object({
  company: z.string().min(1),
  url: z.string().url().optional(),
  // Some roles (Freelance, Independent Consulting) intentionally
  // omit location since it doesn't read meaningfully on those.
  location: z.string().min(1).optional(),
  title: z.string().min(1),
  dates: z.string().min(1),
  context: z.string().optional(),
  contextSegments: z.array(ContextSegmentSchema).optional(),
  bullets: z.array(BulletSchema),
  // Optional linked reference to the role's case study on malxavi.com.
  // Rendered as a separated "Case study: <title>" line under the
  // bullets, mirroring the /resume role-footer link. Employer studies
  // ride their role here; the two editorial/meta studies stay in the
  // standalone Case Studies section at the bottom.
  caseStudy: z
    .object({ title: z.string().min(1), url: z.string().url() })
    .optional(),
});

const EducationSchema = z.object({
  institution: z.string().min(1),
  url: z.string().url().optional(),
  credential: z.string().min(1),
  honors: z.string().optional(),
  location: z.string().min(1),
  dates: z.string().min(1),
  context: z.string().optional(),
});

const CaseStudySchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  url: z.string().url(),
});

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
// Hardcoded; mirror app/resume/resume-data.tsx when content changes.

const BASE_CONTACT = {
  name: "Malcolm Xavier",
  headline:
    "Senior Product Manager · Growth, MarTech, and Customer Data Platforms · AI-Native Operations",
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

const BASE_SUMMARY =
  "Senior Product Manager with 7+ years scaling growth, marketing, and data platforms in media, publishing, and B2B SaaS. Built and operated MarTech infrastructure for 22M+ users across 40+ brands, driving 33% YoY email revenue growth. Applied an MS in Law (focused on data privacy and IP) to data governance and compliance-related roadmap tradeoffs. Architects AI-native discovery and delivery loops—roadmapping, outcome measurement, and documentation.";

// Each role: company, optional company URL, location, title, dates,
// context (string OR array of {text, url?} segments via contextSegments),
// bullets (each entry is either a plain string OR an array of
// {text, bold?, url?} segments — segments allow inline bold/link spans
// so metric phrases bold inside an otherwise plain bullet sentence).
const BASE_ROLES = [
  {
    // Consolidated practice entry — mirrors the site's Malcolm Xavier
    // Consulting role (replaces the former Freelance / Prompt Engineer
    // and Independent Consulting entries). Org names are linked but not
    // bold: the docx reserves bold for metric phrases, so an
    // engagement list with no hero metrics carries no bold runs.
    company: "Malcolm Xavier Consulting",
    // Remote-only for the practice; matches the site. LA stays on the
    // top-level contact block, not the role.
    location: "Remote",
    title: "Principal Consultant",
    dates: "Feb 2022 – Present",
    context:
      "Independent product, data, and content-strategy practice—growth systems, MarTech and customer data platforms, privacy-aware data governance, and AI-native product and content operations.",
    bullets: [
      "Build and operate my own products—malxavi.com and the editorial operation behind my published writing—on an AI-native setup, with agentic workflows in the loop from roadmap to ship",
      [
        { text: "Fleet", url: "https://www.fleetai.com" },
        { text: " (2026–present): AI training and evaluation—prompting techniques, evaluation rubrics, and agent-behavior assessment for simulated-environment research" },
      ],
      [
        { text: "DataAnnotation", url: "https://www.dataannotation.tech" },
        { text: " (2023–2026): LLM and agent training—CoT and meta-prompting, evaluation rubrics and criteria, and peer review of model outputs" },
      ],
      [
        { text: "Artist Growth", url: "https://www.artistgrowth.com" },
        { text: " (2022): product operations and GDPR/CCPA compliance for music-industry SaaS" },
      ],
    ],
  },
  {
    company: "People Inc.",
    url: "https://people.inc",
    location: "Remote",
    title: "Senior Product Manager, Audience Relationships",
    dates: "Feb 2024 – Oct 2025",
    context:
      "“America's largest publisher” (formerly Dotdash Meredith). Scaled growth/MarTech platform for a network of 40+ brands and 22M+ users.",
    bullets: [
      [
        { text: "Grew email revenue 33% YoY", bold: true },
        { text: " with reusable components and lifecycle marketing playbooks" },
      ],
      [
        { text: "Partnered with data science to scale a recipe recommendation service and drive " },
        { text: "2x traffic", bold: true },
      ],
      [
        { text: "Introduced a content-specific newsletter program with " },
        { text: "3x open rates and 2x user LTV", bold: true },
      ],
      "Operationalized experiments to enable AI-based personalized acquisition and engagement",
      "Built models in SQL, BigQuery, and Connected Sheets to identify achievable outcomes that informed the AI-based personalization strategy",
    ],
    caseStudy: {
      title: "Infrastructure enables personalization",
      url: "https://malxavi.com/case-studies/people-inc",
    },
  },
  {
    company: "Muck Rack",
    url: "https://muckrack.com",
    location: "Remote",
    title: "Technical Product Manager, Content and Data Ingestion",
    dates: "Sep 2022 – Feb 2024",
    context:
      "SaaS reporting tool for PR professionals. Scaled the content platform; enabled search and monitoring features.",
    bullets: [
      [
        { text: "Scaled ingestion 350% YoY", bold: true },
        { text: ", enabling downstream ML classification, search, and reporting" },
      ],
      [
        { text: "Improved core AI/ML model accuracy, " },
        { text: "reducing parsing errors by 45% YoY", bold: true },
      ],
      [
        { text: "Backfilled content and data to achieve a " },
        { text: "500% increase in historical coverage", bold: true },
      ],
      "Led the initiative to decompose the ingestion monolith, improving ETL cost, scalability, and reliability",
      "Liaised with external content vendors and developers to ensure data-processing compliance",
    ],
    caseStudy: {
      title: "Data platforms: quality over quantity",
      url: "https://malxavi.com/case-studies/muck-rack",
    },
  },
  {
    company: "User Interviews",
    url: "https://www.userinterviews.com",
    location: "Remote",
    title: "Product Manager",
    dates: "Sep 2020 – Feb 2022",
    context:
      "SaaS UXR tool and marketplace for researchers and participants. Led core and platform teams.",
    bullets: [
      [
        { text: "Improved marketplace management by driving a " },
        { text: "135% increase in participant re-recruitment", bold: true },
      ],
      [
        { text: "Implemented targeting features that " },
        { text: "improved core marketplace fulfillment metric by 15%", bold: true },
      ],
      "Designed, analyzed, and reported on A/B tests for email-notification system model updates",
      "Built SQL queries and dashboards in Mode to monitor and report on marketplace operations",
    ],
    caseStudy: {
      title: "Steering leading indicators",
      url: "https://malxavi.com/case-studies/user-interviews",
    },
  },
  {
    company: "Fullstack Academy",
    url: "https://www.fullstackacademy.com",
    location: "New York, NY",
    title: "Admissions Lead, Project Manager",
    dates: "Jun 2018 – Feb 2020",
    context:
      "Web-development bootcamp (and The Grace Hopper Program). Scaled and optimized the enrollment system to exceed growth targets.",
    bullets: [
      [
        { text: "Generated " },
        { text: "$30M+ in annual revenue (170% YoY increase)", bold: true },
        { text: " by scaling enrollment" },
      ],
      "Partnered with engineering to optimize integrations, automations, and system architecture",
    ],
  },
  {
    company: "Fractured Atlas",
    url: "https://www.fracturedatlas.org",
    location: "New York, NY",
    title: "Program Associate",
    dates: "Mar 2014 – Oct 2017",
    context:
      "SaaS arts-administration tool. Provided administrative support to end users.",
    bullets: [
      "Tracked and reported on user analytics as inputs for roadmap prioritization",
      "Conducted quality-assurance testing of new features and bug fixes",
    ],
  },
];

const BASE_EDUCATION = [
  {
    institution: "Northwestern University, Pritzker School of Law",
    location: "Chicago, IL",
    dates: "Sep 2021 – May 2023",
    credential: "Master of Science in Law",
    honors: "Honors",
    context:
      "Applied privacy law frameworks to PM work in data platforms, AI personalization, and user-data governance.",
    details: [
      "Teaching Assistant: Negotiations Skills and Strategies (Professor Lynn Cohn)",
      // Presentation title links to its project detail page on malxavi.com.
      [
        { text: "Presentation: " },
        {
          text: '"The Revolution Will Not Be Live Streamed: Privacy Law in the Social Media Era"',
          url: "https://malxavi.com/projects/privacy-law-social-media-era",
        },
      ],
    ],
  },
  {
    institution: "Correlation One — Data Science For All (DS4A)",
    location: "Online",
    dates: "Oct 2020 – Mar 2021",
    credential: "Data Science Certificate",
    honors: "Honors · Johnson & Johnson Distinguished Scholar",
    details: [
      "Relevant technologies: Python, Pandas, Jupyter Notebook, Google Data Studio",
      // Presentation title links to its project detail page on malxavi.com.
      [
        { text: "Presentation: " },
        {
          text: '"Oceans Rise, Properties Fall"',
          url: "https://malxavi.com/projects/sea-level-rise-florida",
        },
      ],
    ],
  },
  {
    institution: "Yandex Practicum",
    location: "Online",
    dates: "Mar 2020 – Sep 2020",
    credential: "Web Development Certificate",
    details: [
      "Relevant technologies: HTML, CSS, JavaScript, React, Node, Visual Studio Code, GitHub",
    ],
  },
];

// ─── Case studies ─────────────────────────────────────────────────
// Each entry: title (linked), body text. No CTA — the underlined
// title carries the affordance. Order and copy mirror the website
// case-study card grid in app/resume/resume-data.tsx so the printed
// resume reads consistently with the live recruiter view; both
// titles link to the canonical malxavi.com case-study URLs.
//
// Dual-source acknowledgement: the web copy lives in resume-data.tsx
// (it's .tsx so bullets can embed inline JSX). This script hardcodes
// its own parallel copy. Bridging them would require a TS compiler
// step plus a React-element walker for an artifact regenerated maybe
// once a month — accepted dual source of truth, kept in sync by
// hand. When updating one, update the other.
const BASE_CASE_STUDIES = [
  {
    title: "Building my personal website, malxavi.com",
    url: "https://malxavi.com/case-studies/building-this-site",
    description:
      "Shipping this site with Claude Code as build partner—architecture bets, production incidents, and what AI-native PM work looks like with a human in the loop.",
  },
  {
    title: "Architecture under contract",
    url: "https://malxavi.com/case-studies/architecture-under-contract",
    description:
      "One architectural rule that keeps three integrations online when their upstreams break—polite-client posture for the one with no API, enrichment for the rest.",
  },
];

// ─── Variant overlay ──────────────────────────────────────────────
// A tailored one-off (a resume cut for a single application) is the
// same document with different content, so it ships as a small module
// that exports only the blocks it changes rather than a second copy of
// this 900-line script. Set RESUME_VARIANT to the module's path:
//
//   RESUME_VARIANT=scripts/resume-variants/<variant>.mjs npm run resume:docx
//
// The variant modules themselves stay out of this repo: it is public, and
// a file named for the employer a cut was tailored to would publish the
// application. Same reasoning as the output path below.
//
// Anything the variant doesn't export falls through to the canonical
// content above, and with the variable unset the output is byte-for-byte
// what it has always been — the default path stays the default path.
// A variant may also set OUT_PATH to keep a one-off out of
// public/resume/, which is published with the site.

const variantPath = process.env.RESUME_VARIANT;
const variant = variantPath
  ? await import(pathToFileURL(resolve(process.cwd(), variantPath)).href)
  : {};

const CONTACT = variant.CONTACT ?? BASE_CONTACT;
const SUMMARY = variant.SUMMARY ?? BASE_SUMMARY;
const ROLES = variant.ROLES ?? BASE_ROLES;
const EDUCATION = variant.EDUCATION ?? BASE_EDUCATION;
const CASE_STUDIES = variant.CASE_STUDIES ?? BASE_CASE_STUDIES;
const OUT_PATH =
  variant.OUT_PATH ?? "public/resume/malcolm-xavier-resume-template.docx";
// Document metadata shown in Word's properties pane; a variant cut for a
// non-PM req shouldn't describe itself as a PM resume.
const DOC_DESCRIPTION = variant.DOC_DESCRIPTION ?? "Resume — Senior Product Manager";
// Page size in twips. The canonical resume has always emitted the docx
// library's A4 default (11906 x 16838) despite the header comment above
// saying US Letter, and its published PDF is A4 — changing that would
// reflow the live download, so it stays until someone asks. A variant
// may opt into US Letter (12240 x 15840), which is the shorter page and
// therefore the stricter page-count budget.
const PAGE_SIZE = variant.PAGE_SIZE ?? { width: 11906, height: 16838 };

// ─── Validate content ─────────────────────────────────────────────
// Run schemas before any document construction so a malformed entry
// surfaces with a clear zod error pointing at the bad field, rather
// than crashing inside docx with a stack trace from deep in the
// rendering pipeline.
ContactSchema.parse(CONTACT);
z.array(RoleSchema).parse(ROLES);
z.array(EducationSchema).parse(EDUCATION);
z.array(CaseStudySchema).parse(CASE_STUDIES);

// ─── Style helpers ────────────────────────────────────────────────

const FONT = "DM Sans";

// All sizes are in half-points (docx convention). 21 = 10.5pt, etc.
const SIZE = {
  name: 44, // 22pt
  headline: 21, // 10.5pt
  contact: 21, // 10.5pt
  body: 21, // 10.5pt
  sectionHeader: 22, // 11pt
  companyHeader: 24, // 12pt
  titleLine: 21, // 10.5pt
  context: 21, // 10.5pt
  bullet: 21, // 10.5pt
};

// Colors as hex (no leading #). All-black palette.
const COLOR = {
  black: "000000",
  link: "000000", // Linked text stays black; underline carries the affordance.
};

/** A standard text run with our base font + black color. */
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

/** A hyperlinked text run — black + underlined. */
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

/** A separator " · " in the contact / dates lines. */
function sep() {
  return run(" · ", { size: SIZE.contact });
}

/**
 * Render a bullet's children. Bullets accept two shapes:
 *   - a plain string (rendered as a single TextRun, the legacy form)
 *   - an array of {text, bold?, url?} segments, each becoming its own
 *     TextRun. Segments with `url` render as ExternalHyperlinks; the
 *     `bold` flag applies to either form. Used to bold metric phrases
 *     ("33% YoY", "$30M+") inline with otherwise plain bullet copy,
 *     mirroring the <strong> JSX in app/resume/resume-data.tsx.
 */
function bulletChildren(bullet) {
  if (typeof bullet === "string") {
    return [run(bullet, { size: SIZE.bullet })];
  }
  return bullet.map((seg) =>
    seg.url
      ? linkRun(seg.text, seg.url, { size: SIZE.bullet, bold: !!seg.bold })
      : run(seg.text, { size: SIZE.bullet, bold: !!seg.bold }),
  );
}

// ─── Document construction ────────────────────────────────────────

const children = [];

// — Name
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
//   Friendly labels (not URLs); each hyperlinks to its destination.
children.push(
  new Paragraph({
    spacing: { before: 0, after: 200 },
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

// — Summary paragraph (no SUMMARY label, per Malcolm)
children.push(
  new Paragraph({
    spacing: { before: 0, after: 240 },
    children: [run(SUMMARY)],
  }),
);

// ─── Section header helper ────────────────────────────────────────
function sectionHeader(label, opts = {}) {
  return new Paragraph({
    spacing: { before: 240, after: 120 },
    border: {
      bottom: {
        color: COLOR.black,
        space: 4,
        style: BorderStyle.SINGLE,
        size: 6, // 0.75pt rule
      },
    },
    // keepNext keeps the section header glued to the entry that
    // follows — so EXPERIENCE / EDUCATION can never end up alone
    // at the bottom of a page.
    keepNext: opts.keepNext ?? false,
    children: [
      new TextRun({
        text: label.toUpperCase(),
        font: FONT,
        bold: true,
        size: SIZE.sectionHeader,
        color: COLOR.black,
        characterSpacing: 30, // tracked-out caps
      }),
    ],
  });
}

// ─── Keep-together helper ─────────────────────────────────────────
// Takes an array of Paragraph CONFIGS (plain objects, not Paragraph
// instances), sets keepNext: true on all but the last, then
// constructs Paragraph instances and pushes them to the target
// array. Result: the docx engine treats the entry as a single
// block and won't break it across pages.
//
// docx Paragraph options are baked at construction time, so we
// have to defer construction until we know which config is last.
function pushKeptTogether(targetArray, paragraphConfigs) {
  paragraphConfigs.forEach((config, i) => {
    if (i < paragraphConfigs.length - 1) {
      config.keepNext = true;
    }
    targetArray.push(new Paragraph(config));
  });
}

// — EXPERIENCE section.
//   The section header is built with keepNext below so it can't sit
//   alone at the bottom of a page.
children.push(sectionHeader("Experience", { keepNext: true }));

ROLES.forEach((role, idx) => {
  // Build all paragraphs for this entry into an array, then apply
  // keepNext to all but the last so the entry never splits across
  // pages (Malcolm's rule: an entry should not span pages).
  const beforeRole = idx === 0 ? 0 : 200;
  const entryParas = [];

  // Company line
  entryParas.push({
    spacing: { before: beforeRole, after: 0 },
    children: [
      role.url
        ? linkRun(role.company, role.url, {
            size: SIZE.companyHeader,
            bold: true,
          })
        : run(role.company, { size: SIZE.companyHeader, bold: true }),
      ...(role.location
        ? [run(" — " + role.location, { size: SIZE.companyHeader })]
        : []),
    ],
  });

  // Title — Dates
  entryParas.push({
    spacing: { before: 0, after: 60 },
    children: [
      run(role.title, { size: SIZE.titleLine, bold: true }),
      run(` — ${role.dates}`, { size: SIZE.titleLine }),
    ],
  });

  // Context (string OR inline-linked segments)
  if (role.contextSegments) {
    entryParas.push({
      spacing: { before: 0, after: 80 },
      children: role.contextSegments.map((seg) =>
        seg.url
          ? linkRun(seg.text, seg.url, {
              size: SIZE.context,
              italics: true,
            })
          : run(seg.text, { size: SIZE.context, italics: true }),
      ),
    });
  } else if (role.context) {
    entryParas.push({
      spacing: { before: 0, after: 80 },
      children: [run(role.context, { size: SIZE.context, italics: true })],
    });
  }

  // Bullets — each entry is either a plain string or a segment array
  // (see bulletChildren()). Segment arrays let metric phrases bold
  // inline; plain strings are the legacy single-run form.
  role.bullets.forEach((bullet) => {
    entryParas.push({
      spacing: { before: 0, after: 40 },
      bullet: { level: 0 },
      indent: { left: convertInchesToTwip(0.2) },
      children: bulletChildren(bullet),
    });
  });

  // Case-study reference line (employer studies only). Sits under the
  // bullets with extra space-before for visual separation, no bullet
  // marker, aligned to the bullet-text indent. "Case study:" is plain;
  // the title is an italic underlined link that carries the affordance.
  if (role.caseStudy) {
    entryParas.push({
      spacing: { before: 90, after: 0 },
      indent: { left: convertInchesToTwip(0.2) },
      children: [
        run("Case study: ", { size: SIZE.bullet }),
        linkRun(role.caseStudy.title, role.caseStudy.url, {
          size: SIZE.bullet,
          italics: true,
        }),
      ],
    });
  }

  // Apply keepNext to all paragraphs except the last so the engine
  // treats the entry as a single keep-together block.
  pushKeptTogether(children, entryParas);
});

// — EDUCATION section
children.push(sectionHeader("Education", { keepNext: true }));

EDUCATION.forEach((entry, idx) => {
  const beforeEntry = idx === 0 ? 0 : 200;
  const entryParas = [];

  entryParas.push({
    spacing: { before: beforeEntry, after: 0 },
    children: [
      run(entry.institution, { size: SIZE.companyHeader, bold: true }),
      ...(entry.location
        ? [run(" — " + entry.location, { size: SIZE.companyHeader })]
        : []),
    ],
  });

  // Credential — Honors — Dates
  const titleLineRuns = [
    run(entry.credential, { size: SIZE.titleLine, bold: true }),
  ];
  if (entry.honors) {
    titleLineRuns.push(run(`, ${entry.honors}`, { size: SIZE.titleLine }));
  }
  titleLineRuns.push(run(` — ${entry.dates}`, { size: SIZE.titleLine }));
  entryParas.push({
    spacing: { before: 0, after: 60 },
    children: titleLineRuns,
  });

  // Optional context
  if (entry.context) {
    entryParas.push({
      spacing: { before: 0, after: 80 },
      children: [run(entry.context, { size: SIZE.context, italics: true })],
    });
  }

  // Detail bullets. bulletChildren() accepts either a plain string or an
  // array of {text, url?} segments, so a presentation line can link its
  // title to the matching /projects page on malxavi.com.
  entry.details.forEach((detail) => {
    entryParas.push({
      spacing: { before: 0, after: 40 },
      bullet: { level: 0 },
      indent: { left: convertInchesToTwip(0.2) },
      children: bulletChildren(detail),
    });
  });

  pushKeptTogether(children, entryParas);
});

// — CASE STUDIES section
//   Each entry: linked title (bold, companyHeader size) + body text.
//   No CTA — the underlined title carries the affordance.
children.push(sectionHeader("Case Studies", { keepNext: true }));

CASE_STUDIES.forEach((study, idx) => {
  const beforeEntry = idx === 0 ? 0 : 200;
  const entryParas = [];

  entryParas.push({
    spacing: { before: beforeEntry, after: 60 },
    children: [
      linkRun(study.title, study.url, {
        size: SIZE.companyHeader,
        bold: true,
      }),
    ],
  });

  entryParas.push({
    spacing: { before: 0, after: 40 },
    children: [run(study.description, { size: SIZE.body })],
  });

  pushKeptTogether(children, entryParas);
});

// ─── Page header (pages 2+) ────────────────────────────────────────
// Print resilience: if the resume gets printed and the pages are
// physically separated, page 2+ still carries identifying info.
// Page 1 has the full hero (name, headline, contact, summary) in
// the body, so it doesn't need this header — `titlePage: true` on
// the section properties below suppresses the default header on
// page 1.
//
// ATS note: ATS that skip page headers will miss this block, but
// every piece of contact info AND the headline is also present in
// the page-1 body — so ATS extraction is unaffected.

// Header sizes, smaller than body so the header reads as
// secondary chrome rather than competing with content.
const HEADER_SIZE = {
  name: 20, // 10pt
  headline: 18, // 9pt
  contact: 18, // 9pt
};

function headerRun(text, opts = {}) {
  return new TextRun({
    text,
    font: FONT,
    color: COLOR.black,
    size: opts.size ?? HEADER_SIZE.contact,
    bold: opts.bold ?? false,
    italics: opts.italics ?? false,
  });
}

function headerLink(text, url) {
  return new ExternalHyperlink({
    link: url,
    children: [
      new TextRun({
        text,
        font: FONT,
        color: COLOR.link,
        size: HEADER_SIZE.contact,
        underline: { type: "single", color: COLOR.link },
      }),
    ],
  });
}

function headerSep() {
  return headerRun(" · ");
}

const pageHeader = new Header({
  children: [
    new Paragraph({
      spacing: { before: 0, after: 0 },
      children: [
        headerRun(CONTACT.name, { size: HEADER_SIZE.name, bold: true }),
      ],
    }),
    new Paragraph({
      spacing: { before: 0, after: 0 },
      children: [
        headerRun(CONTACT.headline, {
          size: HEADER_SIZE.headline,
          italics: true,
        }),
      ],
    }),
    new Paragraph({
      spacing: { before: 40, after: 80 },
      border: {
        bottom: {
          color: COLOR.black,
          space: 4,
          style: BorderStyle.SINGLE,
          size: 4, // 0.5pt thin rule under the header block
        },
      },
      children: [
        headerLink(CONTACT.email, `mailto:${CONTACT.email}`),
        headerSep(),
        headerLink(
          CONTACT.phone,
          `tel:${CONTACT.phone.trim().startsWith("+") ? CONTACT.phone.replace(/[^0-9+]/g, "") : "+1" + CONTACT.phone.replace(/[^0-9]/g, "")}`,
        ),
        headerSep(),
        headerRun(CONTACT.location),
        headerSep(),
        headerLink("LinkedIn", CONTACT.linkedinUrl),
        headerSep(),
        headerLink("GitHub", CONTACT.githubUrl),
        headerSep(),
        headerLink("Personal Website", CONTACT.websiteUrl),
      ],
    }),
  ],
});

// ─── Document assembly ────────────────────────────────────────────

const doc = new Document({
  creator: CONTACT.name,
  title: `${CONTACT.name} Resume`,
  description: DOC_DESCRIPTION,
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
        // titlePage enables a different (or empty) first-page
        // header. We provide only `default` below, so page 1 gets
        // no header and pages 2+ get the header above.
        titlePage: true,
        page: {
          size: {
            orientation: PageOrientation.PORTRAIT,
            width: PAGE_SIZE.width,
            height: PAGE_SIZE.height,
          },
          margin: {
            top: convertInchesToTwip(0.5),
            right: convertInchesToTwip(0.5),
            bottom: convertInchesToTwip(0.5),
            left: convertInchesToTwip(0.5),
          },
        },
      },
      headers: {
        default: pageHeader,
      },
      children,
    },
  ],
});

// ─── Write to disk ────────────────────────────────────────────────

const outPath = resolve(process.cwd(), OUT_PATH);
mkdirSync(dirname(outPath), { recursive: true });

const buf = await Packer.toBuffer(doc);
writeFileSync(outPath, buf);

console.log(`✓ Wrote ${outPath} (${(buf.length / 1024).toFixed(1)} KB)`);
