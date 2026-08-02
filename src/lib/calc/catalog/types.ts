import type { ConsequenceLabel, NodeSubtype } from "@/lib/calc/mappings";

export const TIMEFRAME_DAYS = [1, 3, 7, 30, 90] as const;
export type TimeframeDays = (typeof TIMEFRAME_DAYS)[number];

/** Functionality-recovery % at day 1 and at each later timeframe, per category. */
export type FunctionalityTable = Record<ConsequenceLabel, Record<TimeframeDays, number>>;

/**
 * For each of this function's own (non-"ingen") categories, the impact
 * category it induces on every other catalog function. Indexed
 * [ownCategory][targetFunctionKey] -> impact category on that target.
 */
export type IndirectImpactRow = Record<ConsequenceLabel, Record<string, ConsequenceLabel>>;

/** A catalog entry is either a societal function or a hazard/event. */
export type CatalogEntryType = "funksjon" | "fare";

/** The samfunnsverdi ("societal value") an entry belongs to, spelled out -
 * the authored form in domainData.json. Maps 1:1 onto the internal short
 * NodeSubtype keys: stabilitet | befolkning | funksjon. */
export type CatalogSubtypeLabel =
  | "Styringsevne og suverenitet"
  | "Befolkningens sikkerhet"
  | "Samfunnets funksjonalitet";

export type CatalogEntry = {
  functionKey: string;
  /** Norwegian display label (e.g. "Kraftforsyning"). */
  label: string;
  /** Whether this entry is a societal function or a hazard/event. */
  type: CatalogEntryType;
  /** This function's default classification - used for any node created
   * from it, including nodes synthesized when the indirect toggle reveals
   * a function that has no scenario-authored Node row. */
  subtype: NodeSubtype;
  /** The full samfunnsverdi name behind `subtype`, as authored in
   * domainData.json (e.g. "Samfunnets funksjonalitet"). */
  subtypeLabel: CatalogSubtypeLabel;
  /** Prose definition of what this function covers. */
  definition: string;
  functionalityTable: FunctionalityTable;
  indirectImpactRow: IndirectImpactRow;
};
