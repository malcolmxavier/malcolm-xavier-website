// ─────────────────────────────────────────────────────────────────
// Project: "Oceans Rise, Properties Fall" — DS4A data-science capstone.
//
// A curated on-site rendering of the team's final report. This is NOT
// the verbatim report (that ships as the report.pdf download): the ToC,
// the column-level data-cleaning minutiae, and the thank-yous are
// dropped, and the narrative is tightened to foreground the modeling
// story and its honest limits. Numbers are quoted exactly from the
// report. The datafolio is the visual anchor near the top; the full
// datafolio and report are downloads in the shell (from meta below).
//
// `meta` is consumed by lib/projects/projects.ts (the registry); the
// default export is the article body, rendered inside ArticleContainer
// by app/projects/[slug]/page.tsx.
// ─────────────────────────────────────────────────────────────────

import { Body, Emph } from "@/components/case-study/primitives";
import { Link } from "@/components/primitives/Link";
import { ProjectSection } from "@/components/projects/ProjectSection";
import { Figure } from "@/components/projects/Figure";
import { EDUCATION, slugifyEducationAnchor } from "@/app/resume/resume-data";
import type { ProjectMeta } from "@/lib/projects/types";

// Resolve the résumé education entry this capstone came out of, so the
// dateline's "DS4A" chip jump-links to it and stays in sync if that
// entry's dates change. Matched on the "DS4A" marker in the institution
// name (only the Correlation One entry carries it).
const DS4A_EDU = EDUCATION.find((e) => e.institution.includes("DS4A"));

export const meta: ProjectMeta = {
  slug: "sea-level-rise-florida",
  kind: "Data-science capstone",
  title: "Oceans Rise, Properties Fall",
  metaTitle: "Oceans Rise, Properties Fall",
  subtitle:
    "Quantifying the economic loss projected sea level rise will force on Florida’s housing market—and mapping where it lands first.",
  description:
    "A DS4A data-science capstone modeling the economic loss projected sea level rise will inflict on Florida’s housing market: which counties flood first, and how much property value is at risk.",
  authors: [
    { name: "Malcolm Xavier", self: true },
    { name: "Alex De Mouy" },
    { name: "Jacob Kasner" },
    { name: "Fernando Narbona" },
  ],
  dateDisplay: "2021",
  datePublished: "2021-03-15",
  readMin: 5,
  // "DS4A" in the dateline jump-links to the résumé's DS4A education
  // entry. Anchor resolved from the résumé data so it can't drift.
  credential: DS4A_EDU
    ? { label: "DS4A", href: `/resume#${slugifyEducationAnchor(DS4A_EDU)}` }
    : undefined,
  downloads: [
    {
      label: "Download the full report",
      href: "/projects/sea-level-rise-florida/report.pdf",
      meta: "PDF · 490 KB",
    },
    {
      label: "Download the datafolio",
      href: "/projects/sea-level-rise-florida/datafolio.pdf",
      meta: "PDF · 399 KB",
    },
  ],
  noindex: true,
};

