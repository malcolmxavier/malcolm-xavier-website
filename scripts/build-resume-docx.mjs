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
// Reviewing a tailored cut:
//   RESUME_VARIANT=<variant> RESUME_DIFF=1 npm run resume:docx
//   writes a second, clearly-named file with every change marked in the
//   text — see "Review copy" below.
//
// Trial builds:
//   RESUME_OUT_DIR=<folder> sends any build to that folder under its
//   usual name, so a check never overwrites a copy already reviewed or
//   sent — see "Variant overlay" and the output path below.
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
import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, dirname, join, basename, relative } from "node:path";
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
  // Optional subsection header printed above this role. See the
  // EXPERIENCE section for what it is for.
  sectionBreak: z.string().min(1).optional(),
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
  // The three profile links are optional so a variant can leave them off.
  // A cut aimed outside the software industry has no use for a GitHub
  // link, and a portfolio site arguing a different career works against
  // the document it is printed on. The canonical contact block supplies
  // all three, so the default build is unchanged.
  website: z.string().min(1).optional(),
  websiteUrl: z.string().url().optional(),
  linkedin: z.string().min(1).optional(),
  linkedinUrl: z.string().url().optional(),
  github: z.string().min(1).optional(),
  githubUrl: z.string().url().optional(),
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
  "Senior Product Manager with 7+ years scaling growth, marketing, and data platforms in media, publishing, and B2B SaaS. Built and operated MarTech infrastructure for 22M+ users across 40+ brands, driving 33% YoY email revenue growth. Applied an MS in Law (focused on data privacy and IP) to data governance and compliance-related roadmap tradeoffs. Architects AI-native discovery and delivery loops, with three years of hands-on LLM and agent training and evaluation.";

// Each role: company, optional company URL, location, title, dates,
// context (string OR array of {text, url?} segments via contextSegments),
// bullets (each entry is either a plain string OR an array of
// {text, bold?, url?} segments — segments allow inline bold/link spans
// so metric phrases bold inside an otherwise plain bullet sentence).
//
// Every role and every bullet also carries a short, stable id (`people`,
// `people-email-revenue`). Nothing prints it. It exists so a tailored cut
// can point at a bullet by name ("swap this one", "drop that one") instead
// of retyping the whole role — see "Variant overlay" below. Treat an id
// as permanent once a cut uses it: renaming one breaks every cut that
// points at it, loudly, at build time.
const CANONICAL_ROLES = [
  {
    // Consolidated practice entry — mirrors the site's Malcolm Xavier
    // Consulting role (replaces the former Freelance / Prompt Engineer
    // and Independent Consulting entries). Org names are linked but not
    // bold: the docx reserves bold for metric phrases, so an
    // engagement list with no hero metrics carries no bold runs.
    id: "consulting",
    company: "Malcolm Xavier Consulting",
    // Remote-only for the practice; matches the site. LA stays on the
    // top-level contact block, not the role.
    location: "Remote",
    title: "Principal Consultant",
    dates: "Feb 2022 – Present",
    context:
      "Independent product, data, and content-strategy practice—growth systems, MarTech and customer data platforms, privacy-aware data governance, AI-native operations, and AI training and evaluation.",
    bullets: [
      { id: "consulting-own-products", text: [
        { text: "Build and operate the " },
        { text: "AI-native system", url: "https://malxavi.com/booth" },
        { text: " I plan and ship my work from, on Claude Code: one prioritized day across six workstreams, scheduled agents, and every automated write logged and reversible" },
      ] },
      { id: "consulting-privacy-rules", text: "Set the privacy rules for its automation: the jobs that can reach the internet can't reach personal data" },
      { id: "consulting-fleet", text: [
        { text: "Fleet", url: "https://www.fleetai.com" },
        { text: " (2026–present): AI training data—prompt development and change-logged sessions in simulated environments" },
      ] },
      { id: "consulting-dataannotation", text: [
        { text: "DataAnnotation", url: "https://www.dataannotation.tech" },
        { text: " (2023–2026): LLM and agent evaluation—prompts, including adversarial ones, plus criteria, rubrics, response grading, and peer review" },
      ] },
      { id: "consulting-artist-growth", text: [
        { text: "Artist Growth", url: "https://www.artistgrowth.com" },
        { text: " (2022): product operations and GDPR/CCPA compliance for music-industry SaaS" },
      ] },
    ],
  },
  {
    id: "people",
    company: "People Inc.",
    url: "https://people.inc",
    location: "Remote",
    title: "Senior Product Manager, Audience Relationships",
    dates: "Feb 2024 – Oct 2025",
    context:
      "“America's largest publisher” (formerly Dotdash Meredith). Scaled growth/MarTech platform for a network of 40+ brands and 22M+ users.",
    bullets: [
      { id: "people-email-revenue", text: [
        { text: "Grew email revenue 33% YoY", bold: true },
        { text: " with reusable components and lifecycle marketing playbooks" },
      ] },
      { id: "people-recipes", text: [
        { text: "Partnered with data science to scale a recipe recommendation service and drive " },
        { text: "2x traffic", bold: true },
      ] },
      { id: "people-newsletter-program", text: [
        { text: "Introduced a content-specific newsletter program with " },
        { text: "3x open rates and 2x user LTV", bold: true },
      ] },
      { id: "people-experiments", text: "Operationalized experiments to enable AI-based personalized acquisition and engagement" },
      { id: "people-sql-models", text: "Built models in SQL, BigQuery, and Connected Sheets to identify achievable outcomes that informed the AI-based personalization strategy" },
    ],
    caseStudy: {
      title: "Infrastructure enables personalization",
      url: "https://malxavi.com/case-studies/people-inc",
    },
  },
  {
    id: "muckrack",
    company: "Muck Rack",
    url: "https://muckrack.com",
    location: "Remote",
    title: "Technical Product Manager, Content and Data Ingestion",
    dates: "Sep 2022 – Feb 2024",
    context:
      "SaaS reporting tool for PR professionals. Scaled the content platform; enabled search and monitoring features.",
    bullets: [
      { id: "muckrack-ingestion", text: [
        { text: "Scaled ingestion 350% YoY", bold: true },
        { text: ", enabling downstream ML classification, search, and reporting" },
      ] },
      { id: "muckrack-parsing", text: [
        { text: "Improved core AI/ML model accuracy, " },
        { text: "reducing parsing errors by 45% YoY", bold: true },
      ] },
      { id: "muckrack-backfill", text: [
        { text: "Backfilled content and data to achieve a " },
        { text: "500% increase in historical coverage", bold: true },
      ] },
      { id: "muckrack-monolith", text: "Led the initiative to decompose the ingestion monolith, improving ETL cost, scalability, and reliability" },
      { id: "muckrack-vendors", text: "Liaised with external content vendors and developers to ensure data-processing compliance" },
    ],
    caseStudy: {
      title: "Data platforms: quality over quantity",
      url: "https://malxavi.com/case-studies/muck-rack",
    },
  },
  {
    id: "userinterviews",
    company: "User Interviews",
    url: "https://www.userinterviews.com",
    location: "Remote",
    title: "Product Manager",
    dates: "Sep 2020 – Feb 2022",
    context:
      "SaaS UXR tool and marketplace for researchers and participants. Led core and platform teams.",
    bullets: [
      { id: "userinterviews-re-recruitment", text: [
        { text: "Improved marketplace management by driving a " },
        { text: "135% increase in participant re-recruitment", bold: true },
      ] },
      { id: "userinterviews-targeting", text: [
        { text: "Implemented targeting features that " },
        { text: "improved core marketplace fulfillment metric by 15%", bold: true },
      ] },
      { id: "userinterviews-ab-tests", text: "Designed, analyzed, and reported on A/B tests for email-notification system model updates" },
      { id: "userinterviews-mode-dashboards", text: "Built SQL queries and dashboards in Mode to monitor and report on marketplace operations" },
    ],
    caseStudy: {
      title: "Steering leading indicators",
      url: "https://malxavi.com/case-studies/user-interviews",
    },
  },
  {
    id: "fullstack",
    company: "Fullstack Academy",
    url: "https://www.fullstackacademy.com",
    location: "New York, NY",
    title: "Admissions Lead, Project Manager",
    dates: "Jun 2018 – Feb 2020",
    context:
      "Web-development bootcamp (and The Grace Hopper Program). Scaled and optimized the enrollment system to exceed growth targets.",
    bullets: [
      { id: "fullstack-revenue", text: [
        { text: "Generated " },
        { text: "$30M+ in annual revenue (170% YoY increase)", bold: true },
        { text: " by scaling enrollment" },
      ] },
      { id: "fullstack-integrations", text: "Partnered with engineering to optimize integrations, automations, and system architecture" },
    ],
  },
  {
    id: "fracturedatlas",
    company: "Fractured Atlas",
    url: "https://www.fracturedatlas.org",
    location: "New York, NY",
    title: "Program Associate",
    dates: "Mar 2014 – Oct 2017",
    context:
      "SaaS arts-administration tool. Provided administrative support to end users.",
    bullets: [
      { id: "fracturedatlas-analytics", text: "Tracked and reported on user analytics as inputs for roadmap prioritization" },
      { id: "fracturedatlas-qa", text: "Conducted quality-assurance testing of new features and bug fixes" },
    ],
  },
];

