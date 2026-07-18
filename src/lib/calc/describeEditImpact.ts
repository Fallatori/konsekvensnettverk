import type { ComparisonResult, NodeComparison } from "@/lib/calc/compareResults";
import type { TimeframeDays } from "@/lib/calc/catalog/types";
import type { ConsequenceLabel } from "@/lib/calc/mappings";

/** What the user just did, tracked by ScenarioApp at the point each control
 * is touched - lets the bottom-of-panel summary name the actual action
 * ("you changed X to Y") instead of only describing its ripple effects. */
export type LastAction =
  | { type: "category"; nodeId: string; nodeLabel: string; category: ConsequenceLabel }
  | { type: "indirect"; enabled: boolean }
  | { type: "timeframe"; days: TimeframeDays }
  | { type: "reset" };

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

function actionSentence(action: LastAction): string {
  switch (action.type) {
    case "category":
      return `Du endret konsekvenskategorien for «${action.nodeLabel}» til «${action.category}».`;
    case "indirect":
      return `Du skrudde ${action.enabled ? "på" : "av"} indirekte følge.`;
    case "timeframe":
      return `Du endret tidsrammen til ${action.days === 1 ? "1 dag" : `${action.days} dager`}.`;
    case "reset":
      return "Du tilbakestilte alle endringer til standardverdiene.";
  }
}

/**
 * Deterministic, rule-based (no external API) plain-language explanation of
 * what a single what-if edit did: names the action itself, then explains why
 * it rippled to other functions (they're strongly dependent on each other),
 * then lists what changed. Shown at the bottom of NodeDetailPanel right
 * after an edit (baseline = the previous /recompute response).
 *
 * When the action is a category edit on a specific node, that node is
 * excluded from the ripple list - its own change is already named in the
 * first sentence, so repeating it there would be redundant.
 */
export function describeEditImpact(comparison: ComparisonResult, action: LastAction | null): string | null {
  if (!action) return null;

  const editedNodeId = action.type === "category" ? action.nodeId : null;
  const rippleNodes = editedNodeId ? comparison.nodes.filter((n) => n.id !== editedNodeId) : comparison.nodes;

  const decreased = rippleNodes.filter((n) => n.bucket === "decreased");
  const increased = rippleNodes.filter((n) => n.bucket === "increased");
  const newlyAffected = rippleNodes.filter((n) => n.bucket === "newlyAffected");

  const parts = [
    bucketSentence(decreased, (count) => (count === 1 ? "1 funksjon ble bedre" : `${count} funksjoner ble bedre`)),
    bucketSentence(increased, (count) => (count === 1 ? "1 funksjon ble verre" : `${count} funksjoner ble verre`)),
    bucketSentence(newlyAffected, (count) =>
      count === 1
        ? "1 ny funksjon ble påvirket, selv om den ikke ble truffet direkte"
        : `${count} nye funksjoner ble påvirket, selv om de ikke ble truffet direkte`,
    ),
  ].filter((part): part is string => part !== null);

  const prefix = actionSentence(action);

  if (parts.length === 0) {
    return `${prefix} Dette førte ikke til noen endring i andre funksjoner.`;
  }

  return (
    `${prefix} Fordi funksjonene er sterkt avhengige av hverandre - både direkte og indirekte - ` +
    `førte dette til: ${parts.join("; ")}.`
  );
}
