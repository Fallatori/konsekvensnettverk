import { FUNCTION_KEYS as REAL_FUNCTION_KEYS, getCatalogEntry as getRealCatalogEntry } from "@/lib/calc/catalog";
import type { CatalogEntry, TimeframeDays } from "@/lib/calc/catalog/types";
import {
  CONSEQUENCE_LABEL_BY_PRISMA,
  CONSEQUENCE_VALUE,
  nearestConsequenceLabel,
  type ConsequenceLabel,
  type NodeSubtype,
} from "@/lib/calc/mappings";
import { CURRENT_FORMULA_VERSION, FORMULA_VERSIONS } from "@/lib/calc/registry";
import type { IndirectSource } from "@/lib/calc/formulas/indirect";

export type DirectNodeInput = {
  id: string;
  label: string;
  description: string;
  functionKey: string;
  /** Scenario-authored, independent of severity - see mappings.ts. */
  subtype: NodeSubtype;
  /** The scenario-authored base category - "original" in the comparison
   * dashboard sense, never mutated by overrides. */
  baseConsequenceCategory: ConsequenceLabel;
};

export type DirectEdgeInput = {
  id: string;
  parentId: string;
  childId: string;
  connectionLevel: number;
};

export type RecomputeOverrides = {
  /** nodeId -> overridden consequence category for this what-if request. */
  nodeCategories?: Record<string, ConsequenceLabel>;
  /** edgeId -> overridden connection level for this what-if request. */
  connectionLevels?: Record<string, number>;
};

export type RecomputeInput = {
  hendelseId: string;
  hendelseLabel: string;
  hendelseDescription: string;
  hendelseSubtype: NodeSubtype;
  directNodes: DirectNodeInput[];
  directEdges: DirectEdgeInput[];
  overrides?: RecomputeOverrides;
  indirectEnabled: boolean;
  timeframeDays: TimeframeDays;
};

/** Injectable so tests can supply a small fixture catalog instead of the real
 * ~18(9)-function one - recompute() itself has no hardcoded catalog knowledge. */
export type RecomputeOptions = {
  catalogLookup?: (functionKey: string) => CatalogEntry;
  functionKeys?: readonly string[];
};

export type ComputedNode = {
  id: string;
  functionKey: string | null;
  label: string;
  description: string;
  isHendelse: boolean;
  /** false for synthesized indirect-only nodes (no persisted Node row). */
  isDirect: boolean;
  subtype: NodeSubtype;
  consequenceCategory: ConsequenceLabel | null;
  /** Scenario's raw default value - 0 for synthesized indirect nodes. Used
   * by the comparison dashboard as the "original" baseline. */
  originalConsequenceValue: number;
  timedConsequenceValue: number;
  indirectConsequenceValue: number;
  /** min(100, timedConsequenceValue + indirectConsequenceValue). */
  totalConsequenceValue: number;
};

export type ComputedEdge = {
  id: string;
  parentId: string;
  childId: string;
  kind: "DIRECT" | "INDIRECT";
  /** Direct: authored connectionLevel (1-5). Indirect: the point value
   * (0/1/5/10/15/20) of this specific (source, target) contribution. */
  connectionLevel: number;
};

export type RecomputeResult = {
  nodes: ComputedNode[];
  edges: ComputedEdge[];
};

type ActiveEntry = {
  functionKey: string;
  category: ConsequenceLabel;
  originalConsequenceValue: number;
  timedConsequenceValue: number;
  /** Nearest-bucket category of timedConsequenceValue - what this node uses
   * as its OWN row when acting as a source for other targets downstream. */
  timedCategoryForSourcing: ConsequenceLabel;
  indirectImpactRow: CatalogEntry["indirectImpactRow"];
  isDirect: boolean;
  node: DirectNodeInput | null;
};

/**
 * Orchestrates ComputeTimedConsequenceMethod for every directly-hit node,
 * then - if indirectEnabled - the fixed two-round ComputeIndirectConsequenceMethod
 * (round 1 indirect, round 2 reevaluation, then stop - no round 3) across the
 * full catalog. Pure function: no DB writes, safe to call per what-if request.
 */