const CANONICAL_EDUCATION = [
  {
    id: "northwestern",
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
    id: "ds4a",
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
    id: "yandex",
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
// that exports only what it changes rather than a second copy of this
// script. Set RESUME_VARIANT to the module's path:
//
//   RESUME_VARIANT=scripts/resume-variants/<variant>.mjs npm run resume:docx
//
// The variant modules themselves stay out of this repo: it is public, and
// a file named for the employer a cut was tailored to would publish the
// application. Same reasoning as the output path below. The named cuts
// they build on (see "Building on a named cut") live beside them in
// scripts/resume-variants/_bases/, out of the repo for the same reason:
// they hold tailored wording too.
//
// Anything the variant doesn't change falls through to the canonical
// content above, and with the variable unset the output is byte-for-byte
// what it has always been — the default path stays the default path.
// A variant may also set OUT_PATH to keep a one-off out of
// public/resume/, which is published with the site.
//
// ── Building on a named cut ──────────────────────────────────────
// Most cuts are the canonical resume with a handful of bullets swapped,
// dropped, or reordered, and several cuts share the same handful. So a
// variant can name a BASE (another cut it builds on) and list only its
// own changes, instead of retyping every role to change one bullet.
// Every canonical role, bullet, and education entry above carries a
// short id for exactly this ("people", "people-email-revenue"), so a
// change points at a bullet by name rather than by position.
//
// A cut is assembled in layers: the canonical content first, then each
// base in the chain, then the variant itself, each layer changing only
// what it names. A layer may export any of:
//
//   BASE               the cut it builds on: a file in the _bases/ folder
//                      beside the variant ("growth" is _bases/growth.mjs).
//                      Leave it out to build on the canonical resume.
//   BULLETS            new bullet wording, each under a new id. Written
//                      once here, then placed anywhere by that id, by this
//                      layer or by any cut built on top of it.
//   ROLE_EDITS         per role id, what changes: any role field (context,
//                      title, caseStudy, and so on; null removes it), plus
//                      the role's bullets, using the list verbs below.
//   DROP_ROLES         role ids to leave out entirely.
//   CONTACT_EDITS      contact fields to change, usually just the headline.
//   EDUCATION_ENTRIES  new education entries, each under a new id.
//   EDUCATION_EDITS    changes to the education list, same list verbs.
//   CONTACT, SUMMARY, ROLES, EDUCATION, CASE_STUDIES, OUT_PATH,
//   DOC_DESCRIPTION, PAGE_SIZE
//                      a whole block, replaced outright, exactly as before.
//                      A cut that is genuinely a different document (the
//                      one-page hospitality cut) keeps working this way.
//
// The list verbs, for a role's bullets or for the education list:
//
//   bullets / entries  the complete list, in order, by id: for a reorder
//   swap               { oldId: newId }: one item takes another's place
//   remove             [ids]: take these out
//   insert             [{ after: id, add: [ids] }], or before: id, or
//                      at: "start" / at: "end"
//
// They apply in that order. For example, a cut that keeps its base but
// drops two Muck Rack bullets and adds a pricing line at User Interviews:
//
//   export const BASE = "data";
//   export const ROLE_EDITS = {
//     muckrack: { remove: ["muckrack-evaluation", "muckrack-vendors"] },
//     userinterviews: {
//       insert: [{ after: "userinterviews-ab-tests", add: ["userinterviews-pricing"] }],
//     },
//   };
//
// An id that does not exist, an id declared twice, or an export this
// script does not know stops the build with a message naming it. A typo
// that quietly built the wrong document would be the worst outcome here,
// because the document looks finished either way.

const variantPath = process.env.RESUME_VARIANT;

// Every export a layer may carry. Anything else is almost certainly a
// misspelling (ROLE_EDIT for ROLE_EDITS) that would otherwise be ignored.
const LAYER_EXPORTS = new Set([
  "BASE",
  "BULLETS",
  "ROLE_EDITS",
  "DROP_ROLES",
  "CONTACT_EDITS",
  "EDUCATION_ENTRIES",
  "EDUCATION_EDITS",
  "CONTACT",
  "SUMMARY",
  "ROLES",
  "EDUCATION",
  "CASE_STUDIES",
  "OUT_PATH",
  "DOC_DESCRIPTION",
  "PAGE_SIZE",
]);
// Whole blocks a layer replaces outright. ROLES and EDUCATION are handled
// separately, because the rest of the assembly works on their ids.
const WHOLE_BLOCKS = [
  "CONTACT",
  "SUMMARY",
  "CASE_STUDIES",
  "OUT_PATH",
  "DOC_DESCRIPTION",
  "PAGE_SIZE",
];
// Role fields a ROLE_EDITS entry may set directly.
const ROLE_FIELDS = new Set([
  "company",
  "url",
  "location",
  "title",
  "dates",
  "context",
  "contextSegments",
  "sectionBreak",
  "caseStudy",
]);
// The list verbs other than the complete-list form, which is named after
// the list it replaces (bullets, entries).
const LIST_VERBS = ["swap", "remove", "insert"];

// Stops the build, naming the variant or base file at fault.
function layerError(file, message) {
  throw new Error(
    `Resume variant ${relative(process.cwd(), file)}: ${message}`,
  );
}

// Finds the file behind a BASE name. A variant's bases live in _bases/
// beside it; a base that itself names a base looks in its own folder.
function baseFile(fromFile, name) {
  const dir = dirname(fromFile);
  const folder = basename(dir) === "_bases" ? dir : join(dir, "_bases");
  const file = join(folder, `${name}.mjs`);
  if (!existsSync(file)) {
    layerError(fromFile, `BASE "${name}" not found at ${relative(process.cwd(), file)}`);
  }
  return file;
}

// Loads a variant and every base beneath it. Returns them root first:
// the base the chain starts from, then each cut built on it, then the
// variant itself, which is the order they are applied in.
async function loadLayers(file, seen = []) {
  if (seen.includes(file)) layerError(file, "its BASE chain loops back on itself");
  const mod = await import(pathToFileURL(file).href);
  for (const name of Object.keys(mod)) {
    if (!LAYER_EXPORTS.has(name)) layerError(file, `unknown export ${name}`);
  }
  const below = mod.BASE
    ? await loadLayers(baseFile(file, mod.BASE), [...seen, file])
    : [];
  return [...below, { file, mod }];
}

// Copies an object with some fields changed. A field set to null is
// removed, which is how a cut drops, say, a role's case-study line.
function withFields(object, changes) {
  const out = { ...object };
  for (const [key, value] of Object.entries(changes)) {
    if (value === null) delete out[key];
    else out[key] = value;
  }
  return out;
}

// Applies the list verbs to a list of named items (a role's bullets, or
// the education entries) and returns the new list. `fullKey` is the name
// of the complete-list form, `lookup` turns an id into the item it names,
// and `fail` stops the build with the location already attached.
function editList(items, edits, { fullKey, lookup, fail }) {
  let out = items.slice();
  // Position of an item already in the list; pointing at one that is not
  // there is an error rather than a silent no-op.
  const find = (id) => {
    const i = out.findIndex((item) => item.id === id);
    if (i < 0) fail(`nothing named "${id}" in this list to point at`);
    return i;
  };
  if (edits[fullKey]) out = edits[fullKey].map(lookup);
  for (const [oldId, newId] of Object.entries(edits.swap ?? {})) {
    out[find(oldId)] = lookup(newId);
  }
  for (const id of edits.remove ?? []) out.splice(find(id), 1);
  for (const step of edits.insert ?? []) {
    let at;
    if (step.after) at = find(step.after) + 1;
    else if (step.before) at = find(step.before);
    else if (step.at === "start") at = 0;
    else if (step.at === "end") at = out.length;
    else fail('an insert needs after, before, or at: "start" / "end"');
    out.splice(at, 0, ...step.add.map(lookup));
  }
  return out;
}

// Assembles the cut: starts from the canonical content and lets each
// layer, root first, change what it names. Returns the finished blocks,
// with roles and education entries still carrying their ids.
function composeCut(layers) {
  const cut = {
    CONTACT: BASE_CONTACT,
    SUMMARY: BASE_SUMMARY,
    CASE_STUDIES: BASE_CASE_STUDIES,
    roles: CANONICAL_ROLES,
    education: CANONICAL_EDUCATION,
  };
  // Everything that can be placed by id: the canonical bullets and
  // entries to start with, plus whatever each layer declares on the way.
  const bullets = new Map();
  CANONICAL_ROLES.forEach((role) =>
    role.bullets.forEach((bullet) => bullets.set(bullet.id, bullet)),
  );
  const entries = new Map(CANONICAL_EDUCATION.map((e) => [e.id, e]));

  for (const { file, mod } of layers) {
    const fail = (message) => layerError(file, message);

    // Whole blocks first. Roles and entries written out in full carry no
    // ids, which is fine until something tries to point at one.
    for (const key of WHOLE_BLOCKS) {
      if (mod[key] !== undefined) cut[key] = mod[key];
    }
    if (mod.ROLES) {
      cut.roles = mod.ROLES.map((role) => ({
        ...role,
        bullets: role.bullets.map((text) => ({ text })),
      }));
    }
    if (mod.EDUCATION) cut.education = mod.EDUCATION;

    // New wording, each piece named once so this layer, or any cut built
    // on it, can place it by id.
    for (const [id, text] of Object.entries(mod.BULLETS ?? {})) {
      if (bullets.has(id)) fail(`BULLETS: the id "${id}" is already taken`);
      bullets.set(id, { id, text });
    }
    for (const [id, entry] of Object.entries(mod.EDUCATION_ENTRIES ?? {})) {
      if (entries.has(id)) fail(`EDUCATION_ENTRIES: the id "${id}" is already taken`);
      entries.set(id, { ...entry, id });
    }

    if (mod.CONTACT_EDITS) cut.CONTACT = withFields(cut.CONTACT, mod.CONTACT_EDITS);

    for (const id of mod.DROP_ROLES ?? []) {
      if (!cut.roles.some((role) => role.id === id)) fail(`DROP_ROLES: no role "${id}"`);
      cut.roles = cut.roles.filter((role) => role.id !== id);
    }

    // Per-role changes: plain field changes, then the bullet list.
    for (const [roleId, edits] of Object.entries(mod.ROLE_EDITS ?? {})) {
      const at = cut.roles.findIndex((role) => role.id === roleId);
      if (at < 0) fail(`ROLE_EDITS: no role "${roleId}"`);
      const roleFail = (message) => fail(`ROLE_EDITS.${roleId}: ${message}`);
      const fields = {};
      for (const [key, value] of Object.entries(edits)) {
        if (ROLE_FIELDS.has(key)) fields[key] = value;
        else if (key !== "bullets" && !LIST_VERBS.includes(key)) {
          roleFail(`unknown key ${key}`);
        }
      }
      const role = withFields(cut.roles[at], fields);
      role.bullets = editList(role.bullets, edits, {
        fullKey: "bullets",
        lookup: (id) => bullets.get(id) ?? roleFail(`no bullet named "${id}"`),
        fail: roleFail,
      });
      cut.roles = cut.roles.map((r, i) => (i === at ? role : r));
    }

    if (mod.EDUCATION_EDITS) {
      const eduFail = (message) => fail(`EDUCATION_EDITS: ${message}`);
      for (const key of Object.keys(mod.EDUCATION_EDITS)) {
        if (key !== "entries" && !LIST_VERBS.includes(key)) eduFail(`unknown key ${key}`);
      }
      cut.education = editList(cut.education, mod.EDUCATION_EDITS, {
        fullKey: "entries",
        lookup: (id) => entries.get(id) ?? eduFail(`no entry named "${id}"`),
        fail: eduFail,
      });
    }
  }
  return cut;
}

// Once a cut is assembled the ids have done their job; everything below
// this point (validation, the review diff, rendering) works on plain
// content exactly as it did before ids existed.
const plainRole = ({ id, ...role }) => ({
  ...role,
  bullets: role.bullets.map((bullet) => bullet.text),
});
const plainEntry = ({ id, ...entry }) => entry;
const BASE_ROLES = CANONICAL_ROLES.map(plainRole);
const BASE_EDUCATION = CANONICAL_EDUCATION.map(plainEntry);

const cut = composeCut(
  variantPath ? await loadLayers(resolve(process.cwd(), variantPath)) : [],
);

// ─── Review copy ──────────────────────────────────────────────────
// RESUME_DIFF=1, alongside RESUME_VARIANT, builds a *review* copy: the same
// document with everything the variant changed marked in the text — new or
// rewritten wording highlighted, wording the cut drops struck through in
// grey, and whole entries it drops named at the end. Reviewing a tailored
// resume otherwise means holding two documents side by side and trusting
// your eye to find the differences, which is the slow half of the job.
//
// It is deliberately a second artifact rather than a flag on the deliverable.
// The file lands beside the real one with `.review` in its name, so the copy
// carrying highlights can never be the copy that gets submitted. Without a
// variant there is nothing to differ from, so the flag is refused rather
// than quietly ignored — a build that silently did nothing would read as
// "no changes found", which is the one wrong answer this must never give.
//
// The review copy stops at the .docx. Do NOT convert it to PDF (his call,
// 2026-09-09) — a PDF is the sending format, and this file is never sent
// anywhere. He reads it in Word, where the highlighting and strikethrough
// are native. Only the sendable build gets a soffice pass.
const REVIEW = process.env.RESUME_DIFF === "1";
if (REVIEW && !variantPath) {
  console.error(
    "RESUME_DIFF=1 needs RESUME_VARIANT set: a review copy marks what a\n" +
      "variant changed, and the canonical resume has nothing to differ from.",
  );
  process.exit(1);
}

const CONTACT = cut.CONTACT;
const SUMMARY = cut.SUMMARY;
const ROLES = cut.roles.map(plainRole);
const EDUCATION = cut.education.map(plainEntry);
const CASE_STUDIES = cut.CASE_STUDIES;
const OUT_PATH =
  cut.OUT_PATH ?? "public/resume/malcolm-xavier-resume-template.docx";
// Document metadata shown in Word's properties pane; a variant cut for a
// non-PM req shouldn't describe itself as a PM resume.
const BASE_DESCRIPTION =
  cut.DOC_DESCRIPTION ?? "Resume — Senior Product Manager";
// Word's properties pane is the one place the warning survives a rename, so
// a review copy declares itself there as well as in its filename.
const DOC_DESCRIPTION = REVIEW
  ? `REVIEW COPY, not for sending — ${BASE_DESCRIPTION}`
  : BASE_DESCRIPTION;
// Page size in twips. The canonical resume has always emitted the docx
// library's A4 default (11906 x 16838) despite the header comment above
// saying US Letter, and its published PDF is A4 — changing that would
// reflow the live download, so it stays until someone asks. A variant
// may opt into US Letter (12240 x 15840), which is the shorter page and
// therefore the stricter page-count budget.
const PAGE_SIZE = cut.PAGE_SIZE ?? { width: 11906, height: 16838 };
// RESUME_OUT_DIR sends the file to a different folder under the same
// name. It exists for trial builds that must not land on a copy already
// reviewed or sent: a cut's OUT_PATH is usually ~/Downloads, and the
// canonical build writes into public/resume/, which ships with the site.
// Unset, every build writes exactly where it always has.
const DEST_PATH = process.env.RESUME_OUT_DIR
  ? join(process.env.RESUME_OUT_DIR, basename(OUT_PATH))
  : OUT_PATH;
// `.review` sits before the extension so the two files sort next to each
// other and the marked-up one is unmistakable at a glance in Downloads.
const WRITE_PATH = REVIEW
  ? DEST_PATH.replace(/\.docx$/i, ".review.docx")
  : DEST_PATH;

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
  // Review copy only, and never reachable in a normal build. Dropped wording
  // is greyed as well as struck so it reads as removed at a glance rather
  // than as emphasis; Google Docs imports both faithfully from a .docx.
  cut: "808080",
};

// The one highlight docx exposes by name that survives the Google Docs
// import legibly. Yellow-on-black also clears WCAG AA comfortably, which
// matters because this copy exists to be read closely.
const MARK_HIGHLIGHT = "yellow";

// ─── Word-level diff (review copy only) ───────────────────────────
// Everything below is inert unless REVIEW is on: DIFFS stays empty, every
// lookup misses, and each helper falls through to the branch it has always
// taken. That is deliberate — the canonical resume is the published download
// and its bytes should not move because a review feature was added.

// A unit of the diff is one atom per word, carrying the formatting of the
// segment it came from. Exploding both sides down to atoms is what lets a
// bullet that swapped two words highlight only those two words, and it is
// what keeps the bold metric phrases and inline links intact while doing it.
// Trailing whitespace rides on the preceding atom so re-joining the atoms
// reproduces the original string exactly.
function atomize(value) {
  const segments = typeof value === "string" ? [{ text: value }] : value;
  const atoms = [];
  let pending = "";
  for (const seg of segments) {
    for (const part of seg.text.split(/(\s+)/)) {
      if (!part) continue;
      if (/^\s+$/.test(part)) {
        if (atoms.length) atoms[atoms.length - 1].text += part;
        else pending += part;
        continue;
      }
      atoms.push({
        text: pending + part,
        word: part,
        bold: !!seg.bold,
        url: seg.url,
      });
      pending = "";
    }
  }
  return atoms;
}

/** The plain text of a unit, whichever shape it arrived in. */
function plain(value) {
  return atomize(value)
    .map((a) => a.text)
    .join("");
}

// Longest-common-subsequence over the words alone; formatting rides along on
// the atoms and never decides what counts as a match. Resume units are a few
// dozen words, so the quadratic table is free and the exact result is worth
// more than an approximation would save.
function diffAtoms(before, after) {
  const n = before.length;
  const m = after.length;
  const table = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      table[i][j] =
        before[i].word === after[j].word
          ? table[i + 1][j + 1] + 1
          : Math.max(table[i + 1][j], table[i][j + 1]);
    }
  }
  const out = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (before[i].word === after[j].word) {
      out.push({ ...after[j], mark: "same" });
      i++;
      j++;
    } else if (table[i + 1][j] >= table[i][j + 1]) {
      out.push({ ...before[i], mark: "cut" });
      i++;
    } else {
      out.push({ ...after[j], mark: "add" });
      j++;
    }
  }
  while (i < n) out.push({ ...before[i++], mark: "cut" });
  while (j < m) out.push({ ...after[j++], mark: "add" });
  return out;
}

