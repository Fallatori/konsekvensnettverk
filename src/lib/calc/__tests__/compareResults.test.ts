import { describe, expect, it } from "vitest";
import { compareResults, compareToOriginal, compareToPrevious } from "@/lib/calc/compareResults";
import type { RecomputeResult } from "@/lib/calc/recompute";

function node(overrides: Partial<RecomputeResult["nodes"][number]>): RecomputeResult["nodes"][number] {
  return {
    id: "n",
    functionKey: "N",
    label: "N",
    description: "",
    isHendelse: false,
    isDirect: true,
    subtype: "funksjon",
    consequenceCategory: "middels",
    originalConsequenceValue: 0,
    timedConsequenceValue: 0,
    indirectConsequenceValue: 0,
    totalConsequenceValue: 0,
    ...overrides,
  };
}

describe("compareResults", () => {
  it("buckets a decreased node", () => {
    const baseline = new Map([["a", { label: "A", value: 80 }]]);
    const current = new Map([["a", { label: "A", value: 40 }]]);
    const result = compareResults(baseline, current);
    expect(result.nodes[0]).toMatchObject({ id: "a", baseline: 80, current: 40, delta: -40, bucket: "decreased" });
  });

  it("buckets a synthesized (baseline 0) node as newlyAffected", () => {
    const baseline = new Map([["a", { label: "A", value: 0 }]]);
    const current = new Map([["a", { label: "A", value: 15 }]]);
    const result = compareResults(baseline, current);
    expect(result.nodes[0].bucket).toBe("newlyAffected");
  });

  it("buckets an unchanged node with delta 0", () => {
    const baseline = new Map([["a", { label: "A", value: 60 }]]);
    const current = new Map([["a", { label: "A", value: 60 }]]);
    const result = compareResults(baseline, current);
    expect(result.nodes[0]).toMatchObject({ bucket: "unchanged", delta: 0 });
  });

  it("excludes newlyAffected (baseline=0) nodes from the average-delta denominator", () => {
    const baseline = new Map([
      ["a", { label: "A", value: 80 }], // delta -40
      ["b", { label: "B", value: 0 }], // newly affected, delta +15
    ]);
    const current = new Map([
      ["a", { label: "A", value: 40 }],
      ["b", { label: "B", value: 15 }],
    ]);
    const result = compareResults(baseline, current);
    // Only "a" (baseline>0) counts: average = -40 / 1 = -40, not (-40+15)/2.
    expect(result.averageDelta).toBe(-40);
  });

  it("sorts nodes by |delta| descending", () => {
    const baseline = new Map([
      ["small", { label: "Small", value: 60 }],
      ["big", { label: "Big", value: 80 }],
    ]);
    const current = new Map([
      ["small", { label: "Small", value: 55 }],
      ["big", { label: "Big", value: 20 }],
    ]);
    const result = compareResults(baseline, current);
    expect(result.nodes.map((n) => n.id)).toEqual(["big", "small"]);
  });
});

describe("compareToOriginal", () => {
  it("compares each node's originalConsequenceValue against its totalConsequenceValue", () => {
    const result: RecomputeResult = {
      nodes: [node({ id: "a", originalConsequenceValue: 80, totalConsequenceValue: 40 })],
      edges: [],
    };
    const comparison = compareToOriginal(result);
    expect(comparison.nodes[0]).toMatchObject({ baseline: 80, current: 40, bucket: "decreased" });
  });

  it("excludes the hendelse node", () => {
    const result: RecomputeResult = {
      nodes: [node({ id: "hendelse-1", isHendelse: true, isDirect: true })],
      edges: [],
    };
    const comparison = compareToOriginal(result);
    expect(comparison.nodes).toHaveLength(0);
  });
});

describe("compareToPrevious", () => {
  it("diffs totalConsequenceValue between two full recompute results (edit-impact baseline)", () => {
    const previous: RecomputeResult = {
      nodes: [node({ id: "a", totalConsequenceValue: 40 })],
      edges: [],
    };
    const next: RecomputeResult = {
      nodes: [node({ id: "a", totalConsequenceValue: 60 })],
      edges: [],
    };
    const comparison = compareToPrevious(previous, next);
    expect(comparison.nodes[0]).toMatchObject({ baseline: 40, current: 60, delta: 20, bucket: "increased" });
  });
});
