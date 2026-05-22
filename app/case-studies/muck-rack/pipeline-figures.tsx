// ─────────────────────────────────────────────────────────────────
// pipeline-figures — Beat 04 SVG diagrams for the muck-rack case
// study.
//
// Extracted from app/case-studies/muck-rack/page.tsx in the 2026-
// 05-20 follow-up round. The diagram code is muck-rack-only (no
// other case study imports any of these primitives), but it ran
// ~550 lines of SVG geometry inside the route module. Moving it
// here:
//
//   - drops the route file under 800 lines (readability win)
//   - gives the SVG geometry its own git change surface so diagram
//     tweaks don't dirty the prose file
//   - signals that the locality is intentional, not incidental
//
// No bundle implication — Next.js route-level code splitting
// happens at the route boundary, not within it.
//
// Module exports: PipelineBeforeFigure and PipelineAfterFigure.
// All internal helpers (diagramArrowMarker, DiagramBox,
// DiagramContainer, DiagramConnector, DiagramLine,
// PipelineFigureHeader) stay private to this file.
// ─────────────────────────────────────────────────────────────────

// ─── Pipeline diagrams (Beat 04 visuals) ──────────────────────────
// Two independent SVG figures — Before and After — that visualize
// the ingestion architecture. Schematic style mirrors the kind of
// artifact a PM would build in Miro: explicit nodes with thin
// strokes, named swim-lane containers (dashed) for logical groups,
// and directed connectors with arrowheads for the data flow. The
// scope is deliberately not collapsed — every stage, microservice,
// and nanoservice is drawn — so the visual size of the architecture
// reads as part of the story. Wide canvases (1120 / 1320 SVG units)
// horizontal-scroll within their figures on narrow viewports; the
// reader pans through the schematic rather than seeing a shrunk-
// down preview.
//
// A11y: each figure has a <figcaption> for sighted readers and an
// SVG <title> + <desc> pair (referenced via aria-labelledby on the
// <svg role="img">) so screen-reader users get the same summary
// without traversing every node.

// Reusable SVG marker for arrow ends. Inlined per-figure rather
// than once at module scope because each <svg> needs its own <defs>
// scope; the marker id is namespaced per figure to avoid collisions
// if both figures render on the same page.
function diagramArrowMarker(id: string) {
  return (
    <defs>
      <marker
        id={id}
        markerWidth={10}
        markerHeight={10}
        refX={10}
        refY={5}
        orient="auto"
        markerUnits="strokeWidth"
      >
        <path d="M 0 0 L 10 5 L 0 10 Z" fill="var(--text-caption)" />
      </marker>
    </defs>
  );
}

// DiagramBox — a labeled rectangle. One or two centered text lines.
// fontSize prop is for the rare case (e.g. a long two-line label
// like "Supplemental / enrichment") where the default 14 is too
// tight for the box width. The variant prop drives an optional
// tinted fill: "nanoservice" boxes get a subtle color-mix tint so a
// reader can distinguish them from the plain-fill microservice and
// source/consumer boxes at a glance (without having to read every
// label). Uses dominantBaseline="middle" so the y values point at
// the optical center of each line.
function DiagramBox({
  x,
  y,
  w,
  h,
  lines,
  fontSize = 14,
  variant = "default",
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  lines: string[];
  fontSize?: number;
  variant?: "default" | "nanoservice";
}) {
  const cx = x + w / 2;
  const cy = y + h / 2;
  const lineHeight = Math.round(fontSize * 1.2);
  const offset = ((lines.length - 1) * lineHeight) / 2;
  // Nanoservice tint percentage resolves to 8% in light mode and 20%
  // in dark mode via --diagram-tint-pct (defined in case-glass.css).
  // The fixed 8% collapsed to perceptually invisible against pure
  // black in dark mode (1.14:1 fill-vs-fill); the theme-conditional
  // variable restores legibility while keeping the tint subtle.
  const fill =
    variant === "nanoservice"
      ? "color-mix(in srgb, var(--text-heading) var(--diagram-tint-pct), var(--surface-page))"
      : "var(--surface-page)";
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={6}
        fill={fill}
        stroke="var(--border-default)"
        strokeWidth={1}
      />
      {lines.map((line, i) => (
        <text
          key={line}
          x={cx}
          y={cy - offset + i * lineHeight}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={fontSize}
          fill="var(--text-heading)"
          fontFamily="var(--font-secondary)"
        >
          {line}
        </text>
      ))}
    </g>
  );
}

