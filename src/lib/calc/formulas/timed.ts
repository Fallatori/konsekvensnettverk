import type { FunctionalityTable, TimeframeDays } from "@/lib/calc/catalog/types";
import type { ConsequenceLabel } from "@/lib/calc/mappings";

/**
 * ComputeTimedConsequenceMethod (fully defined, per requirments.md +
 * confirmed formula): V_dx = V_d1 * (1 - (F_dx - F_d1) / (100 - F_d1))
 *
 * Pure function - takes the function's OWN functionality table directly
 * rather than looking it up itself, so it's testable with inline fixtures
 * and has no dependency on the catalog module.
 */
export function computeTimedConsequenceValue(params: {
  consequenceValue: number; // V_d1, from CONSEQUENCE_VALUE[category]
  category: ConsequenceLabel;
  functionalityTable: FunctionalityTable;
  timeframeDays: TimeframeDays;
}): number {
  const { consequenceValue, category, functionalityTable, timeframeDays } = params;
  const table = functionalityTable[category];

  const fD1 = table[1];
  const fDx = table[timeframeDays];
  const denominator = 100 - fD1;

  // Guard: e.g. "ingen" has F_d1=100 for every day in the example table,
  // which would divide by zero. consequenceValue is already 0 for "ingen"
  // via MappingMethod2, so returning 0 here is exact, not an approximation.
  if (denominator === 0) return 0;

  return consequenceValue * (1 - (fDx - fD1) / denominator);
}
