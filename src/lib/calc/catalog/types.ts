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

export type CatalogEntry = {
  functionKey: string;
  /** Norwegian display label (e.g. "Kraftforsyning"). */
  label: string;
  /** This function's default classification - used for any node created
   * from it, including nodes synthesized when the indirect toggle reveals
   * a function that has no scenario-authored Node row. */
  subtype: NodeSubtype;
  functionalityTable: FunctionalityTable;
  indirectImpactRow: IndirectImpactRow;
};