// DiagramContainer — a dashed swim-lane around a logical group of
// boxes (e.g. "Article pipeline", "Broadcast pipeline"). Mono
// uppercase label sits at the top-left of the container; optional
// italic caption sits at the top-right of the same row (right-
// aligned), so neither competes for vertical space with the boxes
// inside the swim-lane. Dashed stroke differentiates these from the
// solid-stroke node boxes inside.
function DiagramContainer({
  x,
  y,
  w,
  h,
  label,
  caption,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  caption?: string;
}) {
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={12}
        fill="transparent"
        stroke="var(--border-default)"
        strokeWidth={1.5}
        strokeDasharray="4 4"
      />
      <text
        x={x + 16}
        y={y + 16}
        dominantBaseline="middle"
        fontSize={10}
        fill="var(--text-caption)"
        fontFamily="var(--font-mono)"
        letterSpacing="0.18em"
      >
        {label.toUpperCase()}
      </text>
      {caption && (
        <text
          x={x + w - 16}
          y={y + 16}
          textAnchor="end"
          dominantBaseline="middle"
          fontSize={12}
          fill="var(--text-caption)"
          fontFamily="var(--font-secondary)"
          fontStyle="italic"
        >
          {caption}
        </text>
      )}
    </g>
  );
}

// DiagramConnector — a single directed path with an arrowhead.
// Right-angle elbows are encoded directly in the `d` prop (e.g.
// "M x1 y1 L midX y1 L midX y2 L x2 y2") so each connector reads
// as one line of geometry in the figure body.
function DiagramConnector({
  d,
  markerId,
}: {
  d: string;
  markerId: string;
}) {
  return (
    <path
      d={d}
      fill="none"
      stroke="var(--text-caption)"
      strokeWidth={1.5}
      markerEnd={`url(#${markerId})`}
    />
  );
}

// DiagramLine — same stroke as DiagramConnector but no arrowhead.
// Used for bus + tributary lines where the directional intent is
// carried by the arrowed egress paths, and the in-bound segments
// are just "this output joins the bus." Keeps the arrowhead density
// low so the reader's eye lands on the directional arrows, not on
// the routing geometry.
function DiagramLine({ d }: { d: string }) {
  return (
    <path
      d={d}
      fill="none"
      stroke="var(--text-caption)"
      strokeWidth={1.5}
    />
  );
}

// PipelineFigureHeader — the eyebrow + headline pair above each
// figure's SVG. Mono kicker matches the case-study primitives'
// CaseStudyKicker tracking and color; the headline is a semantic
// <h3> so the figure has a clear, navigable label in the document
// outline.
function PipelineFigureHeader({
  eyebrow,
  headline,
}: {
  eyebrow: string;
  headline: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <p
        className="m-0 text-[10px] uppercase tracking-[0.22em] text-[var(--text-caption)]"
        style={{ fontFamily: "var(--font-mono)" }}
      >
        {eyebrow}
      </p>
      <h3 className="m-0 text-[20px] font-semibold leading-[1.25] tracking-[-0.01em] text-[var(--text-heading)]">
        {headline}
      </h3>
    </div>
  );
}

// ─── Figure: Before ───────────────────────────────────────────────
// Three sources funnel into one ETL pipeline (dashed swim-lane).
// The pipeline holds five serial stages: detect, process, enrich,
// download, supplemental enrichment. Output fans out to three
// consumers. Coordinates are explicit so a future maintainer can
// nudge geometry without reasoning about implicit layout.