export function recompute(input: RecomputeInput, options: RecomputeOptions = {}): RecomputeResult {
  const catalogLookup = options.catalogLookup ?? getRealCatalogEntry;
  const functionKeys = options.functionKeys ?? REAL_FUNCTION_KEYS;
  const formulas = FORMULA_VERSIONS[CURRENT_FORMULA_VERSION];
  const overrides = input.overrides ?? {};

  function buildActiveEntry(params: {
    functionKey: string;
    category: ConsequenceLabel;
    originalConsequenceValue: number;
    isDirect: boolean;
    node: DirectNodeInput | null;
  }): ActiveEntry {
    const { functionKey, category, originalConsequenceValue, isDirect, node } = params;
    const catalogEntry = catalogLookup(functionKey);

    const consequenceValue = CONSEQUENCE_VALUE[category];
    const timedConsequenceValue = formulas.computeTimedConsequenceValue({
      consequenceValue,
      category,
      functionalityTable: catalogEntry.functionalityTable,
      timeframeDays: input.timeframeDays,
    });

    return {
      functionKey,
      category,
      originalConsequenceValue,
      timedConsequenceValue,
      timedCategoryForSourcing: nearestConsequenceLabel(timedConsequenceValue),
      indirectImpactRow: catalogEntry.indirectImpactRow,
      isDirect,
      node,
    };
  }

  const asSource = (entry: ActiveEntry): IndirectSource => ({
    functionKey: entry.functionKey,
    timedCategory: entry.timedCategoryForSourcing,
    indirectImpactRow: entry.indirectImpactRow,
  });

  // --- Step 1: timed pass over directly-hit nodes ---
  const directActive = new Map<string, ActiveEntry>();
  for (const node of input.directNodes) {
    const category = overrides.nodeCategories?.[node.id] ?? node.baseConsequenceCategory;
    directActive.set(
      node.functionKey,
      buildActiveEntry({
        functionKey: node.functionKey,
        category,
        originalConsequenceValue: CONSEQUENCE_VALUE[node.baseConsequenceCategory],
        isDirect: true,
        node,
      }),
    );
  }

  const indirectContributionsByTarget = new Map<
    string,
    ReturnType<typeof formulas.listIndirectContributions>
  >();
  const promoted = new Map<string, ActiveEntry>();

  if (input.indirectEnabled) {
    // --- Round 1: indirect, sources = original directly-hit nodes only ---
    const round1Sources = [...directActive.values()].map(asSource);
    const round1Promoted = new Map<string, ActiveEntry>();

    for (const functionKey of functionKeys) {
      if (directActive.has(functionKey)) continue;
      const contributions = formulas.listIndirectContributions(functionKey, round1Sources);
      const best = formulas.maxIndirectContribution(contributions);
      if (best.points > 0) {
        round1Promoted.set(
          functionKey,
          buildActiveEntry({
            functionKey,
            category: best.label,
            originalConsequenceValue: 0,
            isDirect: false,
            node: null,
          }),
        );
      }
    }

    // --- Round 2: reevaluation, sources = originals + round-1 promoted ---
    const round2Sources = [...directActive.values(), ...round1Promoted.values()].map(asSource);

    for (const functionKey of functionKeys) {
      const contributions = formulas.listIndirectContributions(functionKey, round2Sources);
      indirectContributionsByTarget.set(functionKey, contributions);

      if (directActive.has(functionKey)) continue; // handled below, category never changes

      const best = formulas.maxIndirectContribution(contributions);
      if (best.points > 0) {
        // Either the same node round 1 already promoted (keep round 1's
        // category so it doesn't get "re-labeled" mid-cascade) or a node
        // reachable only via a round-1 node (newly promoted here).
        const existing = round1Promoted.get(functionKey);
        promoted.set(
          functionKey,
          existing ??
            buildActiveEntry({
              functionKey,
              category: best.label,
              originalConsequenceValue: 0,
              isDirect: false,
              node: null,
            }),
        );
      }
    }

    // Stop. No round 3, even if a round-2-promoted node could propagate further.
  }

  // --- Assemble final nodes ---
  const nodes: ComputedNode[] = [
    {
      id: input.hendelseId,
      functionKey: null,
      label: input.hendelseLabel,
      description: input.hendelseDescription,
      isHendelse: true,
      isDirect: true,
      subtype: input.hendelseSubtype,
      consequenceCategory: null,
      originalConsequenceValue: 0,
      timedConsequenceValue: 0,
      indirectConsequenceValue: 0,
      totalConsequenceValue: 0,
    },
  ];

  for (const entry of directActive.values()) {
    const indirectValue = input.indirectEnabled
      ? formulas.maxIndirectContribution(indirectContributionsByTarget.get(entry.functionKey) ?? []).points
      : 0;
    nodes.push({
      id: entry.node!.id,
      functionKey: entry.functionKey,
      label: entry.node!.label,
      description: entry.node!.description,
      isHendelse: false,
      isDirect: true,
      subtype: entry.node!.subtype,
      consequenceCategory: entry.category,
      originalConsequenceValue: entry.originalConsequenceValue,
      timedConsequenceValue: entry.timedConsequenceValue,
      indirectConsequenceValue: indirectValue,
      totalConsequenceValue: Math.min(100, entry.timedConsequenceValue + indirectValue),
    });
  }

  for (const entry of promoted.values()) {
    const indirectValue = formulas.maxIndirectContribution(
      indirectContributionsByTarget.get(entry.functionKey) ?? [],
    ).points;
    nodes.push({
      id: `indirect:${entry.functionKey}`,
      functionKey: entry.functionKey,
      label: catalogLookup(entry.functionKey).label,
      description: "",
      isHendelse: false,
      isDirect: false,
      subtype: catalogLookup(entry.functionKey).subtype,
      consequenceCategory: entry.category,
      originalConsequenceValue: 0,
      timedConsequenceValue: entry.timedConsequenceValue,
      indirectConsequenceValue: indirectValue,
      totalConsequenceValue: Math.min(100, entry.timedConsequenceValue + indirectValue),
    });
  }

  // --- Assemble edges ---
  const edges: ComputedEdge[] = input.directEdges.map((edge) => ({
    id: edge.id,
    parentId: edge.parentId,
    childId: edge.childId,
    kind: "DIRECT" as const,
    connectionLevel: overrides.connectionLevels?.[edge.id] ?? edge.connectionLevel,
  }));

  if (input.indirectEnabled) {
    const functionKeyToNodeId = new Map<string, string>();
    for (const entry of directActive.values()) functionKeyToNodeId.set(entry.functionKey, entry.node!.id);
    for (const entry of promoted.values()) functionKeyToNodeId.set(entry.functionKey, `indirect:${entry.functionKey}`);

    for (const [targetFunctionKey, contributions] of indirectContributionsByTarget) {
      const targetNodeId = functionKeyToNodeId.get(targetFunctionKey);
      if (!targetNodeId) continue; // target never got activated this request
      for (const contribution of contributions) {
        const sourceNodeId = functionKeyToNodeId.get(contribution.sourceFunctionKey);
        if (!sourceNodeId) continue; // source didn't end up active (shouldn't happen, defensive)
        edges.push({
          id: `indirect:${sourceNodeId}->${targetNodeId}`,
          parentId: sourceNodeId,
          childId: targetNodeId,
          kind: "INDIRECT",
          connectionLevel: contribution.points,
        });
      }
    }
  }

  return { nodes, edges };
}

/** Helper for API routes: Prisma enum -> ConsequenceLabel at the DB boundary. */
export function prismaConsequenceCategoryToLabel(
  category: keyof typeof CONSEQUENCE_LABEL_BY_PRISMA,
): ConsequenceLabel {
  return CONSEQUENCE_LABEL_BY_PRISMA[category];
}
