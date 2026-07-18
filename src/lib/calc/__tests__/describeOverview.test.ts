import { describe, expect, it } from "vitest";
import { describeOverview } from "@/lib/calc/describeOverview";
import type { ComputedNode } from "@/lib/calc/recompute";

function node(overrides: Partial<ComputedNode>): ComputedNode {
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

describe("describeOverview", () => {
  it("mentions the scenario name, indirect toggle state, and timeframe in the background line", () => {
    const result = describeOverview({
      scenarioName: "Scenario 1",
      indirectEnabled: true,
      timeframeDays: 7,
      nodes: [node({ id: "a", label: "Transport", totalConsequenceValue: 40 })],
    });
    expect(result.background).toContain("«Scenario 1»");
    expect(result.background).toContain("slått på");
    expect(result.background).toContain("7 dager");
  });

  it("names the most affected function and its severity", () => {
    const result = describeOverview({
      scenarioName: "S",
      indirectEnabled: false,
      timeframeDays: 1,
      nodes: [
        node({ id: "a", label: "Transport", totalConsequenceValue: 40 }),
        node({ id: "b", label: "Helse", totalConsequenceValue: 90 }),
      ],
    });
    expect(result.observations.join(" ")).toContain("Mest påvirket er Helse");
    expect(result.observations.join(" ")).toContain("90 poeng");
    expect(result.observations.join(" ")).toContain("svært store");
  });

  it("suggests turning on indirect follow-on when it's off", () => {
    const result = describeOverview({
      scenarioName: "S",
      indirectEnabled: false,
      timeframeDays: 1,
      nodes: [node({ id: "a", label: "Transport", totalConsequenceValue: 40 })],
    });
    expect(result.observations.join(" ")).toContain("skru på indirekte følge");
  });

  it("skips the indirect suggestion when it's already on", () => {
    const result = describeOverview({
      scenarioName: "S",
      indirectEnabled: true,
      timeframeDays: 1,
      nodes: [node({ id: "a", label: "Transport", totalConsequenceValue: 40 })],
    });
    expect(result.observations.join(" ")).not.toContain("skru på indirekte følge");
  });

  it("reports no impact when every function is at 0", () => {
    const result = describeOverview({
      scenarioName: "S",
      indirectEnabled: false,
      timeframeDays: 1,
      nodes: [node({ id: "a", label: "Transport", totalConsequenceValue: 0 })],
    });
    expect(result.observations.join(" ")).toContain("Ingen funksjoner er påvirket");
  });

  it("excludes the hendelse node from the affected-function count", () => {
    const result = describeOverview({
      scenarioName: "S",
      indirectEnabled: false,
      timeframeDays: 1,
      nodes: [
        node({ id: "h", isHendelse: true, totalConsequenceValue: 0 }),
        node({ id: "a", label: "Transport", totalConsequenceValue: 40 }),
      ],
    });
    expect(result.observations.join(" ")).toContain("1 funksjon er påvirket");
  });
});
