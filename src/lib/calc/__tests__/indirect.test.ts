import { describe, expect, it } from "vitest";
import { listIndirectContributions, maxIndirectContribution } from "@/lib/calc/formulas/indirect";
import type { IndirectImpactRow } from "@/lib/calc/catalog/types";

// Mirrors your "Consequence 3" row: source's own category -> impact induced
// on target "B" (all 5 non-ingen columns present, plus ingen -> ingen).
const ROW: IndirectImpactRow = {
  ingen: { B: "ingen" },
  "svært små": { B: "svært små" }, // point 1
  små: { B: "små" }, // point 5
  middels: { B: "ingen" }, // not part of the worked example - left neutral
  store: { B: "store" }, // point 15
  "svært store": { B: "svært store" }, // point 20
};

describe("listIndirectContributions / maxIndirectContribution", () => {
  it("worked example: svært små -> point 1, små -> point 5, store -> point 15, svært store -> point 20", () => {
    const cases: Array<[keyof typeof ROW, number]> = [
      ["svært små", 1],
      ["små", 5],
      ["store", 15],
      ["svært store", 20],
    ];
    for (const [category, points] of cases) {
      const contributions = listIndirectContributions("B", [
        { functionKey: "A", timedCategory: category, indirectImpactRow: ROW },
      ]);
      expect(maxIndirectContribution(contributions).points).toBe(points);
    }
  });

  it("ingen (or no relationship) contributes zero and is excluded from the list", () => {
    const contributions = listIndirectContributions("B", [
      { functionKey: "A", timedCategory: "ingen", indirectImpactRow: ROW },
    ]);
    expect(contributions).toHaveLength(0);
    expect(maxIndirectContribution(contributions).points).toBe(0);
  });

  it("takes the MAX across multiple contributing sources, not a sum", () => {
    const contributions = listIndirectContributions("B", [
      { functionKey: "A", timedCategory: "små", indirectImpactRow: ROW }, // 5
      { functionKey: "C", timedCategory: "store", indirectImpactRow: ROW }, // 15
    ]);
    expect(maxIndirectContribution(contributions).points).toBe(15);
    // But every nonzero contribution is still listed (for edge-drawing).
    expect(contributions).toHaveLength(2);
  });

  it("a source never contributes to itself", () => {
    const contributions = listIndirectContributions("A", [
      { functionKey: "A", timedCategory: "svært store", indirectImpactRow: ROW },
    ]);
    expect(contributions).toHaveLength(0);
  });
});
