// ─────────────────────────────────────────────────────────────────
// build-bullet-bank-docx.mjs
//
// Generates an editable .docx of Malcolm's full "bullet bank" — the
// master list of role-by-role bullet ideas he draws from when
// tailoring a resume to a specific application. The bank intentionally
// holds far more bullets per role than any single resume should ship;
// the user picks-and-chooses per submission.
//
// Output: public/resume/malcolm-xavier-bullet-bank-template.docx
//
// Workflow mirrors the resume:
//   1. npm run bullet-bank:docx
//   2. Upload to Google Drive, Open with → Google Docs
//   3. For each application: copy → trim → tailor → export
//
// Source of truth: _private/_source/malcolm-xavier-bullet-bank.pdf
// (the original Google Docs export). This script ports that content
// into the same visual language as the resume .docx so both feel like
// they came out of the same system.
//
// Style is copied wholesale from scripts/build-resume-docx.mjs:
//   • DM Sans throughout, all-black palette
//   • 22pt name, 12pt company headers, 10.5pt body
//   • Bold company headers, italic context lines, • bullets
//   • Hyperlinks for company names (where a public URL exists) + contact
//   • Bold-the-impact treatment for metric phrases inside bullets
//   • titlePage: true → page-2+ get a compact running header
//
// Dual source of truth, same as the resume — no shared module yet
// because the constants are tiny and the two artifacts evolve at
// different cadences.
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
import { z } from "zod";

// ─── Schemas ──────────────────────────────────────────────────────
// Defensive parse before document construction so a malformed entry
// surfaces with a clear zod error pointing at the bad field, rather
// than crashing inside docx with a stack trace from deep in the
// rendering pipeline. Mirrors build-resume-docx.mjs's schemas with
// two bullet-bank-specific differences:
//   • RoleSchema includes `titleUrl` (used by the freelance Prompt
//     Engineer role where the title links to DataAnnotation rather
//     than a company URL).
//   • EducationSchema uses `institutionUrl` (not `url`) to match the
//     bullet bank's verbose key naming, and requires `details` to
//     have at least one entry (an education entry without details
//     would render as a bare credential line, which reads broken).

const SegmentSchema = z.object({
  text: z.string(),
  bold: z.boolean().optional(),
  url: z.string().url().optional(),
});

const BulletSchema = z.union([z.string(), z.array(SegmentSchema).min(1)]);

const ContextSegmentSchema = z.object({
  text: z.string(),
  url: z.string().url().optional(),
});

const RoleSchema = z.object({
  company: z.string().min(1),
  url: z.string().url().optional(),
  titleUrl: z.string().url().optional(),
  location: z.string().min(1).optional(),
  title: z.string().min(1),
  dates: z.string().min(1),
  context: z.string().optional(),
  contextSegments: z.array(ContextSegmentSchema).optional(),
  // .min(1) symmetric with EducationSchema.details below — a role
  // with zero bullets renders as a title-only entry, which reads
  // as broken the same way an empty education entry does.
  bullets: z.array(BulletSchema).min(1),
});

const EducationSchema = z.object({
  institution: z.string().min(1),
  institutionUrl: z.string().url().optional(),
  location: z.string().min(1),
  dates: z.string().min(1),
  credential: z.string().min(1),
  honors: z.string().optional(),
  details: z.array(z.string()).min(1),
});

const ContactSchema = z.object({
  name: z.string().min(1),
  headline: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(1),
  location: z.string().min(1),
  linkedin: z.string().min(1),
  linkedinUrl: z.string().url(),
});

// ─── Content ──────────────────────────────────────────────────────
// Hardcoded port of _private/_source/malcolm-xavier-bullet-bank.pdf,
// cleaned up for typography (PDF text-extraction left "ﬁ" ligatures,
// odd line-break splits, and one minor spelling artifact). Voice
// rules applied throughout: "and" not "&", Oxford comma always,
// em-dashes without spaces.

