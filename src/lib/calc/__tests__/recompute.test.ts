import { describe, expect, it } from "vitest";
import { recompute } from "@/lib/calc/recompute";
import type { CatalogEntry, FunctionalityTable, IndirectImpactRow } from "@/lib/calc/catalog/types";

// timeframeDays=1 makes ComputeTimedConsequenceMethod an identity (F_dx==F_d1
// whenever dx==1, regardless of table contents) - so these fixture tables can
// be trivial, keeping the cascade tests focused on the indirect algorithm.
const FLAT_TABLE: FunctionalityTable = {
  ingen: { 1: 50, 3: 50, 7: 50, 30: 50, 90: 50 },
  "svært små": { 1: 50, 3: 50, 7: 50, 30: 50, 90: 50 },
  små: { 1: 50, 3: 50, 7: 50, 30: 50, 90: 50 },
  middels: { 1: 50, 3: 50, 7: 50, 30: 50, 90: 50 },
  store: { 1: 50, 3: 50, 7: 50, 30: 50, 90: 50 },
  "svært store": { 1: 50, 3: 50, 7: 50, 30: 50, 90: 50 },
};

function emptyRow(): IndirectImpactRow {
  return { ingen: {}, "svært små": {}, små: {}, middels: {}, store: {}, "svært store": {} };
}

describe("recompute - two-round indirect cascade", () => {
  // A is directly hit. A -> B (round 1). B -> C (round 2, via the round-1
  // node - NOT reachable from A directly). C -> D exists but D must NOT
  // appear, since the algorithm stops after round 2. B also -> A, to prove
  // an already-active (direct) node's Ind_i is only ever produced by round 2
  // (round 1 alone, sourced from A only, could never make A contribute to
  // itself).
  const A: CatalogEntry = {
    functionKey: "A",
    label: "A",
    subtype: "funksjon",
    functionalityTable: FLAT_TABLE,
    indirectImpactRow: {
      ...emptyRow(),
      "svært store": { B: "middels", C: "ingen", D: "ingen" },
    },
  };
  const B: CatalogEntry = {
    functionKey: "B",
    label: "B",
    subtype: "funksjon",
    functionalityTable: FLAT_TABLE,
    indirectImpactRow: {
      ...emptyRow(),
      middels: { A: "små", C: "små", D: "ingen" },
    },
  };
  const C: CatalogEntry = {
    functionKey: "C",
    label: "C",
    subtype: "funksjon",
    functionalityTable: FLAT_TABLE,
    indirectImpactRow: {
      ...emptyRow(),
      små: { D: "store" }, // would reach D in a hypothetical round 3
    },
  };
  const D: CatalogEntry = {
    functionKey: "D",
    label: "D",
    subtype: "funksjon",
    functionalityTable: FLAT_TABLE,
    indirectImpactRow: emptyRow(),
  };

  const CATALOG: Record<string, CatalogEntry> = { A, B, C, D };
  const catalogLookup = (functionKey: string) => CATALOG[functionKey];
  const functionKeys = ["A", "B", "C", "D"];

  function run() {
    return recompute(
      {
        hendelseId: "hendelse-1",
        hendelseLabel: "Scenario 1",
        hendelseDescription: "",
        hendelseSubtype: "hazards",
        directNodes: [
          {
            id: "node-A",
            label: "A",
            description: "",
            functionKey: "A",
            subtype: "funksjon",
            baseConsequenceCategory: "svært store",
          },
        ],
        directEdges: [{ id: "edge-h-A", parentId: "hendelse-1", childId: "node-A", connectionLevel: 3 }],
        indirectEnabled: true,
        timeframeDays: 1,
      },
      { catalogLookup, functionKeys },
    );
  }

  it("promotes B in round 1 (reachable directly from A)", () => {
    const result = run();
    const nodeB = result.nodes.find((n) => n.functionKey === "B");
    expect(nodeB).toBeDefined();
    expect(nodeB!.isDirect).toBe(false);
    expect(nodeB!.consequenceCategory).toBe("middels");
  });

  it("promotes C in round 2 (reachable only via round-1 node B, not from A directly)", () => {
    const result = run();
    const nodeC = result.nodes.find((n) => n.functionKey === "C");
    expect(nodeC).toBeDefined();
    expect(nodeC!.consequenceCategory).toBe("små");
  });

  it("does NOT promote D, even though C could reach it - proves the algorithm stops after round 2", () => {
    const result = run();
    const nodeD = result.nodes.find((n) => n.functionKey === "D");
    expect(nodeD).toBeUndefined();
  });

  it("lets a round-1 node push an already-active direct node's Ind_i higher in round 2", () => {
    const result = run();
    const nodeA = result.nodes.find((n) => n.functionKey === "A");
    // A can only ever receive this contribution via B acting as a round-2
    // source - round 1 only has A itself as a source, and a source never
    // contributes to itself, so Ind_i(A) after round 1 alone would be 0.
    expect(nodeA!.indirectConsequenceValue).toBe(5); // "små" -> 5 points
  });

  it("draws an indirect edge for every (source, target) pair that contributed, not only the winner", () => {
    const result = run();
    const indirectEdges = result.edges.filter((e) => e.kind === "INDIRECT");
    const edgeToB = indirectEdges.find((e) => e.childId === "indirect:B");
    const edgeToC = indirectEdges.find((e) => e.childId === "indirect:C");
    const edgeToA = indirectEdges.find((e) => e.childId === "node-A");
    expect(edgeToB?.parentId).toBe("node-A");
    expect(edgeToC?.parentId).toBe("indirect:B");
    expect(edgeToA?.parentId).toBe("indirect:B");
  });
});

