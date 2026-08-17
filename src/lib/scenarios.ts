import { prisma } from "@/lib/db";
import { CONSEQUENCE_LABEL_BY_PRISMA, NODE_SUBTYPE_BY_PRISMA } from "@/lib/calc/mappings";
import type { DirectEdgeInput, DirectNodeInput, RecomputeInput } from "@/lib/calc/recompute";
import type { TimeframeDays } from "@/lib/calc/catalog/types";

/** Team isolation: a scenario is only visible to users who belong to its team. */
export async function listScenariosForUser(userId: string) {
  const memberships = await prisma.membership.findMany({
    where: { userId },
    select: { teamId: true },
  });
  const teamIds = memberships.map((m) => m.teamId);
  if (teamIds.length === 0) return [];

  return prisma.scenario.findMany({
    where: { teamId: { in: teamIds } },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

export async function getScenarioForUser(scenarioId: string, userId: string) {
  const scenario = await prisma.scenario.findUnique({
    where: { id: scenarioId },
    include: { nodes: true, edges: true },
  });
  if (!scenario) return null;

  const membership = await prisma.membership.findUnique({
    where: { userId_teamId: { userId, teamId: scenario.teamId } },
  });
  if (!membership) return null; // not on this scenario's team - treat as not found

  return scenario;
}

type ScenarioWithRelations = NonNullable<Awaited<ReturnType<typeof getScenarioForUser>>>;

/** Maps the persisted Scenario (hendelse + directly-hit nodes, direct edges
 * only) into the shape lib/calc/recompute.ts expects. Overrides/indirect/
 * timeframe are supplied by the caller per-request, not stored here. */
export function scenarioToRecomputeInput(
  scenario: ScenarioWithRelations,
  params: { indirectEnabled: boolean; timeframeDays: TimeframeDays; overrides?: RecomputeInput["overrides"] },
): RecomputeInput {
  const hendelse = scenario.nodes.find((n) => n.type === "HENDELSE");
  if (!hendelse) {
    throw new Error(`Scenario "${scenario.id}" has no hendelse node - seed data is malformed.`);
  }

  const directNodes: DirectNodeInput[] = scenario.nodes
    .filter((n) => n.type === "SAMFUNNSFUNKSJON")
    .map((n) => {
      if (!n.functionKey || !n.consequenceCategory) {
        throw new Error(`Node "${n.id}" is missing functionKey/consequenceCategory - seed data is malformed.`);
      }
      return {
        id: n.id,
        label: n.label,
        description: n.description,
        functionKey: n.functionKey,
        subtype: NODE_SUBTYPE_BY_PRISMA[n.subtype],
        baseConsequenceCategory: CONSEQUENCE_LABEL_BY_PRISMA[n.consequenceCategory],
      };
    });

  const directEdges: DirectEdgeInput[] = scenario.edges.map((e) => ({
    id: e.id,
    parentId: e.parentId,
    childId: e.childId,
    connectionLevel: e.connectionLevel,
  }));

  return {
    hendelseId: hendelse.id,
    hendelseLabel: hendelse.label,
    hendelseDescription: hendelse.description,
    hendelseSubtype: NODE_SUBTYPE_BY_PRISMA[hendelse.subtype],
    directNodes,
    directEdges,
    overrides: params.overrides,
    indirectEnabled: params.indirectEnabled,
    timeframeDays: params.timeframeDays,
  };
}
