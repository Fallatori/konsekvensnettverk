/**
 * Single input point for all domain data: everything under src/data/domainData.json
 * is read and validated here, and every other module (the catalog, the DB
 * seed script) consumes it through this file instead of touching the JSON
 * directly. To add a function, edit its entry in the "functions" array - it
 * must carry its own functionalityTable (restoration curve) and its own
 * indirectImpactRow (impact induced on every other function); to add a
 * scenario, edit the "scenarios" array. No code changes required for either.
 */
import { z } from "zod";
import rawDomainData from "@/data/domainData.json";
import {
  CONSEQUENCE_LABELS,
  LIKELIHOOD_LABELS,
  type ConsequenceLabel,
  type LikelihoodLabel,
} from "@/lib/calc/mappings";
import { TIMEFRAME_DAYS, type FunctionalityTable, type IndirectImpactRow, type CatalogEntry } from "@/lib/calc/catalog/types";

const consequenceLabelSchema = z.enum(CONSEQUENCE_LABELS as [ConsequenceLabel, ...ConsequenceLabel[]]);
const likelihoodLabelSchema = z.enum(LIKELIHOOD_LABELS as [LikelihoodLabel, ...LikelihoodLabel[]]);

// Only the non-hazards subtypes - "hazards" is reserved for the hendelse node,
// never for a samfunnsfunksjon catalog entry.
const catalogSubtypeSchema = z.enum(["stabilitet", "befolkning", "funksjon"]);

// Raw shape: an object keyed by ConsequenceLabel, each row keyed by timeframe
// day *as a string* (JSON object keys are always strings) - toFunctionalityTable
// below converts day keys to numbers and validates every (label, day) cell is present.
const rawFunctionalityTableSchema = z.record(z.string(), z.record(z.string(), z.number()));

// Raw shape: an object keyed by the function's OWN ConsequenceLabel, each row
// mapping every other function's key -> the ConsequenceLabel it induces there.
const rawIndirectImpactRowSchema = z.record(z.string(), z.record(z.string(), consequenceLabelSchema));

const functionDefinitionSchema = z.object({
  functionKey: z.string().min(1),
  label: z.string().min(1),
  subtype: catalogSubtypeSchema,
  /** This function's own restoration curve - no shared/default fallback. */
  functionalityTable: rawFunctionalityTableSchema,
  /** This function's own impact-on-every-other-function matrix - no shared/default fallback. */
  indirectImpactRow: rawIndirectImpactRowSchema,
});

const directHitSchema = z.object({
  functionKey: z.string().min(1),
  label: z.string().min(1),
  description: z.string().min(1),
  category: consequenceLabelSchema,
  connectionLevel: z.number().int().min(1).max(5),
});

const scenarioDefinitionSchema = z.object({
  name: z.string().min(1),
  hendelse: z.object({
    description: z.string().min(1),
    likelihoodCategory: likelihoodLabelSchema,
    likelihoodValue: z.number().int().min(0).max(100),
  }),
  directHits: z.array(directHitSchema).min(1),
});

const domainDataSchema = z.object({
  functions: z.array(functionDefinitionSchema).min(1),
  scenarios: z.array(scenarioDefinitionSchema).min(1),
  devSeedUsers: z
    .array(
      z.object({
        email: z.email(),
        password: z.string().min(1),
      }),
    )
    .min(1),
});

export type FunctionDefinition = z.infer<typeof functionDefinitionSchema>;
export type ScenarioDefinition = z.infer<typeof scenarioDefinitionSchema>;
export type DirectHitDefinition = z.infer<typeof directHitSchema>;

const domainData = domainDataSchema.parse(rawDomainData);

/** Converts a JSON functionality row (string day keys) into the
 * TimeframeDays-keyed shape lib/calc/formulas/timed.ts expects - throws
 * loudly on any missing (category, day) cell rather than silently defaulting. */
function toFunctionalityTable(functionKey: string, raw: Record<string, Record<string, number>>): FunctionalityTable {
  const table = {} as FunctionalityTable;
  for (const label of CONSEQUENCE_LABELS) {
    const row = raw[label];
    if (!row) {
      throw new Error(`domainData.json: "${functionKey}".functionalityTable is missing the "${label}" row.`);
    }
    const parsedRow = {} as FunctionalityTable[ConsequenceLabel];
    for (const day of TIMEFRAME_DAYS) {
      const value = row[String(day)];
      if (value === undefined) {
        throw new Error(`domainData.json: "${functionKey}".functionalityTable row "${label}" is missing day ${day}.`);
      }
      parsedRow[day] = value;
    }
    table[label] = parsedRow;
  }
  return table;
}

/** Validates a function's own indirectImpactRow: every non-"ingen"... in
 * practice every category row must be present, and every target key must be
 * a real, other catalog function - fail loudly rather than silently ignoring
 * a typo'd functionKey. */
function toIndirectImpactRow(
  functionKey: string,
  raw: Record<string, Record<string, ConsequenceLabel>>,
  allFunctionKeys: string[],
): IndirectImpactRow {
  const row = {} as IndirectImpactRow;
  for (const label of CONSEQUENCE_LABELS) {
    const cell = raw[label];
    if (!cell) {
      throw new Error(`domainData.json: "${functionKey}".indirectImpactRow is missing the "${label}" row.`);
    }
    for (const targetKey of Object.keys(cell)) {
      if (targetKey === functionKey) {
        throw new Error(`domainData.json: "${functionKey}".indirectImpactRow["${label}"] targets itself.`);
      }
      if (!allFunctionKeys.includes(targetKey)) {
        throw new Error(
          `domainData.json: "${functionKey}".indirectImpactRow["${label}"] targets unknown functionKey "${targetKey}".`,
        );
      }
    }
    row[label] = cell;
  }
  return row;
}

export const FUNCTION_KEYS: string[] = domainData.functions.map((fn) => fn.functionKey);

/** The fixed catalog of critical societal functions, built from
 * domainData.json's "functions" array - each entry carries its own recovery
 * curve and its own impact-on-every-other-function matrix. */
export const CONSEQUENCE_CATALOG: Record<string, CatalogEntry> = Object.fromEntries(
  domainData.functions.map((fn) => [
    fn.functionKey,
    {
      functionKey: fn.functionKey,
      label: fn.label,
      subtype: fn.subtype,
      functionalityTable: toFunctionalityTable(fn.functionKey, fn.functionalityTable),
      indirectImpactRow: toIndirectImpactRow(fn.functionKey, fn.indirectImpactRow, FUNCTION_KEYS),
    } satisfies CatalogEntry,
  ]),
);

export function getCatalogEntry(functionKey: string): CatalogEntry {
  const entry = CONSEQUENCE_CATALOG[functionKey];
  if (!entry) {
    // Fail loudly per the plan's verification requirement - never silently
    // fall back to a default table.
    throw new Error(`Unknown functionKey "${functionKey}" - no catalog entry registered for it in domainData.json.`);
  }
  return entry;
}

export const SCENARIO_DEFINITIONS: ScenarioDefinition[] = domainData.scenarios;

export const DEV_SEED_USERS = domainData.devSeedUsers;
