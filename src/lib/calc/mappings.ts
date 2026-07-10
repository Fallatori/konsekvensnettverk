/**
 * Fixed category <-> value mappings from requirments.md (MappingMethod1,
 * MappingMethod2) plus the shared indirect-impact point mapping. These are
 * dev-seeded constants, not pluggable - unlike the two formulas in
 * lib/calc/formulas/, this taxonomy itself doesn't change.
 *
 * The DB stores categories as Prisma enums (ASCII, e.g. SVAERT_LAV); this
 * module is the single place that maps those enum values to their Norwegian
 * display labels, which are used verbatim everywhere in the UI - no
 * translation step beyond this lookup.
 */
import {
  LikelihoodCategory as PrismaLikelihoodCategory,
  ConsequenceCategory as PrismaConsequenceCategory,
  NodeSubtype as PrismaNodeSubtype,
} from "@/generated/prisma/enums";

// --- Likelihood (hendelse-only) - MappingMethod1 ---

export type LikelihoodLabel = "ingen" | "svært lav" | "lav" | "middels" | "høy" | "svært høy";

export const LIKELIHOOD_LABELS: LikelihoodLabel[] = [
  "ingen",
  "svært lav",
  "lav",
  "middels",
  "høy",
  "svært høy",
];

export const LIKELIHOOD_VALUE: Record<LikelihoodLabel, number> = {
  ingen: 0,
  "svært lav": 20,
  lav: 40,
  middels: 60,
  høy: 80,
  "svært høy": 100,
};

export const LIKELIHOOD_LABEL_BY_PRISMA: Record<PrismaLikelihoodCategory, LikelihoodLabel> = {
  INGEN: "ingen",
  SVAERT_LAV: "svært lav",
  LAV: "lav",
  MIDDELS: "middels",
  HOY: "høy",
  SVAERT_HOY: "svært høy",
};

export const PRISMA_LIKELIHOOD_BY_LABEL: Record<LikelihoodLabel, PrismaLikelihoodCategory> = {
  ingen: "INGEN",
  "svært lav": "SVAERT_LAV",
  lav: "LAV",
  middels: "MIDDELS",
  høy: "HOY",
  "svært høy": "SVAERT_HOY",
};

// --- Consequence (samfunnsfunksjon-only) - MappingMethod2 ---
// Also the taxonomy used by the indirect-impact tables (catalog/*.ts).

export type ConsequenceLabel = "ingen" | "svært små" | "små" | "middels" | "store" | "svært store";

export const CONSEQUENCE_LABELS: ConsequenceLabel[] = [
  "ingen",
  "svært små",
  "små",
  "middels",
  "store",
  "svært store",
];

export const CONSEQUENCE_VALUE: Record<ConsequenceLabel, number> = {
  ingen: 0,
  "svært små": 20,
  små: 40,
  middels: 60,
  store: 80,
  "svært store": 100,
};

export const CONSEQUENCE_LABEL_BY_PRISMA: Record<PrismaConsequenceCategory, ConsequenceLabel> = {
  INGEN: "ingen",
  SVAERT_SMAA: "svært små",
  SMAA: "små",
  MIDDELS: "middels",
  STORE: "store",
  SVAERT_STORE: "svært store",
};

export const PRISMA_CONSEQUENCE_BY_LABEL: Record<ConsequenceLabel, PrismaConsequenceCategory> = {
  ingen: "INGEN",
  "svært små": "SVAERT_SMAA",
  små: "SMAA",
  middels: "MIDDELS",
  store: "STORE",
  "svært store": "SVAERT_STORE",
};

/** Nearest ConsequenceLabel bucket for a computed 0-100 value (used to derive
 * a "current category" for a node whose value came from a formula rather
 * than direct authoring, e.g. when deciding its color band). */
export function nearestConsequenceLabel(value: number): ConsequenceLabel {
  let closest: ConsequenceLabel = "ingen";
  let closestDistance = Infinity;
  for (const label of CONSEQUENCE_LABELS) {
    const distance = Math.abs(CONSEQUENCE_VALUE[label] - value);
    if (distance < closestDistance) {
      closest = label;
      closestDistance = distance;
    }
  }
  return closest;
}

// --- Indirect impact point mapping (shared across all catalog functions) ---
// Catalog indirect-impact rows are authored directly in Norwegian using this
// same ConsequenceLabel taxonomy - there is no separate English impact-label
// wording anywhere in the app.

export const INDIRECT_IMPACT_POINTS: Record<ConsequenceLabel, number> = {
  ingen: 0,
  "svært små": 1,
  små: 5,
  middels: 10,
  store: 15,
  "svært store": 20,
};

/** Reverse lookup for the edge-click strength label: an indirect edge's
 * point value (0/1/5/10/15/20) -> its Norwegian category label (e.g.
 * `store`), shown instead of the raw number. */
export function consequenceLabelForIndirectPoints(points: number): ConsequenceLabel {
  for (const label of CONSEQUENCE_LABELS) {
    if (INDIRECT_IMPACT_POINTS[label] === points) return label;
  }
  return "ingen";
}

// --- Node subtype ---
// A categorical classification applied to every node (hendelse and
// samfunnsfunksjon alike), independent of severity - drives the node's fill
// color in the graph (see lib/ui/subtypeColors.ts).

export type NodeSubtype = "hazards" | "stabilitet" | "befolkning" | "funksjon";

export const NODE_SUBTYPES: NodeSubtype[] = ["hazards", "stabilitet", "befolkning", "funksjon"];

export const NODE_SUBTYPE_LABEL: Record<NodeSubtype, string> = {
  hazards: "Hazards",
  stabilitet: "Stabilitet",
  befolkning: "Befolkning",
  funksjon: "Funksjon",
};

export const NODE_SUBTYPE_BY_PRISMA: Record<PrismaNodeSubtype, NodeSubtype> = {
  HAZARDS: "hazards",
  STABILITET: "stabilitet",
  BEFOLKNING: "befolkning",
  FUNKSJON: "funksjon",
};

export const PRISMA_NODE_SUBTYPE_BY_LABEL: Record<NodeSubtype, PrismaNodeSubtype> = {
  hazards: "HAZARDS",
  stabilitet: "STABILITET",
  befolkning: "BEFOLKNING",
  funksjon: "FUNKSJON",
};