const CONTACT = {
  name: "Malcolm Xavier",
  // Headline mirrors the resume .docx so the two artifacts read as
  // siblings (`scripts/build-resume-docx.mjs` HEADLINE constant). The
  // PDF source had a two-line title + tagline treatment; collapsed
  // here to match the resume's single-line positioning.
  headline:
    "Senior Product Manager · Growth and Data Platform · Media, Publishing, and Streaming · AI-Native",
  email: "malcolm@malxavi.com",
  phone: "(774) 262-2606",
  location: "Los Angeles, CA",
  linkedin: "linkedin.com/in/malxavi",
  linkedinUrl: "https://www.linkedin.com/in/malxavi/",
};

const SUMMARY =
  "Senior Product Manager with 7+ years scaling growth, experimentation, and data platforms across consumer and B2B SaaS products. Built and operated growth infrastructure for 22M+ users across 40+ brands, driving 33% YoY email revenue growth. Applied MS in Law (focused on data privacy and IP) to data governance and compliance-related roadmap tradeoffs. Operationalized AI-native discovery/delivery loops, including roadmapping, outcome measurement, and documentation.";

// Each role mirrors the resume script's shape:
//   { company, url?, location?, title, dates, context?, bullets[] }
// Bullets are either plain strings (single TextRun) OR arrays of
// { text, bold?, url? } segments — segments allow inline bold spans
// so metric phrases bold inside an otherwise plain bullet, matching
// the resume's <strong>-the-impact convention.
//
// Order follows the source PDF exactly. Bullet copy is verbatim from
// the source except for typography fixes (ligatures, broken hyphenation,
// and "&" → "and" per Malcolm's voice rules).
const ROLES = [
  {
    company: "Freelance",
    title: "Prompt Engineer (via DataAnnotation.tech)",
    titleUrl: "https://www.dataannotation.tech",
    dates: "Sep 2023 – Present",
    bullets: [
      "Train LLM models (GPT-5, Gemini 2.5 Pro, etc.) across various agentic, RAG use cases",
      "Write prompts, criteria, and rubrics; and evaluate responses across various legal topics",
      "Review, evaluate, and revise the work of other freelancers to ensure proper model training",
    ],
  },
  {
    company: "People Inc. (previously Dotdash Meredith)",
    url: "https://people.inc",
    location: "Remote",
    title: "Senior Product Manager, Audience Relationships",
    dates: "Feb 2024 – Oct 2025",
    bullets: [
      "Managed shared audience and engagement growth platform for network of 40+ brands",
      "Built reusable lifecycle marketing strategies/systems to drive personalization experiences",
      [
        { text: "Grew " },
        { text: "email revenue 33% YoY", bold: true },
        { text: " with reusable components and lifecycle marketing playbooks" },
      ],
      [
        { text: "Established new " },
        { text: "$2.2M+ annual revenue channel", bold: true },
        { text: " by supporting launch of user commenting" },
      ],
      "Partnered with data, marketing, and editorial leadership to design strategic experiments",
      "Operationalized experiments, including audience targeting and outcome measurement",
      "Built models using SQL, BigQuery, and Connected Sheets to identify achievable outcomes",
      "Facilitated 80+ member community of practice focused on product discovery skills",
      "Balanced solutions and analyzed releases for impacts on site speed and ad performance",
      "Collaborated with brand, privacy, and legal teams to ensure compliant user experiences",
      [
        { text: "Partnered with data science and operations to scale recipe recommendation service and " },
        { text: "2x traffic", bold: true },
      ],
      "Migrated newsletter and sweepstakes experiences to new shared growth platform",
      "Scaled onsite email and print marketing platforms to enable better targeted marketing strategies",
      [
        { text: "Enabled onsite transactions to " },
        { text: "increase print subscription revenue 115% YoY", bold: true },
      ],
      "Orchestrated collaboration between SEO, CMS, platform, and ads teams to scale growth platform",
      "Liaised with DataOps to ensure proper dataflow across MarTech stack and growth platform",
      "Partnered with DesignOps to ensure design cohesion across multiple digital properties and surfaces",
      "Developed and operationalized brand-specific growth strategies and tactics",
      "Built dashboards in Looker to monitor and report on health of newsletter programs network-wide",
    ],
  },
  {
    company: "Muck Rack",
    url: "https://muckrack.com",
    location: "Remote",
    title: "Technical Product Manager, Content, Data Ingestion",
    dates: "Sep 2022 – Feb 2024",
    bullets: [
      "Managed backend content platform, including ETL, and supporting internal tools",
      "Managed performance/costs of content/data detection, ingestion, processing, and storage",
      "Led initiative to decompose the platform monolith for content and data ETL",
      "Enabled 6 timely, accurate, and high-quality content delivery services",
      [
        { text: "Backfilled content and data to achieve a " },
        { text: "500% increase in historical coverage", bold: true },
      ],
      [
        { text: "Increased average daily ingestion of article content by " },
        { text: "350% (950K to 3.3M) YoY", bold: true },
      ],
      [
        { text: "Improved core AI (machine learning) model accuracy, " },
        { text: "reducing parsing errors by 45% YoY", bold: true },
      ],
      "Served as product team liaison on contract negotiations with third party content/data partners",
      "Collaborated with partnerships, legal, and GTM to establish strategy for content and data solutions",
      "Improved evergreen content ETL to scale improve data accuracy in user reporting features",
      "Liaised with third party article content provider to ingest new content circulation metrics",
      "Liaised with third party international broadcast content provider and licensors to ensure compliance",
      "Installed content processing rate limiting to improve content processing predictability and stability",
      "Enabled ingestion of broadcast content from multiple providers to increase coverage",
      "Established standard evaluation process for broadcast content providers to scale procurement",
      "Enabled search and reporting teams by implementing critical content/data processes and features",
      "Partnered with data science team to implement content and data enrichment models (AI/ML)",
    ],
  },
  {
    company: "Freelance",
    title: "Consultant",
    dates: "Aug 2022 – Oct 2022",
    bullets: [
      // NEFA stays clickable as a segment-with-url; matches the resume's
      // contextSegments treatment for the same engagement.
      [
        { text: "Created content marketing strategy for " },
        {
          text: "New England Foundation for the Arts",
          url: "https://www.nefa.org",
        },
      ],
      "Developed analytics system architecture, data strategy, and dashboards for a private client",
      "Leveraged PM expertise to provide holistic consultation on specific business operations",
    ],
  },
  {
    company: "Artist Growth",
    url: "https://www.artistgrowth.com",
    location: "Remote",
    title: "Product Manager",
    dates: "Mar 2022 – May 2022",
    bullets: [
      "Drafted user stories and product requirement documents for web and mobile applications",
      "Launched feature request and bug report processes via integrations with Asana and Slack",
      "Performed heuristic analysis of marketing site and presented findings to leadership team",
      "Prospected various tools for the organization, and procured Productboard, Mode, Mixpanel",
      "Initiated organization-wide investigation to achieve GDPR and CCPA compliance",
    ],
  },
  {
    company: "User Interviews",
    url: "https://www.userinterviews.com",
    location: "Remote",
    title: "Product Manager",
    dates: "Sep 2020 – Feb 2022",
    bullets: [
      "Managed two-sided marketplace between researchers and research participants",
      [
        { text: "Implemented participant targeting features that " },
        { text: "improved key marketplace metric by 15%", bold: true },
      ],
      "Designed, analyzed, and reported on A/B tests for email notification system model updates",
      "Built SQL queries and dashboards in Mode to monitor/report on marketplace operations",
      "Outlined tracking requirements for each solution to enable reporting on relevant outcomes",
      "Enabled users to theme and templatize emails sent by our system on their behalf",
      "Led update to product pricing, including onsite creative and purchase flow",
      "Enabled researchers to target professional participants using seniority and skills via BLS integration",
      [
        { text: "Iterated on workflow for re-recruiting past participants, leading to a " },
        { text: "135% increase in usage", bold: true },
      ],
    ],
  },
  {
    company: "Fullstack Academy (and Grace Hopper Academy)",
    url: "https://www.fullstackacademy.com",
    location: "New York, NY",
    title: "Admissions Lead, Project Manager",
    dates: "Jun 2018 – Feb 2020",
    bullets: [
      [
        { text: "Generated " },
        { text: "$30M+ annual revenue (170% increase, YoY)", bold: true },
        { text: " by operationalizing enrollment" },
      ],
      "Partnered with engineering to optimize integrations, automations, and system architecture",
      "Monitored automation performance and API usage to ensure dataflow for 5k applicants, annually",
      "Defined and analyzed success metrics for all enrollment processes",
      "Built enrollment dashboards in HubSpot to increase internal business performance transparency",
      "Trained and managed ~40 rotating contract technical interviewers as part of enrollment operations",
      "Performed code review for all applicants in HackerRank",
    ],
  },
  {
    company: "Fractured Atlas",
    url: "https://www.fracturedatlas.org",
    location: "New York, NY",
    title: "Program Associate",
    dates: "Mar 2014 – Oct 2017",
    bullets: [
      "Tracked and reported on user analytics as inputs for roadmap prioritization",
      "Conducted quality assurance testing of new features and bug fixes",
      "Led focus groups to establish product vision for Fractured Atlas's new crowdfunding platform",
      "Ideated and produced podcast with Createquity to establish institutional thought leadership",
      "Led team that orchestrated New York-based educational events, expanding them into the Bronx",
      "Gave various educational presentations to users on programs, in-person and via GoToWebinar",
      "Consulted users on grant funding applications to increase revenue generated from grant awards",
      "Consulted users on overall fundraising efforts to increase revenue from fiscal sponsorship",
      "Assisted artists in applying for and managing liability insurance to protect their work and operations",
      "Liaised between artists and liability insurance brokers' office to secure effective liability insurance",
      "Wrote visa letters of consultation to include in petitions to USCIS on behalf of international artists",
      "Supported artists in using ticketing and CRM system to manage their fundraising events and shows",
      "Helped artists navigate venue listings site to secure rehearsal, performance, and gallery space",
      "Profiled artists for Medium blog to increase awareness of their work and drive additional fundraising",
    ],
  },
];

