import type { IndirectImpactRow } from "@/lib/calc/catalog/types";
import { INDIRECT_IMPACT_POINTS, type ConsequenceLabel } from "@/lib/calc/mappings";

export type IndirectSource = {
  functionKey: string;
  /** The source's TIMED (decayed) category, not its original base category -
   * this is what indirectImpactRow is indexed by. */
  timedCategory: ConsequenceLabel;
  indirectImpactRow: IndirectImpactRow;
};

export type IndirectContribution = {
  sourceFunctionKey: string;
  points: number;
  label: ConsequenceLabel;
};

/**
 * ComputeIndirectConsequenceMethod, single-target step (fully defined):
 * every nonzero contribution from every source, for one target function.
 * Ind_i (the number that feeds totalConsequenceValue) is the MAX of these
 * points - but every nonzero contribution is returned so the caller can draw
 * an indirect edge for each one, not only the winner.
 *
 * Pure function - takes each source's indirectImpactRow directly rather than
 * looking it up itself, so it has no dependency on the catalog module.
 */
export function listIndirectContributions(
  targetFunctionKey: string,
  sources: IndirectSource[],
): IndirectContribution[] {
  const contributions: IndirectContribution[] = [];

  for (const source of sources) {
    if (source.functionKey === targetFunctionKey) continue;

    const inducedLabel = source.indirectImpactRow[source.timedCategory]?.[targetFunctionKey];
    if (!inducedLabel) continue;

    const points = INDIRECT_IMPACT_POINTS[inducedLabel];
    if (points > 0) {
      contributions.push({ sourceFunctionKey: source.functionKey, points, label: inducedLabel });
    }
  }

  return contributions;
}

/** Ind_i = max over all contributing sources (max, not sum). */
export function maxIndirectContribution(contributions: IndirectContribution[]): IndirectContribution {
  let best: IndirectContribution = { sourceFunctionKey: "", points: 0, label: "ingen" };
  for (const contribution of contributions) {
    if (contribution.points > best.points) best = contribution;
  }
  return best;
}
