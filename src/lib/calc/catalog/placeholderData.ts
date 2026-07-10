/**
 * TODO: every catalog/<function-key>.ts file currently uses THIS
 * placeholder data - an example functionality table, and a simple "mirrors
 * its own severity onto every other function" rule for indirect impact.
 * Replace both per function with real data; this file exists only to keep
 * that placeholder consistent and easy to swap out.
 */
import { CONSEQUENCE_LABELS, type ConsequenceLabel } from "@/lib/calc/mappings";
import type { FunctionalityTable, IndirectImpactRow } from "@/lib/calc/catalog/types";

// The example functionality table from requirments.md.
export const PLACEHOLDER_FUNCTIONALITY_TABLE: FunctionalityTable = {
  ingen: { 1: 100, 3: 100, 7: 100, 30: 100, 90: 100 },
  "svært små": { 1: 95, 3: 100, 7: 100, 30: 100, 90: 100 },
  små: { 1: 90, 3: 100, 7: 100, 30: 100, 90: 100 },
  middels: { 1: 80, 3: 90, 7: 100, 30: 100, 90: 100 },
  store: { 1: 60, 3: 80, 7: 100, 30: 100, 90: 100 },
  "svært store": { 1: 40, 3: 60, 7: 80, 30: 100, 90: 100 },
};

/**
 * Placeholder indirect-impact row: a function at category X induces category
 * X on every other function (a naive 1:1 mirror). This is NOT real domain
 * data - it only exists so the app is runnable end-to-end before you supply
 * the real per-function-pair impact matrix.
 */
export function placeholderIndirectImpactRow(otherFunctionKeys: string[]): IndirectImpactRow {
  const row = {} as IndirectImpactRow;
  for (const ownCategory of CONSEQUENCE_LABELS) {
    const inducedOnOthers: Record<string, ConsequenceLabel> = {};
    for (const otherKey of otherFunctionKeys) {
      inducedOnOthers[otherKey] = ownCategory;
    }
    row[ownCategory] = inducedOnOthers;
  }
  return row;
}