export function PipelineBeforeFigure() {
  const ARROW = "arrow-pipeline-before";
  // No aria-labelledby on the <figure>: the inner <svg role="img">
  // carries its own aria-labelledby pointing to <title> + <desc>,
  // and the <figcaption> below is associated by HTML semantics.
  // Setting aria-labelledby on the figure produced a double
  // announcement of the figcaption content.
  //
  // mt-2 (not my-8) on the top: this figure is rendered directly
  // after the italic framing caption in BeatStrategy. The caption's
  // mb-2 collapses with this mt-2 to an 8px gap, keeping the caption
  // visually attached to the figure it introduces. The After figure
  // below keeps the full my-8/my-10 spacing so Before→After breathing
  // room is preserved.
  return (
    <figure className="mt-2 mb-8 md:mb-10 flex flex-col gap-3">
      <PipelineFigureHeader
        eyebrow="Before"
        headline="One pipeline carried everything."
      />
      {/* tabIndex + role=region + aria-label make the wide SVG
          reachable for keyboard-only users (axe scrollable-region-
          focusable). focus-visible outline matches the sitewide
          focus convention (--primary-default, 2px, 2px offset). */}
      <div
        className="overflow-x-auto touch-pan-x rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--border-focus)]"
        tabIndex={0}
        role="region"
        aria-label="Before-state ingestion pipeline diagram, scrollable horizontally"
      >
        <svg
          viewBox="0 0 1120 440"
          className="block h-auto"
          style={{ minWidth: "1120px", width: "100%" }}
          role="img"
          aria-labelledby="pipeline-before-title pipeline-before-desc"
        >
          <title id="pipeline-before-title">
            Monolithic ingestion pipeline
          </title>
          <desc id="pipeline-before-desc">
            Three sources&mdash;proprietary scraping, LexisNexis, and
            TVEyes&mdash;all feed into a single ETL pipeline whose
            five serial stages (detect, process, enrich, download,
            supplemental enrichment) run on one instance. The
            pipeline output fans out to three downstream consumers:
            search, monitoring, and reporting.
          </desc>
          {diagramArrowMarker(ARROW)}

          {/* Sources */}
          <DiagramBox x={20} y={80} w={180} h={60} lines={["Proprietary scraping"]} fontSize={13} />
          <DiagramBox x={20} y={190} w={180} h={60} lines={["LexisNexis"]} />
          <DiagramBox x={20} y={300} w={180} h={60} lines={["TVEyes"]} />

          {/* Monolith swim-lane */}
          {/* Container width 660 (not 650) gives the rightmost
              Supplemental enrichment box 20px right-padding inside
              the swim-lane, symmetric with the 20px left-padding
              around Detect. The 10px-cramped right padding read as
              tighter than the After figure's matching position. */}
          <DiagramContainer x={250} y={20} w={660} h={400} label="Single ETL pipeline" />

          {/* Stages (serial, left → right). Noun-form labels for
              taxonomic consistency with the After figure's
              microservice/nanoservice stages. "Extraction and
              Transformation" splits across two lines at fontSize=13
              to fit the widened (w=120) box; gaps between boxes
              tightened from 30px to 25px so the container width
              stays at 660. */}
          <DiagramBox x={270} y={190} w={100} h={60} lines={["Detection"]} />
          <DiagramBox x={395} y={190} w={120} h={60} lines={["Extraction and", "Transformation"]} fontSize={13} />
          <DiagramBox x={540} y={190} w={100} h={60} lines={["Enrichment"]} />
          <DiagramBox x={665} y={190} w={100} h={60} lines={["Download"]} />
          <DiagramBox x={790} y={190} w={100} h={60} lines={["Supplemental", "enrichment"]} fontSize={13} />

          {/* Inter-stage connectors (left → right) */}
          <DiagramConnector d="M 370 220 L 395 220" markerId={ARROW} />
          <DiagramConnector d="M 515 220 L 540 220" markerId={ARROW} />
          <DiagramConnector d="M 640 220 L 665 220" markerId={ARROW} />
          <DiagramConnector d="M 765 220 L 790 220" markerId={ARROW} />

          {/* Sources → first stage (fan-in) */}
          <DiagramConnector d="M 200 110 L 235 110 L 235 220 L 270 220" markerId={ARROW} />
          <DiagramConnector d="M 200 220 L 270 220" markerId={ARROW} />
          <DiagramConnector d="M 200 330 L 235 330 L 235 220 L 270 220" markerId={ARROW} />

          {/* Consumers */}
          <DiagramBox x={940} y={80} w={160} h={60} lines={["Search"]} />
          <DiagramBox x={940} y={190} w={160} h={60} lines={["Monitoring"]} />
          <DiagramBox x={940} y={300} w={160} h={60} lines={["Reporting"]} />

          {/* Last stage → consumers (fan-out) */}
          <DiagramConnector d="M 890 220 L 920 220 L 920 110 L 940 110" markerId={ARROW} />
          <DiagramConnector d="M 890 220 L 940 220" markerId={ARROW} />
          <DiagramConnector d="M 890 220 L 920 220 L 920 330 L 940 330" markerId={ARROW} />
        </svg>
      </div>
      <figcaption
        className="text-[13px] md:text-[14px] leading-[1.5] text-[var(--text-caption)]"
      >
        Three sources funnelled every content object through one
        shared ETL pipeline. Detection, extraction and transformation,
        enrichment, download, and supplemental enrichment ran serially
        on a single instance; a backlog at any stage held up every
        consumer downstream.
      </figcaption>
    </figure>
  );
}

