import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import {
  PRISMA_CONSEQUENCE_BY_LABEL,
  PRISMA_LIKELIHOOD_BY_LABEL,
  PRISMA_NODE_SUBTYPE_BY_LABEL,
} from "../src/lib/calc/mappings";
import { getCatalogEntry } from "../src/lib/calc/catalog";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// TODO: change this before sharing any deployment - this is a dev-only
// seed account, documented here rather than hidden, since there is no public
// signup route (accounts are admin-provisioned per the plan).
const SEED_USER_EMAIL = process.env.SEED_USER_EMAIL ?? "admin@example.com";
const SEED_USER_PASSWORD = process.env.SEED_USER_PASSWORD ?? "endre-meg-nå";

async function main() {
  const team = await prisma.team.upsert({
    where: { id: "seed-team" },
    update: {},
    create: { id: "seed-team", name: "Standardteam" },
  });

  const passwordHash = await bcrypt.hash(SEED_USER_PASSWORD, 10);
  const user = await prisma.user.upsert({
    where: { email: SEED_USER_EMAIL },
    update: { passwordHash },
    create: { email: SEED_USER_EMAIL, passwordHash },
  });

  await prisma.membership.upsert({
    where: { userId_teamId: { userId: user.id, teamId: team.id } },
    update: {},
    create: { userId: user.id, teamId: team.id, role: "OWNER" },
  });

  // Delete + recreate the scenario's nodes/edges on every seed run, so this
  // script stays idempotent and safe to re-run as you iterate on the data.
  const existing = await prisma.scenario.findFirst({
    where: { teamId: team.id, name: "Scenario 1" },
  });
  if (existing) {
    await prisma.edge.deleteMany({ where: { scenarioId: existing.id } });
    await prisma.node.deleteMany({ where: { scenarioId: existing.id } });
    await prisma.scenario.delete({ where: { id: existing.id } });
  }

  const scenario = await prisma.scenario.create({
    data: { teamId: team.id, name: "Scenario 1" },
  });

  const hendelse = await prisma.node.create({
    data: {
      scenarioId: scenario.id,
      type: "HENDELSE",
      label: "Scenario 1",
      description: "TODO: beskriv den uønskede hendelsen dette scenarioet representerer.",
      subtype: PRISMA_NODE_SUBTYPE_BY_LABEL["hazards"],
      likelihoodCategory: PRISMA_LIKELIHOOD_BY_LABEL["middels"],
      likelihoodValue: 60,
    },
  });

  // Direct consequences - the functions this event directly hits, per the
  // mockup. TODO: replace descriptions and severities with the real
  // scenario content; this is placeholder authoring, not real domain data.
  const directHits: Array<{ functionKey: string; label: string; category: keyof typeof PRISMA_CONSEQUENCE_BY_LABEL; connectionLevel: number }> = [
    { functionKey: "STYRING_OG_KRISELEDELSE", label: "Styring og kriseledelse", category: "svært små", connectionLevel: 2 },
    { functionKey: "LOV_OG_ORDEN", label: "Lov og orden", category: "ingen", connectionLevel: 1 },
    { functionKey: "HELSE_OMSORG_OG_SOSIALE_TJENESTER", label: "Helse, omsorg og sosiale tjenester", category: "store", connectionLevel: 4 },
    { functionKey: "REDNINGSTJENESTE", label: "Redningstjeneste", category: "svært store", connectionLevel: 5 },
    { functionKey: "KRAFTFORSYNING", label: "Kraftforsyning", category: "ingen", connectionLevel: 1 },
    { functionKey: "TRANSPORT", label: "Transport", category: "middels", connectionLevel: 3 },
  ];

  for (const hit of directHits) {
    const node = await prisma.node.create({
      data: {
        scenarioId: scenario.id,
        type: "SAMFUNNSFUNKSJON",
        label: hit.label,
        description: `TODO: beskriv hvorfor ${hit.label} er direkte påvirket av dette scenarioet.`,
        functionKey: hit.functionKey,
        subtype: PRISMA_NODE_SUBTYPE_BY_LABEL[getCatalogEntry(hit.functionKey).subtype],
        consequenceCategory: PRISMA_CONSEQUENCE_BY_LABEL[hit.category],
        consequenceValue: { ingen: 0, "svært små": 20, små: 40, middels: 60, store: 80, "svært store": 100 }[
          hit.category
        ],
      },
    });

    await prisma.edge.create({
      data: {
        scenarioId: scenario.id,
        parentId: hendelse.id,
        childId: node.id,
        connectionLevel: hit.connectionLevel,
      },
    });
  }

  console.log(`Seeded team "${team.name}", user "${user.email}", scenario "${scenario.name}".`);
  console.log(`Dev login: ${SEED_USER_EMAIL} / ${SEED_USER_PASSWORD}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
