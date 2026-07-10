import { describe, expect, it } from "vitest";
import { computeTimedConsequenceValue } from "@/lib/calc/formulas/timed";
import type { FunctionalityTable } from "@/lib/calc/catalog/types";

// The example table from requirments.md / the screenshot.
const EXAMPLE_TABLE: FunctionalityTable = {
  ingen: { 1: 100, 3: 100, 7: 100, 30: 100, 90: 100 },
  "svært små": { 1: 95, 3: 100, 7: 100, 30: 100, 90: 100 },
  små: { 1: 90, 3: 100, 7: 100, 30: 100, 90: 100 },
  middels: { 1: 80, 3: 90, 7: 100, 30: 100, 90: 100 },
  store: { 1: 60, 3: 80, 7: 100, 30: 100, 90: 100 },
  "svært store": { 1: 40, 3: 60, 7: 80, 30: 100, 90: 100 },
};

describe("computeTimedConsequenceValue", () => {
  it("returns V_d1 unchanged at day 1 (identity - F_dx == F_d1)", () => {
    const value = computeTimedConsequenceValue({
      consequenceValue: 80,
      category: "store",
      functionalityTable: EXAMPLE_TABLE,
      timeframeDays: 1,
    });
    expect(value).toBe(80);
  });

  it("scales down at day 3 per the formula (80 * (1 - (80-60)/40) = 40)", () => {
    const value = computeTimedConsequenceValue({
      consequenceValue: 80,
      category: "store",
      functionalityTable: EXAMPLE_TABLE,
      timeframeDays: 3,
    });
    expect(value).toBe(40);
  });

  it("drops to 0 once functionality is fully recovered (day 7/30/90 for 'store')", () => {
    for (const day of [7, 30, 90] as const) {
      const value = computeTimedConsequenceValue({
        consequenceValue: 80,
        category: "store",
        functionalityTable: EXAMPLE_TABLE,
        timeframeDays: day,
      });
      expect(value).toBe(0);
    }
  });

  it("guards the zero-division case for 'ingen' (F_d1=100 every day) without throwing", () => {
    const value = computeTimedConsequenceValue({
      consequenceValue: 0,
      category: "ingen",
      functionalityTable: EXAMPLE_TABLE,
      timeframeDays: 30,
    });
    expect(value).toBe(0);
  });
});
