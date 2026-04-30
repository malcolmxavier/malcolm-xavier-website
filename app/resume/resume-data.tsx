// ─────────────────────────────────────────────────────────────────
// Resume content — single source of truth for /resume.
//
// This data is parallel to malcolm-xavier-resume.pdf in
// /public/resume/. When the PDF is updated, update this file too,
// then re-export the PDF from Google Docs and replace
// public/resume/malcolm-xavier-resume.pdf so the download stays in
// sync with what's rendered on the page.
//
// Kept separate from page.tsx so the layout and content live in
// different files — easier to edit copy without scrolling past JSX.
//
// File extension is .tsx (not .ts) so individual bullet entries can
// embed inline <Link> components — used to link out to organizations
// referenced in bullet copy (Artist Growth, NEFA, etc.) where the
// destination doesn't have a top-level role of its own.
// ─────────────────────────────────────────────────────────────────

import { Link, type LinkAccent } from "@/components/primitives/Link";
import type { SubBrand } from "@/lib/sub-brands";

export type ResumeContact = {
  email: string;
  phone: string;
  location: string;
  linkedin: string;
  github: string;
  /** Direct Calendly booking link (the 30-min product chat slot). */
  calendly: string;
  /** Root Calendly profile URL — shows all available event types.
   *  Used as the fallback link when the inline widget can't load. */
  calendlyRoot: string;
};

export type ResumeRole = {
  /** Company or org name — bold visual anchor for each block. */
  company: string;
  /** Optional company URL — when present, the company name renders
   *  as a link to this destination. */
  url?: string;
  /** Optional accent color drawn from the design system's color
   *  ramps — used to tint the company link to roughly match each
   *  brand's primary color. */
  accent?: LinkAccent;
  /** "Remote", "New York, NY", etc. Optional when implied. */
  location?: string;
  /** Specific title held during the role. */
  title: string;
  /** Human-readable date span, e.g. "Feb 2024 – Oct 2025". */
  dates: string;
  /** One-line context: what the company is + what Malcolm did. */
  context: string;
  /** Achievement bullets, written in past-tense action voice.
   *  React.ReactNode (not just string) so individual bullets can
   *  embed inline <Link>s for orgs / projects mentioned in the
   *  copy that don't get a top-level role of their own. */
  bullets: React.ReactNode[];
};

export type ResumeEducation = {
  institution: string;
  location: string;
  dates: string;
  credential: string;
  honors?: string;
  context?: string;
  details: string[];
};

export type ResumeCaseStudy = {
  /** URL-safe identifier; used as a stable React key. */
  slug: string;
  title: string;
  /** 1–2 sentences describing the work and impact. */
  description: string;
  /** Internal URL of the curated case study on malxavi.com. */
  href: string;
  /**
   * Optional external URL of the live project / artifact this case
   * study documents (e.g. the standalone Basecamp Coffee app). When
   * present, the card renders a secondary "Visit live project ↗" CTA
   * alongside the primary "Read the case study →" link.
   */
  liveHref?: string;
  /** Optional sub-brand accent for the card stripe. */
  accent?: SubBrand;
};

// ─── Header / contact ──────────────────────────────────────────────

export const CONTACT: ResumeContact = {
  email: "malcolm@malxavi.com",
  phone: "(774) 262-2606",
  location: "Los Angeles, CA",
  linkedin: "https://www.linkedin.com/in/malxavi/",
  github: "https://github.com/malcolmxavier",
  calendly: "https://calendly.com/malcolmxavier/product-chat-30",
  calendlyRoot: "https://calendly.com/malcolmxavier",
};

// Status line shown in the hero — the recruiter-facing "where I am
// right now" signal. Update when the search ends.
export const STATUS = "Currently interviewing · Open to senior PM roles in media + streaming";

// ─── Positioning ───────────────────────────────────────────────────

// Non-breaking hyphen (U+2011) inside "AI‑Native" so the term wraps
// as a single word on narrow viewports — without it, the line breaks
// at the regular hyphen and "Native" orphans on its own line at
// iPhone-class widths. Sitewide convention: hyphenated proper terms
// get U+2011 so the orphan-prevention rule we apply to arrows extends
// to whole hyphenated phrases. The DOCX export at scripts/build-
// resume-docx.mjs intentionally retains the regular hyphen — Word
// hyphenation rules are different from CSS line-breaking, and the
// resume-data file ships site-only per the project rule.
export const HEADLINE =
  "Senior Product Manager · Growth and Data · Media, Publishing, and Streaming · AI‑Native";

