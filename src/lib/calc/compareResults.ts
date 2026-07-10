import type { RecomputeResult } from "@/lib/calc/recompute";

export type ComparisonBucket = "newlyAffected" | "increased" | "decreased" | "unchanged";

export type NodeComparison = {
  id: string;
  label: string;
  baseline: number;
  current: number;
  delta: number;
  bucket: ComparisonBucket;
};

export type ComparisonResult = {
  /** Sorted by |delta| descending. */
  nodes: NodeComparison[];
  countsByBucket: Record<ComparisonBucket, number>;
  /** Average delta across nodes with baseline > 0 - nodes with no baseline
   * value are excluded since they only ever add positive delta and would
   * skew "did things get better or worse overall". */
  averageDelta: number;
};

type ValueEntry = { label: string; value: number };

/**
 * Generic baseline-vs-current diff (lib/calc/compareResults.ts in the plan) -
 * not hardcoded to scenario defaults, so it powers both the persistent
 * Comparison Dashboard (baseline = scenario defaults) and the inline
 * edit-impact summary (baseline = previous /recompute response).
 */
export function compareResults(
  baseline: Map<string, ValueEntry>,
  current: Map<string, ValueEntry>,
): ComparisonResult {
  const ids = new Set([...baseline.keys(), ...current.keys()]);
  const nodes: NodeComparison[] = [];

  for (const id of ids) {
    const baselineValue = baseline.get(id)?.value ?? 0;
    const currentValue = current.get(id)?.value ?? 0;
    const label = current.get(id)?.label ?? baseline.get(id)?.label ?? id;
    const delta = currentValue - baselineValue;

    let bucket: ComparisonBucket;
    if (baselineValue === 0 && currentValue > 0) bucket = "newlyAffected";
    else if (delta > 0 && baselineValue > 0) bucket = "increased";
    else if (delta < 0) bucket = "decreased";
    else bucket = "unchanged";

    nodes.push({ id, label, baseline: baselineValue, current: currentValue, delta, bucket });
  }

  nodes.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

  const countsByBucket: Record<ComparisonBucket, number> = {
    newlyAffected: 0,
    increased: 0,
    decreased: 0,
    unchanged: 0,
  };
  let sum = 0;
  let count = 0;
  for (const node of nodes) {
    countsByBucket[node.bucket]++;
    if (node.baseline > 0) {
      sum += node.delta;
      count++;
    }
  }

  return { nodes, countsByBucket, averageDelta: count > 0 ? sum / count : 0 };
}

function samfunnsfunksjonNodes(result: RecomputeResult) {
  return result.nodes.filter((node) => !node.isHendelse);
}

/** Baseline = each node's scenario-authored default; current = its final
 * totalConsequenceValue from the same /recompute response. */
export function compareToOriginal(result: RecomputeResult): ComparisonResult {
  const baseline = new Map<string, ValueEntry>();
  const current = new Map<string, ValueEntry>();
  for (const node of samfunnsfunksjonNodes(result)) {
    baseline.set(node.id, { label: node.label, value: node.originalConsequenceValue });
    current.set(node.id, { label: node.label, value: node.totalConsequenceValue });
  }
  return compareResults(baseline, current);
}

/** Baseline = the previous /recompute response; current = the new one - used
 * for the edit-impact summary ("as a result of this change"). */
export function compareToPrevious(
  previous: RecomputeResult,
  next: RecomputeResult,
): ComparisonResult {
  const baseline = new Map<string, ValueEntry>();
  const current = new Map<string, ValueEntry>();
  for (const node of samfunnsfunksjonNodes(previous)) {
    baseline.set(node.id, { label: node.label, value: node.totalConsequenceValue });
  }
  for (const node of samfunnsfunksjonNodes(next)) {
    current.set(node.id, { label: node.label, value: node.totalConsequenceValue });
  }
  return compareResults(baseline, current);
}
