// ─────────────────────────────────────────────────────────────────
// /case-studies/basecamp-coffee — route layout.
//
// Two jobs:
//
//   1. Load the Basecamp brand fonts (Fraunces / Space Grotesk /
//      JetBrains Mono) only when this route is visited. They ship
//      via next/font as scoped CSS variables, so they don't conflict
//      with malxavi's recruiter / sub-brand fonts.
//
//   2. Wrap children in a `data-case-study="basecamp"` element. All
//      the Basecamp brand styles (basecamp.css) are scoped to that
//      attribute, which keeps the dark cream-on-brown palette from
//      bleeding into the rest of the site.
//
// Why we keep Basecamp's brand here instead of restyling in malxavi's
// recruiter cluster: the case study is a portable artifact about a
// specific client / project. Stripping its brand to fit malxavi's
// palette would translate work into a foreign accent. Better to keep
// the original — and explain that decision in the personal-website
// case study at /case-studies/building-this-site.
// ─────────────────────────────────────────────────────────────────

import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Fraunces, Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "./basecamp.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["400", "500"],
  style: ["normal", "italic"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Basecamp Coffee — Case Study",
  description:
    "How I used Claude Code to diagnose a collapsing loyalty program and ship a working prototype. A Growth PM portfolio artifact.",
  alternates: {
    canonical: "/case-studies/basecamp-coffee",
  },
  openGraph: {
    title: "Basecamp Coffee — Case Study",
    description:
      "How I used Claude Code to diagnose a collapsing loyalty program and ship a working prototype. A Growth PM portfolio artifact.",
    type: "article",
  },
};

export default function BasecampCaseStudyLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div
      data-case-study="basecamp"
      className={`${spaceGrotesk.variable} ${fraunces.variable} ${jetbrainsMono.variable}`}
    >
      {children}
    </div>
  );
}