export const SUMMARY =
  "Senior Product Manager with 7+ years scaling growth and data platforms across consumer and B2B SaaS products. Built and operated MarTech infrastructure for 22M+ users across 40+ brands, driving 33% YoY email revenue growth. Applied an MS in Law (focused on data privacy and IP) to data governance and compliance-related roadmap tradeoffs. Operationalized AI-native discovery/delivery loops, including roadmapping, outcome measurement, and documentation.";

// ─── Work experience (most recent first) ───────────────────────────

export const ROLES: ResumeRole[] = [
  {
    company: "People Inc.",
    url: "https://people.inc",
    accent: "yellow",
    location: "Remote",
    title: "Senior Product Manager, Audience Relationships",
    dates: "Feb 2024 – Oct 2025",
    context:
      "America's largest publisher (formerly Dotdash Meredith). Scaled growth/MarTech platform for a network of 40+ brands and 22M+ users.",
    bullets: [
      <><strong>Grew email revenue 33% YoY</strong> with reusable components and lifecycle marketing playbooks</>,
      <>Partnered with data science to scale a recipe recommendation service and drive <strong>2x traffic</strong></>,
      <>Introduced a content-specific newsletter program with <strong>3x open rates and 2x user LTV</strong></>,
      <>Established <strong>new $2.2M+ annual revenue channel</strong> by supporting launch of user commenting</>,
      "Operationalized experiments to enable AI-based personalized acquisition and engagement",
      "Built models in SQL, BigQuery, and Connected Sheets to identify achievable outcomes that informed the AI-based personalization strategy",
      <>Facilitated <strong>80+ member community of practice</strong> focused on product discovery skills</>,
      <>Enabled onsite transactions to <strong>increase print subscription revenue 115% YoY</strong></>,
      "Concurrently developed LLM prompt engineering and RAG workflow expertise (see freelance Prompt Engineer role, below)",
    ],
  },
  {
    company: "Freelance",
    title: "Prompt Engineer",
    dates: "Sep 2023 – Oct 2025",
    context:
      "Trained LLM models (GPT-5, Gemini 2.5 Pro, etc.) across various agentic and RAG use cases.",
    bullets: [
      "Applied prompting techniques (CoT, meta-prompting, etc.) to fine-tune models for legal use cases",
      "Developed and used complex criteria and rubrics to evaluate LLM and agent performance",
      "Peer-reviewed and revised work submissions to maintain optimal model performance",
    ],
  },
  {
    company: "Muck Rack",
    url: "https://muckrack.com",
    accent: "blue",
    location: "Remote",
    title: "Technical Product Manager, Content & Data Ingestion",
    dates: "Sep 2022 – Feb 2024",
    context:
      "SaaS reporting tool for PR professionals. Scaled the content platform; enabled search and monitoring features.",
    bullets: [
      <><strong>Scaled ingestion 350% YoY</strong>, enabling downstream ML classification, search, and reporting</>,
      <>Improved core AI/ML model accuracy, <strong>reducing parsing errors by 45% YoY</strong></>,
      <>Backfilled content and data to achieve a <strong>500% increase in historical coverage</strong></>,
      "Led the initiative to decompose the ingestion monolith, improving ETL cost, scalability, and reliability",
      "Collaborated with partnerships, legal, and GTM to establish strategy for content and data solutions",
      "Liaised with external content vendors and developers to ensure data-processing compliance",
    ],
  },
  {
    company: "Independent Consulting",
    title: "Product & Data Consultant",
    dates: "Feb 2022 – Oct 2022",
    context:
      "Transition period bridging User Interviews and Muck Rack.",
    bullets: [
      <>
        Product consulting for{" "}
        <Link href="https://www.artistgrowth.com">Artist Growth</Link>{" "}
        (SaaS, music industry), focused on product operations and GDPR/CCPA compliance
      </>,
      <>
        Developed content strategy for the{" "}
        <Link href="https://www.nefa.org">
          New England Foundation for the Arts
        </Link>
      </>,
      "Built analytics architecture and data strategy for a private client",
    ],
  },
  {
    company: "User Interviews",
    url: "https://www.userinterviews.com",
    // No accent override — defaults to the loud-link green, which
    // happens to match User Interviews' own brand color.
    location: "Remote",
    title: "Product Manager",
    dates: "Sep 2020 – Feb 2022",
    context:
      "SaaS UXR tool and marketplace for researchers and participants. Led core and platform teams.",
    bullets: [
      <>Improved marketplace management by driving a <strong>135% increase in participant re-recruitment</strong></>,
      <>Implemented targeting features that <strong>improved core marketplace fulfillment metric by 15%</strong></>,
      "Designed, analyzed, and reported on A/B tests for email-notification system model updates",
      "Built SQL queries and dashboards in Mode to monitor and report on marketplace operations",
      "Led update to product pricing, including onsite creative and purchase flow",
    ],
  },
  {
    company: "Fullstack Academy",
    url: "https://www.fullstackacademy.com",
    accent: "red",
    location: "New York, NY",
    title: "Admissions Lead (Project Manager)",
    dates: "Jun 2018 – Feb 2020",
    context:
      "Web-development bootcamp (and The Grace Hopper Program). Scaled and optimized the enrollment system to exceed growth targets.",
    bullets: [
      <>Generated <strong>$30M+ in annual revenue (170% YoY increase)</strong> by scaling enrollment</>,
      "Partnered with engineering to optimize integrations, automations, and system architecture",
      "Built enrollment dashboards in HubSpot to increase internal business performance transparency",
      <>Trained and managed <strong>~40 rotating contract technical interviewers</strong> as part of enrollment operations</>,
      "Performed code review for all applicants in HackerRank",
    ],
  },
  {
    company: "Fractured Atlas",
    url: "https://www.fracturedatlas.org",
    accent: "purple",
    location: "New York, NY",
    title: "Program Associate",
    dates: "Mar 2014 – Oct 2017",
    context:
      "SaaS arts-administration tool. Provided administrative support to end users.",
    bullets: [
      "Tracked and reported on user analytics as inputs for roadmap prioritization",
      "Conducted quality-assurance testing of new features and bug fixes",
      <>
        Ideated and produced{" "}
        <Link href="https://podcasts.apple.com/us/podcast/createquity-podcast/id1095803147">
          podcast with Createquity
        </Link>{" "}
        to establish institutional thought leadership
      </>,
    ],
  },
];

