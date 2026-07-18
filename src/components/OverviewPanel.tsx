"use client";

import { useState } from "react";
import type { TimeframeDays } from "@/lib/calc/catalog";
import { describeOverview } from "@/lib/calc/describeOverview";
import { nearestConsequenceLabel } from "@/lib/calc/mappings";
import type { RecomputeResult } from "@/lib/calc/recompute";

export function OverviewPanel({
  result,
  scenarioName,
  indirectEnabled,
  timeframeDays,
}: {
  result: RecomputeResult;
  scenarioName: string;
  indirectEnabled: boolean;
  timeframeDays: TimeframeDays;
}) {
  const [isOpen, setIsOpen] = useState(true);
  const [showDetails, setShowDetails] = useState(false);

  // Recomputed fresh from the latest `result` on every render, so this
  // always reflects the current graph - no diffing against anything.
  const summary = describeOverview({ scenarioName, indirectEnabled, timeframeDays, nodes: result.nodes });

  const rankedNodes = result.nodes
    .filter((node) => !node.isHendelse)
    .slice()
    .sort((a, b) => b.totalConsequenceValue - a.totalConsequenceValue);

  return (
    <div className="panel">
      <button
        type="button"
        className="panelSummaryToggle"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
      >
        <h2>Oversikt</h2>
        <span className="material-symbols-outlined" aria-hidden="true">
          {isOpen ? "expand_less" : "expand_more"}
        </span>
      </button>

      {isOpen && (
        <>
          <p className="overviewBackground">{summary.background}</p>
          <ul className="overviewObservations">
            {summary.observations.map((observation, i) => (
              <li key={i}>{observation}</li>
            ))}
          </ul>

          <button
            type="button"
            className="detailToggle"
            aria-expanded={showDetails}
            onClick={() => setShowDetails((open) => !open)}
          >
            {showDetails ? "Skjul detaljer" : "Vis mer detaljer"}
          </button>

          {showDetails && (
            <table className="comparisonTable">
              <thead>
                <tr>
                  <th>Funksjon</th>
                  <th>Poeng</th>
                  <th>Kategori</th>
                </tr>
              </thead>
              <tbody>
                {rankedNodes.map((node) => (
                  <tr key={node.id}>
                    <td>{node.label}</td>
                    <td>{Math.round(node.totalConsequenceValue)}</td>
                    <td>{nearestConsequenceLabel(node.totalConsequenceValue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </div>
  );
}
