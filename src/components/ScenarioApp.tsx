"use client";

import { useEffect, useRef, useState } from "react";
import { signOut } from "next-auth/react";
import { ScenarioGraph } from "@/components/graph/ScenarioGraph";
import { SegmentedControl } from "@/components/SegmentedControl";
import { ComparisonPanel } from "@/components/ComparisonPanel";
import { NodeDetailPanel } from "@/components/NodeDetailPanel";
import { EdgeDetailPopover } from "@/components/graph/EdgeDetailPopover";
import { compareToPrevious } from "@/lib/calc/compareResults";
import { describeDelta } from "@/lib/calc/describeDelta";
import type { RecomputeResult } from "@/lib/calc/recompute";
import type { ConsequenceLabel } from "@/lib/calc/mappings";
import { TIMEFRAME_DAYS, type TimeframeDays } from "@/lib/calc/catalog";

type ScenarioSummary = { id: string; name: string };
type Overrides = {
  nodeCategories: Record<string, ConsequenceLabel>;
  connectionLevels: Record<string, number>;
};

const EMPTY_OVERRIDES: Overrides = { nodeCategories: {}, connectionLevels: {} };
const RECOMPUTE_DEBOUNCE_MS = 300;

export function ScenarioApp() {
  const [scenarios, setScenarios] = useState<ScenarioSummary[]>([]);
  const [scenarioId, setScenarioId] = useState<string | null>(null);
  const [indirectEnabled, setIndirectEnabled] = useState(false);
  const [timeframeDays, setTimeframeDays] = useState<TimeframeDays>(1);
  const [overrides, setOverrides] = useState<Overrides>(EMPTY_OVERRIDES);
  const [result, setResult] = useState<RecomputeResult | null>(null);
  const [editImpactSummary, setEditImpactSummary] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [scenariosError, setScenariosError] = useState<string | null>(null);

  const resultRef = useRef<RecomputeResult | null>(null);
  useEffect(() => {
    resultRef.current = result;
  }, [result]);

  // Selecting a scenario is a user-driven event (either the dropdown, or the
  // initial default pick once the list loads) - handled imperatively rather
  // than via an effect keyed on scenarioId, so the state resets happen as
  // part of that event instead of synchronously inside an effect body.
  function selectScenario(id: string) {
    setScenarioId(id);
    setLoading(true);
    setOverrides(EMPTY_OVERRIDES);
    setIndirectEnabled(false);
    setTimeframeDays(1);
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
    setEditImpactSummary(null);
    resultRef.current = null; // no "previous" yet for this scenario
    setResult(null);

    fetch(`/api/scenarios/${id}`)
      .then((r) => r.json())
      .then((data: RecomputeResult) => {
        setResult({ nodes: data.nodes, edges: data.edges });
        setLoading(false);
      });
  }

  // Scenario list, once - picks the first scenario as the default.
  useEffect(() => {
    fetch("/api/scenarios")
      .then((r) => r.json())
      .then((data: { scenarios: ScenarioSummary[] }) => {
        setScenarios(data.scenarios ?? []);
        if (data.scenarios?.[0]) {
          selectScenario(data.scenarios[0].id);
        } else {
          setScenariosError(
            "Fant ingen scenarioer for kontoen din. Prøv å logge ut og inn igjen - " +
              "hvis problemet vedvarer, mangler kontoen medlemskap i et team med scenarioer.",
          );
        }
      })
      .catch(() => {
        setScenariosError("Klarte ikke å hente scenarioer. Prøv å laste siden på nytt.");
      });
  }, []);

  // Debounced stateless recompute whenever the toggle, slider, or an override
  // changes - this is the personal what-if loop.
  useEffect(() => {
    if (!scenarioId) return;

    const timeout = setTimeout(() => {
      fetch(`/api/scenarios/${scenarioId}/recompute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ indirectEnabled, timeframeDays, overrides }),
      })
        .then((r) => r.json())
        .then((data: RecomputeResult) => {
          const previous = resultRef.current;
          setResult(data);
          setEditImpactSummary(
            previous ? describeDelta(compareToPrevious(previous, data), "sinceLastChange") : null,
          );
        });
    }, RECOMPUTE_DEBOUNCE_MS);

    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- scenarioId change is handled by the base-load effect above
  }, [indirectEnabled, timeframeDays, overrides]);

  function handleCategoryChange(nodeId: string, category: ConsequenceLabel) {
    setOverrides((prev) => ({ ...prev, nodeCategories: { ...prev.nodeCategories, [nodeId]: category } }));
  }

  function handleConnectionLevelChange(edgeId: string, level: number) {
    setOverrides((prev) => ({ ...prev, connectionLevels: { ...prev.connectionLevels, [edgeId]: level } }));
  }

  function handleResetOverrides() {
    setOverrides(EMPTY_OVERRIDES);
  }

  const selectedNode = result?.nodes.find((n) => n.id === selectedNodeId) ?? null;
  const selectedEdge = result?.edges.find((e) => e.id === selectedEdgeId) ?? null;
  const incomingDirectEdge = selectedNode
    ? (result?.edges.find((e) => e.kind === "DIRECT" && e.childId === selectedNode.id) ?? null)
    : null;

  return (
    <div className="appShell">
      <header className="topBar">
        <div className="topBarGroup">
          <span className="controlLabel">Scenario</span>
          <select
            className="scenarioSelect"
            value={scenarioId ?? ""}
            onChange={(e) => selectScenario(e.target.value)}
          >
            {scenarios.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div className="topBarDivider" aria-hidden="true" />

        <div className="topBarGroup">
          <span className="controlLabel">Indirekte følge</span>
          <SegmentedControl
            ariaLabel="Indirekte følge"
            options={[
              { value: false, label: "Av" },
              { value: true, label: "På" },
            ]}
            value={indirectEnabled}
            onChange={setIndirectEnabled}
          />
        </div>

        <div className="topBarGroup">
          <span className="controlLabel">Tidsramme</span>
          <SegmentedControl
            ariaLabel="Tidsramme"
            options={TIMEFRAME_DAYS.map((day) => ({
              value: day,
              label: day === 1 ? "1 dag" : `${day} dager`,
            }))}
            value={timeframeDays}
            onChange={setTimeframeDays}
          />
        </div>

        <div className="topBarSpacer" />

        <button type="button" className="logoutButton" onClick={() => signOut({ callbackUrl: "/logg-inn" })}>
          <span className="material-symbols-outlined" aria-hidden="true">
            logout
          </span>
          Logg ut
        </button>
      </header>

      {scenariosError && <p className="hint" style={{ padding: "0.75rem 1rem" }}>{scenariosError}</p>}

      <div className="mainArea">
        <aside className="sidePanels">
          {result && <ComparisonPanel result={result} />}

          {selectedNode && (
            <NodeDetailPanel
              node={selectedNode}
              incomingDirectEdge={incomingDirectEdge}
              editImpactSummary={editImpactSummary}
              onClose={() => setSelectedNodeId(null)}
              onCategoryChange={handleCategoryChange}
              onConnectionLevelChange={handleConnectionLevelChange}
              onResetOverrides={handleResetOverrides}
            />
          )}

          {selectedEdge && (
            <EdgeDetailPopover
              edge={selectedEdge}
              nodes={result?.nodes ?? []}
              onClose={() => setSelectedEdgeId(null)}
            />
          )}
        </aside>

        <div className="graphArea">
          {result && (
            <ScenarioGraph
              nodes={result.nodes}
              edges={result.edges}
              onNodeClick={(id) => {
                setSelectedNodeId(id);
                setSelectedEdgeId(null);
              }}
              onEdgeClick={(id) => {
                setSelectedEdgeId(id);
                setSelectedNodeId(null);
              }}
            />
          )}
          {loading && <p>Laster …</p>}
        </div>
      </div>
    </div>
  );
}
