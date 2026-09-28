// Per-essay Open Graph / Twitter card. Copy only — the shared
// generator owns the nameplate layout (lib/og/case-study-card). One
// prerendered card per registered essay (generateStaticParams +
// dynamicParams off), keyed to the essay's ogTitleLines / ogSubtitle
// so the Article JSON-LD `image` and the social unfurl match.
import {
  renderCaseStudyCard,
  OG_SIZE,
  OG_CONTENT_TYPE,
} from "@/lib/og/case-study-card";
import { ESSAYS, getEssay, WRITING_PILLARS } from "@/lib/writing/essays";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "Essay by Malcolm Xavier.";

export const dynamicParams = false;

export function generateStaticParams() {
  return ESSAYS.map((essay) => ({ pillar: essay.pillar, slug: essay.slug }));
}

export default async function OpenGraphImage({
  params,
}: {
  params: Promise<{ pillar: string; slug: string }>;
}) {
  const { pillar, slug } = await params;
  const essay = getEssay(pillar, slug);
  if (!essay) {
    return renderCaseStudyCard({
      eyebrow: "WRITING",
      titleLines: ["Malcolm Xavier"],
      titleSize: 140,
      subtitle: "Essays—built for the page.",
    });
  }
  return renderCaseStudyCard({
    eyebrow: WRITING_PILLARS[essay.pillar].label.toUpperCase(),
    titleLines: essay.ogTitleLines ?? [essay.title],
    titleSize: essay.ogTitleSize ?? 88,
    subtitle: essay.ogSubtitle ?? essay.description,
  });
}