const EDUCATION = [
  {
    institution: "Northwestern University Pritzker School of Law",
    institutionUrl: "https://www.law.northwestern.edu",
    location: "Chicago, IL",
    dates: "Sep 2021 – May 2023",
    credential: "Master of Science in Law",
    honors: "Honors",
    details: [
      "Teaching Assistant: Negotiations Skills and Strategies; Professor Lynn Cohn",
      "Relevant Courses: Privacy Law and Regulation, IP Strategy and Management",
      'Presentation: "The Revolution Will Not Be Live Streamed: Privacy Law in the Social Media Era"',
    ],
  },
  {
    institution: "Correlation One Data Science For All (DS4A)",
    institutionUrl: "https://www.correlation-one.com",
    location: "Online",
    dates: "Oct 2020 – Mar 2021",
    credential: "Data Science Certificate",
    // "Johnson & Johnson" is a proper noun → "&" stays per voice rules.
    honors: "Honors · Johnson & Johnson Distinguished Scholar",
    details: [
      "Relevant Technologies: Python, Pandas, Jupyter Notebook, Google Data Studio",
      'Presentation: "Oceans Rise, Properties Fall"',
    ],
  },
  {
    institution: "Yandex Practicum",
    institutionUrl: "https://practicum.com",
    location: "Online",
    dates: "Mar 2020 – Sep 2020",
    credential: "Web Development Certificate",
    details: [
      "Relevant Technologies: HTML, CSS, JavaScript, React, Node, Visual Studio Code, GitHub",
    ],
  },
];