// ─── Figure: After ────────────────────────────────────────────────
// Per-content-type swim-lanes (Article, Broadcast) each contain
// one or more end-to-end per-source pipelines. Each pipeline runs
// detect / extract / transform in its own microservice, then
// enrichment / download / supplemental enrichment in its own copy
// of the nanoservices — the nanoservices are duplicated per source
// and configured per content type, sharing only their shape. Every
// pipeline's output fans out independently to the same three
// consumers, so backpressure on any one pipeline doesn't block any
// other. The diagram is deliberately the widest figure on the page:
// the scope of the decomposition is part of the story.

export function PipelineAfterFigure() {
  const ARROW = "arrow-pipeline-after";

  // Branch y-centers — three end-to-end pipelines. Each branch's
  // y aligns with both its source on the left and the corresponding
  // microservice/nanoservices row inside its swim-lane.
  const Y_ART_SCR = 190;
  const Y_ART_LEX = 290;
  const Y_BCAST_TV = 510;

  // Consumer y-centers. Evenly distributed across the canvas so
  // every fan-out arrow has a clean horizontal or two-elbow path.
  const Y_SEARCH = 190;
  const Y_MONITOR = 350;
  const Y_REPORT = 510;

  // Output bus x-position. The three branches feed the bus from
  // the left (no arrowheads); three taps come off the bus to the
  // three consumers (with arrowheads). One vertical line replaces
  // a tangled 9-arrow fan-out.
  const BUS_X = 920;

  return (
    <figure className="my-8 md:my-10 flex flex-col gap-3">
      <PipelineFigureHeader
        eyebrow="After"
        headline="A fleet of end-to-end pipelines, one per source."
      />
      {/* tabIndex + role=region + aria-label make the wide SVG
          reachable for keyboard-only users (axe scrollable-region-
          focusable). focus-visible outline matches the sitewide
          focus convention (--primary-default, 2px, 2px offset). */}
      <div
        className="overflow-x-auto touch-pan-x rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--border-focus)]"
        tabIndex={0}
        role="region"
        aria-label="After-state ingestion pipeline diagram, scrollable horizontally"
      >
        <svg
          viewBox="0 0 1200 620"
          className="block h-auto"
          style={{ minWidth: "1200px", width: "100%" }}
          role="img"
          aria-labelledby="pipeline-after-title pipeline-after-desc"
        >
          <title id="pipeline-after-title">Decomposed ingestion fleet</title>
          <desc id="pipeline-after-desc">
            Three sources&mdash;proprietary scraping, LexisNexis, and
            TVEyes&mdash;each get their own end-to-end pipeline,
            grouped by content type. The Article swim-lane holds two
            pipelines (scraping, LexisNexis) and the Broadcast
            swim-lane holds one (TVEyes). Every pipeline runs detect,
            extract, and transform in its own microservice, then runs
            its own copy of three nanoservices&mdash;enrichment,
            download, supplemental enrichment&mdash;configured for
            its content type. The nanoservices are duplicated per
            source and share only their shape across pipelines. Each
            pipeline's output fans out independently to the same
            three consumers: search, monitoring, and reporting.
          </desc>
          {diagramArrowMarker(ARROW)}

          {/* Sources — each y-aligned with its corresponding
              microservice row on the right. */}
          <DiagramBox x={20} y={160} w={180} h={60} lines={["Proprietary scraping"]} fontSize={13} />
          <DiagramBox x={20} y={260} w={180} h={60} lines={["LexisNexis"]} />
          <DiagramBox x={20} y={480} w={180} h={60} lines={["TVEyes"]} />

          {/* Article pipeline swim-lane — holds two end-to-end
              pipelines (scraping, LexisNexis). Height tuned so the
              first row sits ~60px below the swim-lane label and the
              last row sits ~60px above the bottom edge, giving
              symmetric vertical rhythm. Caption sits at the top
              right of the label row so it doesn't compete with the
              boxes inside for vertical space. */}
          <DiagramContainer
            x={260}
            y={100}
            w={640}
            h={280}
            label="Article pipeline"
            caption="Nanoservices are configured for article content."
          />
          {/* Article — Scraping pipeline (top row). Microservice
              keeps the default fill; the three downstream
              nanoservices use the tinted nanoservice variant. */}
          <DiagramBox x={290} y={160} w={140} h={60} lines={["Scraping", "microservice"]} fontSize={13} />
          <DiagramBox x={460} y={160} w={100} h={60} lines={["Enrichment"]} variant="nanoservice" />
          <DiagramBox x={590} y={160} w={100} h={60} lines={["Download"]} variant="nanoservice" />
          <DiagramBox x={720} y={160} w={130} h={60} lines={["Supplemental", "enrichment"]} fontSize={13} variant="nanoservice" />
          {/* Article — LexisNexis pipeline (bottom row) */}
          <DiagramBox x={290} y={260} w={140} h={60} lines={["LexisNexis", "microservice"]} fontSize={13} />
          <DiagramBox x={460} y={260} w={100} h={60} lines={["Enrichment"]} variant="nanoservice" />
          <DiagramBox x={590} y={260} w={100} h={60} lines={["Download"]} variant="nanoservice" />
          <DiagramBox x={720} y={260} w={130} h={60} lines={["Supplemental", "enrichment"]} fontSize={13} variant="nanoservice" />

          {/* Broadcast pipeline swim-lane — holds one end-to-end
              pipeline (TVEyes). Same internal padding pattern as
              Article (~60px top/bottom around the row) so the two
              swim-lanes share a vertical rhythm. */}
          <DiagramContainer
            x={260}
            y={420}
            w={640}
            h={180}
            label="Broadcast pipeline"
            caption="Nanoservices are configured for broadcast content."
          />
          {/* Broadcast — TVEyes pipeline */}
          <DiagramBox x={290} y={480} w={140} h={60} lines={["TVEyes", "microservice"]} fontSize={13} />
          <DiagramBox x={460} y={480} w={100} h={60} lines={["Enrichment"]} variant="nanoservice" />
          <DiagramBox x={590} y={480} w={100} h={60} lines={["Download"]} variant="nanoservice" />
          <DiagramBox x={720} y={480} w={130} h={60} lines={["Supplemental", "enrichment"]} fontSize={13} variant="nanoservice" />

          {/* Consumers — evenly distributed vertically (190, 350,
              510) for clean fan-out paths from the three branches. */}
          <DiagramBox x={1000} y={160} w={180} h={60} lines={["Search"]} />
          <DiagramBox x={1000} y={320} w={180} h={60} lines={["Monitoring"]} />
          <DiagramBox x={1000} y={480} w={180} h={60} lines={["Reporting"]} />

          {/* Sources → matching microservices (1:1) */}
          <DiagramConnector d={`M 200 ${Y_ART_SCR} L 290 ${Y_ART_SCR}`} markerId={ARROW} />
          <DiagramConnector d={`M 200 ${Y_ART_LEX} L 290 ${Y_ART_LEX}`} markerId={ARROW} />
          <DiagramConnector d={`M 200 ${Y_BCAST_TV} L 290 ${Y_BCAST_TV}`} markerId={ARROW} />

          {/* Article Scraping pipeline — inter-stage connectors */}
          <DiagramConnector d={`M 430 ${Y_ART_SCR} L 460 ${Y_ART_SCR}`} markerId={ARROW} />
          <DiagramConnector d={`M 560 ${Y_ART_SCR} L 590 ${Y_ART_SCR}`} markerId={ARROW} />
          <DiagramConnector d={`M 690 ${Y_ART_SCR} L 720 ${Y_ART_SCR}`} markerId={ARROW} />

          {/* Article LexisNexis pipeline — inter-stage connectors */}
          <DiagramConnector d={`M 430 ${Y_ART_LEX} L 460 ${Y_ART_LEX}`} markerId={ARROW} />
          <DiagramConnector d={`M 560 ${Y_ART_LEX} L 590 ${Y_ART_LEX}`} markerId={ARROW} />
          <DiagramConnector d={`M 690 ${Y_ART_LEX} L 720 ${Y_ART_LEX}`} markerId={ARROW} />

          {/* Broadcast TVEyes pipeline — inter-stage connectors */}
          <DiagramConnector d={`M 430 ${Y_BCAST_TV} L 460 ${Y_BCAST_TV}`} markerId={ARROW} />
          <DiagramConnector d={`M 560 ${Y_BCAST_TV} L 590 ${Y_BCAST_TV}`} markerId={ARROW} />
          <DiagramConnector d={`M 690 ${Y_BCAST_TV} L 720 ${Y_BCAST_TV}`} markerId={ARROW} />

          {/* Output bus. Each branch's Supplemental enrichment
              feeds the bus from the left (plain lines, no
              arrowheads); the bus is one continuous vertical line;
              three taps come off the bus to the three consumers
              (arrowed). One shared routing visual replaces 9 direct
              fan-out arrows, and the arrowheads now read as
              "consumers receive" rather than competing with the
              upstream wiring. */}

          {/* Branch outputs → bus (no arrowheads) */}
          <DiagramLine d={`M 850 ${Y_ART_SCR} L ${BUS_X} ${Y_ART_SCR}`} />
          <DiagramLine d={`M 850 ${Y_ART_LEX} L ${BUS_X} ${Y_ART_LEX}`} />
          <DiagramLine d={`M 850 ${Y_BCAST_TV} L ${BUS_X} ${Y_BCAST_TV}`} />

          {/* Bus (no arrowhead) — spans top to bottom of the
              connection range, from Article Scraping input down to
              Broadcast TVEyes input. */}
          <DiagramLine d={`M ${BUS_X} ${Y_ART_SCR} L ${BUS_X} ${Y_BCAST_TV}`} />

          {/* Bus taps → consumers (arrowheads) */}
          <DiagramConnector d={`M ${BUS_X} ${Y_SEARCH} L 1000 ${Y_SEARCH}`} markerId={ARROW} />
          <DiagramConnector d={`M ${BUS_X} ${Y_MONITOR} L 1000 ${Y_MONITOR}`} markerId={ARROW} />
          <DiagramConnector d={`M ${BUS_X} ${Y_REPORT} L 1000 ${Y_REPORT}`} markerId={ARROW} />
        </svg>
      </div>
      <figcaption
        className="text-[13px] md:text-[14px] leading-[1.5] text-[var(--text-caption)]"
      >
        Each source got its own end-to-end pipeline. Inside the
        Article and Broadcast swim-lanes, every source ran its own
        microservice (detection, extraction, transformation) followed
        by its own copy of three nanoservices&mdash;enrichment,
        download, supplemental enrichment&mdash;configured for its
        content type. The nanoservices share a shape across pipelines, not
        an instance. Every pipeline's output fans out independently
        to the same three consumers. Enrichment and supplemental
        enrichment also drew on external audience and viewership
        data sources outside the content pipelines, not detailed
        here.
      </figcaption>
    </figure>
  );
}