export default function OceansRisePropertiesFall() {
  return (
    <>
      <Body>
        <p>
          This was our capstone for{" "}
          <Link href="https://www.correlation-one.com/data-skills-for-all">
            Data Science for All
          </Link>{" "}
          (DS4A), Correlation One’s applied data-science program. Four of us
          spent the program on a single question: how do you put a dollar figure
          on what rising seas will take from Florida’s housing market—one of the
          largest asset markets contributing to global wealth?
        </p>
        <p>
          We assembled a dozen public datasets, modeled residential property
          values, projected loss out to 2100, and shipped an interactive
          dashboard aimed at the people who could actually act on it: city
          planners and developers. The headline we landed on is blunt. Within
          ten years, sea level rise reaches every county in the Miami, Cape
          Coral, North Port, and Tampa metro regions—an area of 22,456,309,262
          square meters, representing $351,493,105,459 in property value and
          housing 2,093,815 people.
        </p>
      </Body>

      <Figure
        src="/projects/sea-level-rise-florida/datafolio.webp"
        alt="The project datafolio: a single-page visual summary of the sea-level-rise property-loss analysis, showing Florida flooding-impact maps, at-risk property-value figures, population density, and interstate-migration charts."
        width={2560}
        height={1440}
        caption="The datafolio—our one-page visual summary of the analysis."
        href="/projects/sea-level-rise-florida/datafolio.pdf"
        hrefLabel="Open the full datafolio (PDF)"
      />

      <ProjectSection id="the-question" title="The question">
        <Body>
          <p>
            For hundreds of years we have traded the environment for economic
            “progress.” One bill now coming due is sea level rise, which will
            force coastal areas and their inhabitants inland—and with them, an
            enormous quantity of real estate. In the last 60 years, sea level
            has risen 6 inches nationally; over the next 20 it is projected to
            rise another 6. South Florida, now called sea-level-rise “ground
            zero,” is rising faster still—about an inch every 3 years, more than
            1.5× the national rate. As recently as 2019, an{" "}
            <Link href="https://www.insurancejournal.com/news/southeast/2019/07/24/533723.htm">
              estimated
            </Link>{" "}
            3.5 million Floridians were already at risk from coastal flooding.
          </p>
          <p>
            The exposure is not only coastal.{" "}
            <Link href="https://www.census.gov/library/stories/2019/07/millions-of-americans-live-coastline-regions.html">
              94.7 million Americans—28.6% of the population
            </Link>
            —live in coastal regions and could migrate inland as flooding claims
            homes, and the landlocked states that border the coasts are not
            ready for that influx. Our project set out to identify the at-risk
            areas, estimate total property loss across time, and give developers
            and policymakers a reason to invest inland and rebuild consciously.
          </p>
        </Body>
      </ProjectSection>

      <ProjectSection id="the-data" title="The data we assembled">
        <Body>
          <p>
            No single source answers the question, so we joined several. Census{" "}
            <Link href="https://www.census.gov/geographies/mapping-files/time-series/geo/carto-boundary-file.html">
              cartographic boundary files
            </Link>{" "}
            gave us land and water area by tract; population and housing-unit
            counts came in at the tract level; the{" "}
            <Link href="https://www.ucsusa.org/resources/when-rising-seas-hit-home">
              Union of Concerned Scientists
            </Link>{" "}
            supplied inundation, property-tax, and economic-impact projections
            by county and year;{" "}
            <Link href="https://www.redfin.com/news/data-center/">
              Redfin
            </Link>{" "}
            migration data let us group counties by their nearest metro; the{" "}
            <Link href="https://www.usgs.gov/">USGS</Link> National Elevation
            Dataset gave us a median elevation per county; and the American
            Community Survey provided ten years of housing-value history
            (2010–2019) for the price model. We filtered flooding projections to
            the high-severity scenario throughout—the worst case is the one
            worth planning against.
          </p>
        </Body>
      </ProjectSection>

      <ProjectSection id="the-model" title="The model, and where it broke">
        <Body>
          <p>
            The price model is where the work got honest. Real-estate data is
            heavily privatized, so the Census was the best public source we
            could find—and it came with collinearity baked in. We reduced from
            roughly 150 features to about 60 by hand using domain knowledge,
            then used scikit-learn’s <Emph>SelectKBest</Emph> to cut further;
            our best results held at 10 features, which still carried some
            collinearity that further reduction wouldn’t resolve. We proceeded
            with eyes open. Standardizing the variables and fitting a simple
            linear regression gave an R² of about 70% and an RMSE of roughly
            $93,000—a decent-but-imperfect fit, enough to show the data could be
            modeled as a function we could push further.
          </p>
          <p>
            To project prices decades into the future we turned to{" "}
            <Emph>FB Prophet</Emph>, a time-series library with seasonality
            already built in—chosen as much for our time constraints as its
            fit. Two limits surfaced fast. Testing across every tract pushed
            runtime past four hours, so we aggregated up to the county level.
            And with only ten annual data points per series, projecting eighty
            years out produced unrealistic trends—negative house prices
            included—until we added a smoothing step and swept a combinatorial
            grid of hyperparameters to tame them. Even then, Prophet predicted
            accurately for only about 13 of our 68 counties. Naming that
            ceiling is the point: we built a working pipeline, and we can tell
            you exactly where it stops being trustworthy.
          </p>
        </Body>
      </ProjectSection>

      <ProjectSection id="findings" title="What the numbers said">
        <Body>
          <p>
            Within ten years, sea level rise affects every county in the Miami,
            Cape Coral, North Port, and Tampa metro regions—22,456,309,262
            square meters at risk, $351,493,105,459 in property value, and a
            population of 2,093,815. By 2021, 6 of 32 affected coastal counties
            were projected to be chronically more than 90% inundated. The
            displacement radiates outward: the interstate migration pressure
            lands hardest on Georgia, Texas, California, Tennessee, and
            Virginia, each of which inherits a direct hit to its economic
            resources. Absent coordinated action between government and
            developers—climate policy, sea-wall infrastructure—sizeable parts
            of Florida simply cease to exist.
          </p>
          <p>
            The honest caveat rides alongside the figure. Collinearity persists
            in the most robust dataset we could find, because the data we truly
            needed is privatized and costly. We reduced the feature set
            substantially and fit the regression at R² ≈ 70%; the forward
            price projection was only partly successful. The point estimate is
            real and defensible; the eighty-year forecast is a direction, not a
            promise.
          </p>
        </Body>
      </ProjectSection>

      <ProjectSection id="future-work" title="Future work">
        <Body>
          <p>
            The models here should be extended to other coastal states to build
            a regional and national picture—one that, on similarly trending
            findings, could warrant federal recommendation. Carbon-emissions
            data should be folded in so the model can measure how effective
            different climate responses actually are, rather than only sizing
            the damage. And the social dimensions deserve their own reporting:
            the potential for full displacement, for people becoming unhoused,
            and for gentrification—so that any proposal to a government or
            development office carries the human cost alongside the property
            one.
          </p>
        </Body>
      </ProjectSection>
    </>
  );
}
