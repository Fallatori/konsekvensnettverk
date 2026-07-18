import type { TimeframeDays } from "@/lib/calc/catalog/types";
import { nearestConsequenceLabel } from "@/lib/calc/mappings";
import type { ComputedNode } from "@/lib/calc/recompute";

export type OverviewInput = {
  scenarioName: string;
  indirectEnabled: boolean;
  timeframeDays: TimeframeDays;
  /** Full node list from a RecomputeResult (hendelse node included, filtered out below). */
  nodes: ComputedNode[];
};

function timeframeLabel(days: TimeframeDays): string {
  return days === 1 ? "1 dag" : `${days} dager`;
}

/** Plain-language recommendation, driven by how bad the worst-hit function
 * is and whether indirect ripple effects are even being looked at. */
function suggestionFor(mostAffected: ComputedNode, indirectEnabled: boolean): string {
  const category = nearestConsequenceLabel(mostAffected.totalConsequenceValue);
  const sentences: string[] = [];

  if (category === "svært store" || category === "store") {
    sentences.push(
      `Vi anbefaler å prioritere ressurser mot ${mostAffected.label} først, siden konsekvensen der er alvorlig.`,
    );
  } else if (category === "middels") {
    sentences.push(`Følg med på ${mostAffected.label} - konsekvensen der er moderat, men kan bli verre.`);
  } else {
    sentences.push("Situasjonen ser foreløpig håndterbar ut for de fleste funksjoner.");
  }

  if (!indirectEnabled) {
    sentences.push("Prøv å skru på indirekte følge for å se om konsekvensene sprer seg videre til andre funksjoner.");
  }

  return sentences.join(" ");
}

export type OverviewSummary = {
  /** The scenario's current setup (name, timeframe, indirect toggle) - shown
   * once above the bullet list, not itself a bullet. */
  background: string;
  /** Plain-language findings, one per bullet, in the OverviewPanel's list. */
  observations: string[];
};

/**
 * Deterministic, rule-based (no external API) plain-language snapshot of the
 * CURRENT graph state - not a diff against anything else. Answers: given
 * this scenario, this time frame, and whether indirect follow-on effects are
 * turned on, how bad is it overall, which function needs attention first,
 * and what to do about it. Shown in the always-visible OverviewPanel, and
 * recomputed fresh on every render (so it updates automatically whenever a
 * what-if edit changes the graph).
 */
export function describeOverview({
  scenarioName,
  indirectEnabled,
  timeframeDays,
  nodes,
}: OverviewInput): OverviewSummary {
  const background = `Scenario «${scenarioName}» - tidsramme ${timeframeLabel(timeframeDays)}, indirekte følge slått ${
    indirectEnabled ? "på" : "av"
  }.`;

  const functionNodes = nodes.filter((n) => !n.isHendelse);
  const affected = functionNodes.filter((n) => n.totalConsequenceValue > 0);

  if (functionNodes.length === 0) {
    return { background, observations: ["Ingen funksjoner er lagt inn i scenarioet ennå."] };
  }

  if (affected.length === 0) {
    return { background, observations: ["Ingen funksjoner er påvirket i dette scenarioet foreløpig."] };
  }

  const average = affected.reduce((sum, n) => sum + n.totalConsequenceValue, 0) / affected.length;
  const averageCategory = nearestConsequenceLabel(average);
  const mostAffected = affected.reduce((max, n) => (n.totalConsequenceValue > max.totalConsequenceValue ? n : max));
  const mostAffectedCategory = nearestConsequenceLabel(mostAffected.totalConsequenceValue);

  const affectedCountSentence =
    affected.length === 1
      ? "1 funksjon er påvirket"
      : `${affected.length} av ${functionNodes.length} funksjoner er påvirket`;

  const overallSentence = `${affectedCountSentence}, og alvorlighetsgraden er i snitt «${averageCategory}» (${Math.round(average)} poeng).`;

  const mostAffectedSentence = `Mest påvirket er ${mostAffected.label}, med ${Math.round(mostAffected.totalConsequenceValue)} poeng («${mostAffectedCategory}»).`;

  const suggestion = suggestionFor(mostAffected, indirectEnabled);

  return { background, observations: [overallSentence, mostAffectedSentence, suggestion] };
}