// Marked units are looked up by their own plain text, because that is all a
// render helper has in hand by the time it is called. Two different units
// with identical text would be indistinguishable at that point, so a second
// registration that disagrees with the first collapses to "all new" — the
// one answer that cannot quietly show him a diff against the wrong original.
const DIFFS = new Map();
const CUTS = [];

function registerDiff(before, after, opts = {}) {
  if (!REVIEW) return;
  const afterAtoms = atomize(after);
  if (!afterAtoms.length) {
    // The cut dropped this unit outright. There is no run left to carry a
    // mark, so it is named at the end with the other whole-entry drops
    // rather than disappearing from the review copy along with the document.
    if (before && opts.cutWhere) {
      CUTS.push({ where: opts.cutWhere, text: plain(before) });
    }
    return;
  }
  const marked =
    before === null || before === undefined
      ? afterAtoms.map((a) => ({ ...a, mark: "add" }))
      : diffAtoms(atomize(before), afterAtoms);
  if (!marked.some((a) => a.mark !== "same")) return;
  const key = opts.key ?? plain(after);
  const existing = DIFFS.get(key);
  if (existing && JSON.stringify(existing) !== JSON.stringify(marked)) {
    DIFFS.set(
      key,
      afterAtoms.map((a) => ({ ...a, mark: "add" })),
    );
    return;
  }
  DIFFS.set(key, marked);
}

