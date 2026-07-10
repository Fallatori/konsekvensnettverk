import { computeTimedConsequenceValue } from "@/lib/calc/formulas/timed";
import { listIndirectContributions, maxIndirectContribution } from "@/lib/calc/formulas/indirect";

/**
 * Versioned formula lookup - swap either formula later by adding a new key
 * here, no other code changes required (recompute.ts always reads through
 * this registry, never imports formulas/*.ts directly).
 */
export const FORMULA_VERSIONS = {
  v1: {
    computeTimedConsequenceValue,
    listIndirectContributions,
    maxIndirectContribution,
  },
} as const;

export type FormulaVersion = keyof typeof FORMULA_VERSIONS;

export const CURRENT_FORMULA_VERSION: FormulaVersion = "v1";