describe("recompute - cap at 100", () => {
  const HIGH: CatalogEntry = {
    functionKey: "HIGH",
    label: "High",
    subtype: "funksjon",
    functionalityTable: FLAT_TABLE,
    indirectImpactRow: emptyRow(),
  };
  const SOURCE: CatalogEntry = {
    functionKey: "SOURCE",
    label: "Source",
    subtype: "funksjon",
    functionalityTable: FLAT_TABLE,
    indirectImpactRow: {
      ...emptyRow(),
      "svært store": { HIGH: "svært store" }, // 20 points
    },
  };

  it("clamps totalConsequenceValue to 100 instead of exceeding it (90 + 20 -> 100, not 110)", () => {
    const result = recompute(
      {
        hendelseId: "hendelse-1",
        hendelseLabel: "Scenario",
        hendelseDescription: "",
        hendelseSubtype: "hazards",
        directNodes: [
          {
            id: "node-high",
            label: "High",
            description: "",
            functionKey: "HIGH",
            subtype: "funksjon",
            baseConsequenceCategory: "store",
          },
          {
            id: "node-source",
            label: "Source",
            description: "",
            functionKey: "SOURCE",
            subtype: "funksjon",
            baseConsequenceCategory: "svært store",
          },
        ],
        directEdges: [],
        overrides: { nodeCategories: { "node-high": "svært store" } }, // bump HIGH's own V_dx toward the ceiling
        indirectEnabled: true,
        timeframeDays: 1,
      },
      { catalogLookup: (key) => ({ HIGH, SOURCE })[key as "HIGH" | "SOURCE"], functionKeys: ["HIGH", "SOURCE"] },
    );

    const nodeHigh = result.nodes.find((n) => n.functionKey === "HIGH");
    // V_dx = 100 ("svært store" override, day 1 identity), Ind_i = 20 -> would
    // be 120 uncapped.
    expect(nodeHigh!.timedConsequenceValue).toBe(100);
    expect(nodeHigh!.indirectConsequenceValue).toBe(20);
    expect(nodeHigh!.totalConsequenceValue).toBe(100);
  });
});

describe("recompute - missing catalog entry fails loudly", () => {
  it("throws rather than silently falling back to a default table", () => {
    expect(() =>
      recompute(
        {
          hendelseId: "hendelse-1",
          hendelseLabel: "Scenario",
          hendelseDescription: "",
          hendelseSubtype: "hazards",
          directNodes: [
            {
              id: "node-x",
              label: "X",
              description: "",
              functionKey: "UNKNOWN_FUNCTION_KEY",
              subtype: "funksjon",
              baseConsequenceCategory: "middels",
            },
          ],
          directEdges: [],
          indirectEnabled: false,
          timeframeDays: 1,
        },
        {
          catalogLookup: () => {
            throw new Error('Unknown functionKey "UNKNOWN_FUNCTION_KEY" - no catalog entry registered for it.');
          },
          functionKeys: [],
        },
      ),
    ).toThrow(/Unknown functionKey/);
  });
});
