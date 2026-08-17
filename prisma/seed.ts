import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import {
  PRISMA_CONSEQUENCE_BY_LABEL,
  PRISMA_LIKELIHOOD_BY_LABEL,
  PRISMA_NODE_SUBTYPE_BY_LABEL,
  CONSEQUENCE_VALUE,
  connectionLevelForCategory,
} from "../src/lib/calc/mappings";
import { getCatalogEntry } from "../src/lib/calc/catalog";
import { SCENARIO_DEFINITIONS, DEV_SEED_USERS, type ScenarioDefinition } from "../src/lib/data/domainData";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const team = await prisma.team.upsert({
    where: { id: "seed-team" },
    update: {},
    create: { id: "seed-team", name: "Standardteam" },
  });

  for (const seedUser of DEV_SEED_USERS) {
    const passwordHash = await bcrypt.hash(seedUser.password, 10);
    const user = await prisma.user.upsert({
      where: { email: seedUser.email },
      update: { passwordHash },
      create: { email: seedUser.email, passwordHash },
    });

    await prisma.membership.upsert({
      where: { userId_teamId: { userId: user.id, teamId: team.id } },
      update: { role: "OWNER" },
      create: { userId: user.id, teamId: team.id, role: "OWNER" },
    });
  }

  for (const definition of SCENARIO_DEFINITIONS) {
    await seedScenario(team.id, definition);
  }

  console.log(`Seeded team "${team.name}", ${DEV_SEED_USERS.length} admin users, ${SCENARIO_DEFINITIONS.length} scenarios.`);
  for (const seedUser of DEV_SEED_USERS) {
    console.log(`Admin login: ${seedUser.email} / ${seedUser.password}`);
  }
}

/** Delete + recreate a scenario's nodes/edges on every seed run, so this
 * script stays idempotent and safe to re-run as you iterate on domainData.json. */
async function seedScenario(teamId: string, definition: ScenarioDefinition) {
  const existing = await prisma.scenario.findFirst({
    where: { teamId, name: definition.name },
  });
  if (existing) {
    await prisma.edge.deleteMany({ where: { scenarioId: existing.id } });
    await prisma.node.deleteMany({ where: { scenarioId: existing.id } });
    await prisma.scenario.delete({ where: { id: existing.id } });
  }

  const scenario = await prisma.scenario.create({
    data: { teamId, name: definition.name },
  });

  const hendelse = await prisma.node.create({
    data: {
      scenarioId: scenario.id,
      type: "HENDELSE",
      label: definition.name,
      description: definition.hendelse.description,
      subtype: PRISMA_NODE_SUBTYPE_BY_LABEL["hazards"],
      likelihoodCategory: PRISMA_LIKELIHOOD_BY_LABEL[definition.hendelse.likelihoodCategory],
      likelihoodValue: definition.hendelse.likelihoodValue,
    },
  });

  for (const hit of definition.directHits) {
    const node = await prisma.node.create({
      data: {
        scenarioId: scenario.id,
        type: "SAMFUNNSFUNKSJON",
        label: hit.label,
        description: hit.description,
        functionKey: hit.functionKey,
        subtype: PRISMA_NODE_SUBTYPE_BY_LABEL[getCatalogEntry(hit.functionKey).subtype],
        consequenceCategory: PRISMA_CONSEQUENCE_BY_LABEL[hit.category],
        consequenceValue: CONSEQUENCE_VALUE[hit.category],
      },
    });

    await prisma.edge.create({
      data: {
        scenarioId: scenario.id,
        parentId: hendelse.id,
        childId: node.id,
        // Derived from the hit's category, never authored - see
        // connectionLevelForCategory in lib/calc/mappings.ts.
        connectionLevel: connectionLevelForCategory(hit.category),
      },
    });
  }

  console.log(`  Seeded scenario "${scenario.name}" (${definition.directHits.length} direct hits).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
