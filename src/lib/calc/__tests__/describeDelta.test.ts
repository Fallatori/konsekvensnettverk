import { describe, expect, it } from "vitest";
import { describeDelta } from "@/lib/calc/describeDelta";
import type { ComparisonResult } from "@/lib/calc/compareResults";

function comparison(overrides: Partial<ComparisonResult>): ComparisonResult {
  return {
    nodes: [],
    countsByBucket: { newlyAffected: 0, increased: 0, decreased: 0, unchanged: 0 },
    averageDelta: 0,
    ...overrides,
  };
}

describe("describeDelta", () => {
  it("names the top movers when there are few enough to fit", () => {
    const result = describeDelta(
      comparison({
        nodes: [
          { id: "a", label: "Kraftforsyning", baseline: 80, current: 40, delta: -40, bucket: "decreased" },
          { id: "b", label: "Eiendom", baseline: 0, current: 15, delta: 15, bucket: "newlyAffected" },
        ],
        averageDelta: -12.5,
      }),
      "vsScenarioDefaults",
    );
    expect(result).toContain("Sammenlignet med scenariets standardverdier");
    expect(result).toContain("Kraftforsyning -40");
    expect(result).toContain("Eiendom +15");
    expect(result).toContain("Gjennomsnittlig endring -12 %"); // Math.round(-12.5) === -12 in JS
  });

  it("falls back to counts-only when a bucket has more movers than fit readably", () => {
    const manyDecreased = Array.from({ length: 5 }, (_, i) => ({
      id: `n${i}`,
      label: `Node${i}`,
      baseline: 80,
      current: 40,
      delta: -40,
      bucket: "decreased" as const,
    }));
    const result = describeDelta(comparison({ nodes: manyDecreased }), "vsScenarioDefaults");
    expect(result).toContain("5 funksjoner ble bedre");
    expect(result).not.toContain("Node0");
  });

  it("uses the edit-impact framing and omits the average-delta clause", () => {
    const result = describeDelta(
      comparison({
        nodes: [{ id: "a", label: "Transport", baseline: 40, current: 60, delta: 20, bucket: "increased" }],
      }),
      "sinceLastChange",
    );
    expect(result).toContain("Som følge av denne endringen");
    expect(result).toContain("Transport +20");
    expect(result).not.toContain("Gjennomsnittlig");
  });

  it("reports no changes when every node is unchanged", () => {
    const result = describeDelta(
      comparison({ nodes: [{ id: "a", label: "A", baseline: 40, current: 40, delta: 0, bucket: "unchanged" }] }),
      "vsScenarioDefaults",
    );
    expect(result).toContain("ingen endringer");
  });
});
