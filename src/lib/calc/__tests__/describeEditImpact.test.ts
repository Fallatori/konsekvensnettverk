import { describe, expect, it } from "vitest";
import { describeEditImpact } from "@/lib/calc/describeEditImpact";
import type { ComparisonResult } from "@/lib/calc/compareResults";

function comparison(overrides: Partial<ComparisonResult>): ComparisonResult {
  return {
    nodes: [],
    countsByBucket: { newlyAffected: 0, increased: 0, decreased: 0, unchanged: 0 },
    averageDelta: 0,
    ...overrides,
  };
}

describe("describeEditImpact", () => {
  it("returns null when there's no last action (nothing to describe yet)", () => {
    expect(describeEditImpact(comparison({}), null)).toBeNull();
  });

  it("names the category edit and excludes the edited node from the ripple list", () => {
    const result = describeEditImpact(
      comparison({
        nodes: [
          { id: "edited", label: "Transport", baseline: 40, current: 100, delta: 60, bucket: "increased" },
          { id: "other", label: "Kraftforsyning", baseline: 20, current: 40, delta: 20, bucket: "increased" },
        ],
      }),
      { type: "category", nodeId: "edited", nodeLabel: "Transport", category: "svært store" },
    );
    expect(result).toContain("Du endret konsekvenskategorien for «Transport» til «svært store»");
    expect(result).toContain("Kraftforsyning +20");
    expect(result).not.toContain("Transport +60");
    expect(result).toContain("sterkt avhengige av hverandre");
  });

  it("describes an indirect-toggle action across all nodes (no node excluded)", () => {
    const result = describeEditImpact(
      comparison({
        nodes: [{ id: "a", label: "Redningstjeneste", baseline: 0, current: 15, delta: 15, bucket: "newlyAffected" }],
      }),
      { type: "indirect", enabled: true },
    );
    expect(result).toContain("Du skrudde på indirekte følge");
    expect(result).toContain("Redningstjeneste +15");
  });

  it("describes a timeframe action", () => {
    const result = describeEditImpact(comparison({ nodes: [] }), { type: "timeframe", days: 7 });
    expect(result).toContain("Du endret tidsrammen til 7 dager");
    expect(result).toContain("Dette førte ikke til noen endring");
  });

  it("describes a reset action", () => {
    const result = describeEditImpact(comparison({ nodes: [] }), { type: "reset" });
    expect(result).toContain("Du tilbakestilte alle endringer til standardverdiene");
  });
});