/** One atom as a run, wearing its mark. */
function markedRun(atom, opts = {}) {
  const style = {
    text: atom.text,
    font: FONT,
    size: opts.size ?? SIZE.body,
    bold: atom.bold || opts.bold || false,
    italics: opts.italics ?? false,
    color: atom.mark === "cut" ? COLOR.cut : COLOR.black,
    strike: atom.mark === "cut",
    ...(atom.mark === "add" ? { highlight: MARK_HIGHLIGHT } : {}),
  };
  // A dropped word keeps its wording and loses its link: the destination
  // belongs to text this cut no longer makes, and a live hyperlink inside
  // struck-through prose invites a click on something that is not there.
  if (atom.url && atom.mark !== "cut") {
    return new ExternalHyperlink({
      link: atom.url,
      children: [
        new TextRun({
          ...style,
          underline: { type: "single", color: COLOR.link },
        }),
      ],
    });
  }
  return new TextRun(style);
}

/** The marked runs for a unit, or undefined if it is unchanged. */
function markedRuns(value, opts = {}) {
  if (!REVIEW) return undefined;
  const marked = DIFFS.get(typeof value === "string" ? value : plain(value));
  return marked ? marked.map((a) => markedRun(a, opts)) : undefined;
}

/** A standard text run with our base font + black color. */
function run(text, opts = {}) {
  const marked = markedRuns(text, opts);
  if (marked) return marked;
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
  const marked = markedRuns(text, opts);
  if (marked) return marked;
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
function segmentChildren(value, opts = {}) {
  // A changed unit renders from its atoms in one piece, because the marks
  // cut across the segment boundaries: half a sentence can be new while the
  // bold metric inside it is not.
  const marked = markedRuns(value, opts);
  if (marked) return marked;
  if (typeof value === "string") {
    return [run(value, opts)];
  }
  return value.map((seg) =>
    seg.url
      ? linkRun(seg.text, seg.url, { ...opts, bold: !!seg.bold })
      : run(seg.text, { ...opts, bold: !!seg.bold }),
  );
}

function bulletChildren(bullet) {
  return segmentChildren(bullet, { size: SIZE.bullet });
}

// docx bakes paragraph options at construction, and a review build turns one
// run into several — so every children array is flattened a level on the way
// in. Outside review mode nothing is ever nested and this is a no-op, which
// is what keeps the canonical output byte-for-byte what it was.
function paragraph(config) {
  return new Paragraph(
    config.children ? { ...config, children: config.children.flat() } : config,
  );
}

// ─── Pairing the cut against the canonical ────────────────────────
// Runs only for a review copy. Each unit of the variant is paired with the
// canonical unit it came from and the difference recorded; the render
// helpers above then find it by text when they reach it.
//
// Pairing is by identity wherever the data carries one — a role by employer
// and title, an education entry by institution, a case study by its URL —
// and by wording where it does not. Bullets pair by wording even though the
// canonical ones now carry ids: a cut that rewords a bullet gives it a new
// id, and a cut written out in full carries none, so wording is the one
// test every cut can answer. Each variant bullet claims the unpaired
// canonical bullet it shares the most words with, above a floor: below that the two are different sentences and calling the
// second a rewrite of the first would invent a lineage. A bullet that claims
// nothing is new. A canonical bullet nothing claimed was dropped, and those
// are named at the end of the document rather than guessed back into a
// position the cut no longer gives them.

function overlap(a, b) {
  const words = (v) => plain(v).toLowerCase().match(/[a-z0-9$%.+]+/g) ?? [];
  const left = new Set(words(a));
  const right = words(b);
  if (!left.size || !right.length) return 0;
  const hits = right.filter((w) => left.has(w)).length;
  return hits / Math.max(left.size, right.length);
}

// 0.3 keeps a rewrite that kept a third of its words together with its
// original, and keeps two bullets that merely share "and the a" apart.
const PAIR_FLOOR = 0.3;

function pairLists(before, after, where) {
  const claimed = new Set();
  after.forEach((item) => {
    let best = -1;
    let bestScore = PAIR_FLOOR;
    before.forEach((candidate, i) => {
      if (claimed.has(i)) return;
      const score = overlap(candidate, item);
      if (score > bestScore) {
        bestScore = score;
        best = i;
      }
    });
    if (best >= 0) claimed.add(best);
    registerDiff(best >= 0 ? before[best] : null, item);
  });
  before.forEach((candidate, i) => {
    if (!claimed.has(i)) CUTS.push({ where, text: plain(candidate) });
  });
}

if (REVIEW) {
  registerDiff(BASE_CONTACT.headline, CONTACT.headline);
  registerDiff(BASE_SUMMARY, SUMMARY);

  // Roles: employer and title first, employer alone as the fallback, so a
  // cut that retitled a role still diffs against the right one instead of
  // reporting the whole entry as new.
  const claimedRoles = new Set();
  const claimRole = (role) => {
    let i = BASE_ROLES.findIndex(
      (r, idx) =>
        !claimedRoles.has(idx) &&
        r.company === role.company &&
        r.title === role.title,
    );
    if (i < 0) {
      i = BASE_ROLES.findIndex(
        (r, idx) => !claimedRoles.has(idx) && r.company === role.company,
      );
    }
    if (i < 0) return null;
    claimedRoles.add(i);
    return BASE_ROLES[i];
  };

  ROLES.forEach((role) => {
    const base = claimRole(role);
    const where = `${role.company} — ${role.title}`;
    if (!base) {
      // A whole entry with no canonical counterpart. Everything in it is new,
      // registered unit by unit so it marks up the same way as a rewrite.
      registerDiff(null, role.title);
      role.bullets.forEach((b) => registerDiff(null, b));
      return;
    }
    registerDiff(base.company, role.company);
    registerDiff(base.title, role.title);
    registerDiff(` — ${base.dates}`, ` — ${role.dates}`);
    if (base.location || role.location) {
      registerDiff(
        base.location ? ` — ${base.location}` : null,
        role.location ? ` — ${role.location}` : "",
        { cutWhere: where },
      );
    }
    registerDiff(
      base.contextSegments ?? base.context ?? null,
      role.contextSegments ?? role.context ?? "",
      { cutWhere: where },
    );
    pairLists(base.bullets, role.bullets, where);
    if (base.caseStudy || role.caseStudy) {
      registerDiff(base.caseStudy?.title ?? null, role.caseStudy?.title ?? "", {
        cutWhere: `${where} (case study link)`,
      });
    }
  });
  BASE_ROLES.forEach((r, idx) => {
    if (!claimedRoles.has(idx)) {
      CUTS.push({ where: "Experience — entries dropped", text: `${r.company} — ${r.title}` });
    }
  });

  // Education, by institution.
  const claimedSchools = new Set();
  EDUCATION.forEach((entry) => {
    const idx = BASE_EDUCATION.findIndex(
      (e, i) => !claimedSchools.has(i) && e.institution === entry.institution,
    );
    const base = idx >= 0 ? BASE_EDUCATION[idx] : null;
    if (idx >= 0) claimedSchools.add(idx);
    registerDiff(base?.credential ?? null, entry.credential);
    if (base?.honors || entry.honors) {
      registerDiff(
        base?.honors ? `, ${base.honors}` : null,
        entry.honors ? `, ${entry.honors}` : "",
        { cutWhere: `Education — ${entry.institution}` },
      );
    }
    registerDiff(base ? ` — ${base.dates}` : null, ` — ${entry.dates}`);
    registerDiff(base?.context ?? null, entry.context ?? "", {
      cutWhere: `Education — ${entry.institution}`,
    });
    pairLists(base?.details ?? [], entry.details, `Education — ${entry.institution}`);
  });
  BASE_EDUCATION.forEach((e, i) => {
    if (!claimedSchools.has(i)) {
      CUTS.push({ where: "Education — entries dropped", text: `${e.institution} — ${e.credential}` });
    }
  });

  // Case studies, by URL: the title is the thing most likely to be reworded,
  // so it cannot also be the thing that identifies the entry.
  const claimedStudies = new Set();
  CASE_STUDIES.forEach((study) => {
    const idx = BASE_CASE_STUDIES.findIndex(
      (c, i) => !claimedStudies.has(i) && c.url === study.url,
    );
    const base = idx >= 0 ? BASE_CASE_STUDIES[idx] : null;
    if (idx >= 0) claimedStudies.add(idx);
    registerDiff(base?.title ?? null, study.title);
    registerDiff(base?.description ?? null, study.description);
  });
  BASE_CASE_STUDIES.forEach((c, i) => {
    if (!claimedStudies.has(i)) {
      CUTS.push({ where: "Case studies — entries dropped", text: c.title });
    }
  });
}

// ─── Document construction ────────────────────────────────────────

const children = [];

// — Name
children.push(
  paragraph({
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
  paragraph({
    spacing: { before: 0, after: 80 },
    children: [run(CONTACT.headline, { size: SIZE.headline, italics: true })],
  }),
);

// — Contact line 2 is built first so line 1 knows whether it is the last
//   line of the block. With no profile links, line 1 has to carry the gap
//   before the summary itself, or the name block runs straight into it.
const profileLinks = [];
if (CONTACT.linkedinUrl) {
  profileLinks.push(linkRun("LinkedIn", CONTACT.linkedinUrl, { size: SIZE.contact }));
}
if (CONTACT.githubUrl) {
  profileLinks.push(linkRun("GitHub", CONTACT.githubUrl, { size: SIZE.contact }));
}
if (CONTACT.websiteUrl) {
  profileLinks.push(
    linkRun("Personal Website", CONTACT.websiteUrl, { size: SIZE.contact }),
  );
}

// — Contact line 1: email · phone · location
children.push(
  paragraph({
    spacing: { before: 0, after: profileLinks.length ? 40 : 200 },
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
//   Omitted entirely when a variant supplies none of the three.
if (profileLinks.length) {
  children.push(
    paragraph({
      spacing: { before: 0, after: 200 },
      children: profileLinks.flatMap((link, i) => (i ? [sep(), link] : [link])),
    }),
  );
}

// — Summary paragraph (no SUMMARY label, per Malcolm)
children.push(
  paragraph({
    spacing: { before: 0, after: 240 },
    children: [run(SUMMARY)],
  }),
);

// ─── Section header helper ────────────────────────────────────────
function sectionHeader(label, opts = {}) {
  return paragraph({
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
    targetArray.push(paragraph(config));
  });
}

// — EXPERIENCE section.
//   The section header is built with keepNext below so it can't sit
//   alone at the bottom of a page.
// A role may open its own subsection by carrying `sectionBreak`, which
// prints a header above it rather than letting it fall under the running
// one. That is what lets a variant group the record — a hospitality cut
// leads with "Hospitality" and files the software career under "Selected
// Other Experience" — so a reader is never asked to reconcile an entry
// that looks out of chronological order. When no role opens the list with
// a break, which is every canonical build, the single "Experience" header
// goes up exactly as before.
if (!ROLES[0]?.sectionBreak) {
  children.push(sectionHeader("Experience", { keepNext: true }));
}

ROLES.forEach((role, idx) => {
  if (role.sectionBreak) {
    children.push(sectionHeader(role.sectionBreak, { keepNext: true }));
  }
  // Build all paragraphs for this entry into an array, then apply
  // keepNext to all but the last so the entry never splits across
  // pages (Malcolm's rule: an entry should not span pages).
  // A role sitting directly under its own subsection header takes the
  // flush spacing the first entry gets, not the gap between two entries.
  const beforeRole = idx === 0 || role.sectionBreak ? 0 : 200;
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
      children: segmentChildren(role.contextSegments, {
        size: SIZE.context,
        italics: true,
      }),
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
// A variant may drop a section outright — a one-page cut for a job that
// does not read graduate credentials as an asset keeps one line of
// education and no case studies. An empty list prints nothing at all
// rather than a header with nothing under it.
if (EDUCATION.length) {
  children.push(sectionHeader("Education", { keepNext: true }));
}

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
if (CASE_STUDIES.length) {
  children.push(sectionHeader("Case Studies", { keepNext: true }));
}

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

// ─── Review notes (review copy only) ──────────────────────────────
// Deliberately last, so the legend and the dropped-entry list cost the body
// nothing. The body still does not paginate identically to the deliverable —
// restoring dropped wording inline necessarily makes the text longer — so the
// page-count check belongs to the real build and this copy is for reading.
// Everything needed to interpret the marks is in the document rather than
// only in the console, because the file outlives the session that wrote it.
if (REVIEW) {
  children.push(sectionHeader("Review notes"));

  children.push(
    paragraph({
      spacing: { before: 0, after: 100 },
      children: [
        run("Review copy — not the file to send. ", {
          bold: true,
          italics: true,
        }),
        new TextRun({
          text: "Highlighted",
          font: FONT,
          size: SIZE.body,
          italics: true,
          color: COLOR.black,
          highlight: MARK_HIGHLIGHT,
        }),
        run(" wording is new or rewritten in this cut. ", { italics: true }),
        new TextRun({
          text: "Struck-through grey",
          font: FONT,
          size: SIZE.body,
          italics: true,
          color: COLOR.cut,
          strike: true,
        }),
        run(
          " wording is canonical text the cut drops, shown where it used to sit. Rebuild without RESUME_DIFF=1 for the copy to submit.",
          { italics: true },
        ),
      ],
    }),
  );

  if (CUTS.length) {
    // Grouped by where they came from, in first-seen order, so the list reads
    // in document order rather than in the order the pairing happened to
    // resolve. Whole entries have no position left in the cut, which is why
    // they are named here instead of being guessed back into one.
    const groups = new Map();
    for (const cut of CUTS) {
      if (!groups.has(cut.where)) groups.set(cut.where, []);
      groups.get(cut.where).push(cut.text);
    }
    for (const [where, texts] of groups) {
      children.push(
        paragraph({
          spacing: { before: 140, after: 40 },
          children: [
            new TextRun({
              text: where,
              font: FONT,
              bold: true,
              size: SIZE.body,
              color: COLOR.black,
            }),
          ],
        }),
      );
      for (const text of texts) {
        children.push(
          paragraph({
            spacing: { before: 0, after: 40 },
            bullet: { level: 0 },
            indent: { left: convertInchesToTwip(0.2) },
            children: [
              new TextRun({
                text,
                font: FONT,
                size: SIZE.bullet,
                color: COLOR.cut,
                strike: true,
              }),
            ],
          }),
        );
      }
    }
  } else {
    children.push(
      paragraph({
        spacing: { before: 100, after: 0 },
        children: [
          run(
            "Nothing was dropped wholesale — every change this cut makes is marked inline above.",
            { italics: true },
          ),
        ],
      }),
    );
  }
}

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
    paragraph({
      spacing: { before: 0, after: 0 },
      children: [
        headerRun(CONTACT.name, { size: HEADER_SIZE.name, bold: true }),
      ],
    }),
    paragraph({
      spacing: { before: 0, after: 0 },
      children: [
        headerRun(CONTACT.headline, {
          size: HEADER_SIZE.headline,
          italics: true,
        }),
      ],
    }),
    paragraph({
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
        // Same optionality as the body contact block above: a variant
        // supplying no profile links gets no separators trailing off the
        // end of the running header either.
        ...(CONTACT.linkedinUrl
          ? [headerSep(), headerLink("LinkedIn", CONTACT.linkedinUrl)]
          : []),
        ...(CONTACT.githubUrl
          ? [headerSep(), headerLink("GitHub", CONTACT.githubUrl)]
          : []),
        ...(CONTACT.websiteUrl
          ? [headerSep(), headerLink("Personal Website", CONTACT.websiteUrl)]
          : []),
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

const outPath = resolve(process.cwd(), WRITE_PATH);
mkdirSync(dirname(outPath), { recursive: true });

const buf = await Packer.toBuffer(doc);
writeFileSync(outPath, buf);

console.log(`✓ Wrote ${outPath} (${(buf.length / 1024).toFixed(1)} KB)`);
if (REVIEW) {
  const marked = DIFFS.size;
  console.log(
    `  Review copy — ${marked} changed ${marked === 1 ? "line" : "lines"} marked` +
      `${CUTS.length ? `, ${CUTS.length} dropped outright and listed at the end` : ""}.`,
  );
  console.log("  Highlighted = new or rewritten · struck grey = dropped.");
  console.log("  Do not submit this file; rebuild without RESUME_DIFF=1 for that.");
}
