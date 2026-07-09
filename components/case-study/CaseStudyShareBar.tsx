// ─────────────────────────────────────────────────────────────────
// CaseStudyShareBar — the mobile/tablet share affordance for case
// studies. Sits directly under the hero (title + subtitle + lede) so a
// reader can send the piece on before committing to the full read.
//
// This is the < lg fallback ONLY (lg:hidden): on lg+ the share lives
// in the sticky TOC rail (CaseStudyTocRail), which follows the reader
// down the page — but that rail isn't rendered below lg, so this
// under-hero bar covers phones and small tablets where the rail is
// absent.
//
// Derives the shared title + canonical href from the CASE_STUDIES
// registry off `currentSlug` (same source CaseStudyNav and the rail
// use), so the per-page call sites only pass the slug they already
// have. Professional emphasis, since case studies are recruiter-facing.
// Shares the article's reading column via CASE_STUDY_WIDTH so it stays
// aligned.
// ─────────────────────────────────────────────────────────────────

import { CASE_STUDIES } from "@/app/resume/resume-data";
import { ShareBar } from "@/components/share/ShareBar";
import { CASE_STUDY_WIDTH } from "./primitives";

interface CaseStudyShareBarProps {
  /** Slug of the current case study; must match a `slug` in
   *  CASE_STUDIES. Resolves the title + href to share. */
  currentSlug: string;
}

export function CaseStudyShareBar({ currentSlug }: CaseStudyShareBarProps) {
  const study = CASE_STUDIES.find((s) => s.slug === currentSlug);
  if (!study) return null;

  return (
    <div className={`${CASE_STUDY_WIDTH} lg:hidden mt-2 mb-8 md:mb-10`}>
      <ShareBar
        path={study.href}
        title={study.title}
        emphasis="professional"
        surface="case-study"
        campaign={`case-study-${currentSlug}`}
        label="Share this case study"
        labelPlacement="block"
      />
    </div>
  );
}