// ─── Education ─────────────────────────────────────────────────────

export const EDUCATION: ResumeEducation[] = [
  {
    institution: "Northwestern University, Pritzker School of Law",
    location: "Chicago, IL",
    dates: "Sep 2021 – May 2023",
    credential: "Master of Science in Law",
    honors: "Honors",
    context:
      "Applied privacy law and IP strategy frameworks to PM work in data platforms, AI personalization, and user-data governance.",
    details: [
      "Teaching Assistant: Negotiations Skills and Strategies (Professor Lynn Cohn)",
      "Relevant courses: Privacy Law and Regulation; IP Strategy and Management",
      "Presentation: \"The Revolution Will Not Be Live Streamed: Privacy Law in the Social Media Era\"",
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
      "Presentation: \"Oceans Rise, Properties Fall\"",
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
  {
    institution: "Trinity College",
    location: "Hartford, CT",
    dates: "Sep 2009 – May 2013",
    credential: "Bachelor of Arts in Theater & Dance, Minor in Studio Arts",
    details: [],
  },
];

// ─── Case studies ──────────────────────────────────────────────────
// Each case study lives at /case-studies/[slug]. Add new entries
// here when the article ships; the resume card grid renders them
// in array order.

export const CASE_STUDIES: ResumeCaseStudy[] = [
  {
    slug: "basecamp-coffee",
    title: "Basecamp Coffee—Find your ritual",
    description:
      "An interactive coffee-personality quiz exploring product discovery, conversational UX, and lightweight personalization for a fictional specialty roaster. Built end-to-end with Claude Code, Next.js, and Vercel.",
    href: "/case-studies/basecamp-coffee",
    liveHref: "https://quiz-project-flax-beta.vercel.app/",
  },
  {
    slug: "building-this-site",
    title: "Building this site",
    // Description carries an inline note instead of a separate
    // `liveHref` link — the live artifact is the site you're on,
    // so a "Visit the live project ↗" button would point at the
    // page that already hosts the card. Closes
    // l-resume-meta-no-livehref from the 2026-04-29 /full-review.
    description:
      "A meta case study on shipping this portfolio with Claude Code as build partner. Architecture bets, production incidents, and what AI-native PM work looks like when the human stays in the loop. The live artifact is this site.",
    href: "/case-studies/building-this-site",
  },
];
