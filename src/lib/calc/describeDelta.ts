import type { ComparisonResult, NodeComparison } from "@/lib/calc/compareResults";

export type DescribeFraming = "vsScenarioDefaults" | "sinceLastChange";

const FRAMING_PREFIX: Record<DescribeFraming, string> = {
  vsScenarioDefaults: "Sammenlignet med scenariets standardverdier",
  sinceLastChange: "Som følge av denne endringen",
};

const MAX_NAMED_PER_BUCKET = 3;

function formatSignedDelta(delta: number): string {
  const rounded = Math.round(delta);
  return rounded > 0 ? `+${rounded}` : `${rounded}`;
}

function namedList(nodes: NodeComparison[]): string {
  return nodes.map((node) => `${node.label} ${formatSignedDelta(node.delta)}`).join(", ");
}

function bucketSentence(nodes: NodeComparison[], countPhrase: (count: number) => string): string | null {
  if (nodes.length === 0) return null;

  // Already sorted by |delta| desc from compareResults.
  const named = nodes.slice(0, MAX_NAMED_PER_BUCKET);
  const base = countPhrase(nodes.length);

  if (nodes.length > MAX_NAMED_PER_BUCKET) {
    // Falls back to counts-only when there are more movers than fit readably.
    return base;
  }
  return `${base} (${namedList(named)})`;
}

/**
 * Deterministic, rule-based (no external API) template - turns a
 * compareResults diff into a short Norwegian sentence, framed either against
 * the scenario defaults (persistent ComparisonPanel) or against the previous
 * /recompute response (inline edit-impact summary in NodeDetailPanel).
 */
export function describeDelta(comparison: ComparisonResult, framing: DescribeFraming): string {
  const prefix = FRAMING_PREFIX[framing];

  const decreased = comparison.nodes.filter((n) => n.bucket === "decreased");
  const increased = comparison.nodes.filter((n) => n.bucket === "increased");
  const newlyAffected = comparison.nodes.filter((n) => n.bucket === "newlyAffected");

  const parts = [
    bucketSentence(decreased, (count) =>
      count === 1 ? "1 funksjon ble bedre" : `${count} funksjoner ble bedre`,
    ),
    bucketSentence(increased, (count) =>
      count === 1 ? "1 funksjon ble verre" : `${count} funksjoner ble verre`,
    ),
    bucketSentence(newlyAffected, (count) =>
      count === 1
        ? "1 ny funksjon ble indirekte påvirket"
        : `${count} nye funksjoner ble indirekte påvirket`,
    ),
  ].filter((part): part is string => part !== null);

  if (parts.length === 0) {
    return `${prefix}: ingen endringer.`;
  }

  let sentence = `${prefix}: ${parts.join("; ")}.`;

  if (framing === "vsScenarioDefaults") {
    const roundedAverage = Math.round(comparison.averageDelta);
    const sign = roundedAverage > 0 ? "+" : "";
    sentence += ` Gjennomsnittlig endring ${sign}${roundedAverage} %.`;
  }

  return sentence;
}