// ─── Validate content ─────────────────────────────────────────────
// Run schemas before any document construction so a malformed entry
// surfaces with a clear zod error pointing at the bad field, rather
// than crashing inside docx with a stack trace from deep in the
// rendering pipeline.
ContactSchema.parse(CONTACT);
z.array(RoleSchema).parse(ROLES);
z.array(EducationSchema).parse(EDUCATION);

// ─── Style helpers ────────────────────────────────────────────────
// Copied from build-resume-docx.mjs so the bullet bank reads like a
// sibling artifact. If the resume's helpers ever drift, copy the new
// versions over here too.

const FONT = "DM Sans";

// Half-points, per docx convention. 21 = 10.5pt.
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

// All-black palette (no accent colors), matching the resume.
const COLOR = {
  black: "000000",
  link: "000000", // links are black + underlined; underline carries the affordance
};

/** Standard text run with our base font + black color. */
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

/** Hyperlinked run — black text + single underline. */
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

/** Separator " · " for contact / dates / honors lines. */
function sep() {
  return run(" · ", { size: SIZE.contact });
}

/**
 * Render a bullet's children, mirroring resume bulletChildren():
 *   - plain string → single TextRun
 *   - segment array → mixed bold/link TextRuns inline
 * Used to bold the metric phrases within a bullet so the impact reads
 * at a glance ("33% YoY", "$30M+ annual revenue") without bolding the
 * bare number alone.
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

// — Headline (single italic line, matches the resume .docx)
children.push(
  new Paragraph({
    spacing: { before: 0, after: 80 },
    children: [run(CONTACT.headline, { size: SIZE.headline, italics: true })],
  }),
);

// — Contact line: phone · email · LinkedIn · location
//   Order matches the source PDF (phone first); separators identical
//   to the resume so the docs feel like siblings.
children.push(
  new Paragraph({
    spacing: { before: 0, after: 240 },
    children: [
      linkRun(
        CONTACT.phone,
        `tel:${CONTACT.phone.trim().startsWith("+") ? CONTACT.phone.replace(/[^0-9+]/g, "") : "+1" + CONTACT.phone.replace(/[^0-9]/g, "")}`,
        { size: SIZE.contact },
      ),
      sep(),
      linkRun(CONTACT.email, `mailto:${CONTACT.email}`, {
        size: SIZE.contact,
      }),
      sep(),
      linkRun("LinkedIn", CONTACT.linkedinUrl, { size: SIZE.contact }),
      sep(),
      run(CONTACT.location, { size: SIZE.contact }),
    ],
  }),
);

// — Summary paragraph (no SUMMARY section header, matching the resume)
children.push(
  new Paragraph({
    spacing: { before: 0, after: 240 },
    children: [run(SUMMARY)],
  }),
);

// ─── Section header helper ────────────────────────────────────────
// Direct copy of the resume's sectionHeader: tracked-out caps, thin
// black bottom rule, optional keepNext to glue header to the entry
// that follows so a section never strands its title at page-bottom.
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
// Same approach as the resume: build an array of Paragraph CONFIGS,
// flag keepNext on every one except the last, then construct the
// Paragraph instances. Result: docx treats the entry as one block
// and won't split it across pages.
//
// Bullet-bank caveat: some roles have 15+ bullets. If the resulting
// block is taller than a single page, docx will break inside it —
// keepNext only prevents page-breaks BEFORE a paragraph, not within.
// That's acceptable here; the bank is a working document, not a
// printed deliverable.
function pushKeptTogether(targetArray, paragraphConfigs) {
  paragraphConfigs.forEach((config, i) => {
    if (i < paragraphConfigs.length - 1) {
      config.keepNext = true;
    }
    targetArray.push(new Paragraph(config));
  });
}

// — WORK EXPERIENCE section.
//   Section header is keepNext so it can't sit alone at page bottom.
children.push(sectionHeader("Work Experience", { keepNext: true }));

ROLES.forEach((role, idx) => {
  const beforeRole = idx === 0 ? 0 : 200;
  const entryParas = [];

  // Company line: linked company name (when a public URL exists) +
  // optional " — Location" suffix.
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

  // Title line: bold title + " — Dates". Title can be linked too
  // (e.g. the DataAnnotation Prompt Engineer freelance role uses
  // titleUrl since the company itself is "Freelance").
  const titleLineRuns = [
    role.titleUrl
      ? linkRun(role.title, role.titleUrl, {
          size: SIZE.titleLine,
          bold: true,
        })
      : run(role.title, { size: SIZE.titleLine, bold: true }),
    run(` — ${role.dates}`, { size: SIZE.titleLine }),
  ];
  entryParas.push({
    spacing: { before: 0, after: 60 },
    children: titleLineRuns,
  });

  // Optional context — same support as resume even though no current
  // bullet-bank role uses it; keeps the shape symmetric for future
  // edits.
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

  // Bullets — bulletChildren() handles plain-string vs segment-array
  // shapes, so metric phrases bold inline.
  role.bullets.forEach((bullet) => {
    entryParas.push({
      spacing: { before: 0, after: 40 },
      bullet: { level: 0 },
      indent: { left: convertInchesToTwip(0.2) },
      children: bulletChildren(bullet),
    });
  });

  pushKeptTogether(children, entryParas);
});

// — EDUCATION section
children.push(sectionHeader("Education", { keepNext: true }));

EDUCATION.forEach((entry, idx) => {
  const beforeEntry = idx === 0 ? 0 : 200;
  const entryParas = [];

  // Institution + optional location
  entryParas.push({
    spacing: { before: beforeEntry, after: 0 },
    children: [
      entry.institutionUrl
        ? linkRun(entry.institution, entry.institutionUrl, {
            size: SIZE.companyHeader,
            bold: true,
          })
        : run(entry.institution, { size: SIZE.companyHeader, bold: true }),
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

  // Detail bullets
  entry.details.forEach((detail) => {
    entryParas.push({
      spacing: { before: 0, after: 40 },
      bullet: { level: 0 },
      indent: { left: convertInchesToTwip(0.2) },
      children: [run(detail, { size: SIZE.bullet })],
    });
  });

  pushKeptTogether(children, entryParas);
});

// ─── Page header (pages 2+) ────────────────────────────────────────
// Print resilience: with 4 pages of bullets, separated printouts
// still need to identify themselves. titlePage: true on the section
// suppresses this on page 1 (which has the full hero + summary).
//
// Compact running header — name + headline + contact strip, smaller
// than body so it reads as chrome.

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
          size: 4, // 0.5pt rule
        },
      },
      children: [
        headerLink(
          CONTACT.phone,
          `tel:${CONTACT.phone.trim().startsWith("+") ? CONTACT.phone.replace(/[^0-9+]/g, "") : "+1" + CONTACT.phone.replace(/[^0-9]/g, "")}`,
        ),
        headerSep(),
        headerLink(CONTACT.email, `mailto:${CONTACT.email}`),
        headerSep(),
        headerLink("LinkedIn", CONTACT.linkedinUrl),
        headerSep(),
        headerRun(CONTACT.location),
      ],
    }),
  ],
});

// ─── Document assembly ────────────────────────────────────────────

const doc = new Document({
  creator: CONTACT.name,
  title: `${CONTACT.name} Bullet Bank`,
  description: "Master list of resume bullets, organized by role",
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
        // titlePage suppresses the running header on page 1 (which
        // already has the full hero in the body). Pages 2+ get the
        // compact header defined above.
        titlePage: true,
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
      headers: {
        default: pageHeader,
      },
      children,
    },
  ],
});

// ─── Write to disk ────────────────────────────────────────────────

const outPath = resolve(
  process.cwd(),
  "public/resume/malcolm-xavier-bullet-bank-template.docx",
);
mkdirSync(dirname(outPath), { recursive: true });

const buf = await Packer.toBuffer(doc);
writeFileSync(outPath, buf);

console.log(`✓ Wrote ${outPath} (${(buf.length / 1024).toFixed(1)} KB)`);
