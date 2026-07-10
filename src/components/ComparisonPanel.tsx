"use client";

import { useState } from "react";
import { compareToOriginal } from "@/lib/calc/compareResults";
import { describeDelta } from "@/lib/calc/describeDelta";
import type { RecomputeResult } from "@/lib/calc/recompute";

export function ComparisonPanel({ result }: { result: RecomputeResult }) {
  const [isOpen, setIsOpen] = useState(true);
  const [showDetails, setShowDetails] = useState(false);

  const comparison = compareToOriginal(result);
  const summary = describeDelta(comparison, "vsScenarioDefaults");

  return (
    <div className="panel">
      <button
        type="button"
        className="panelSummaryToggle"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
      >
        <h2>Sammenligning</h2>
        <span className="material-symbols-outlined" aria-hidden="true">
          {isOpen ? "expand_less" : "expand_more"}
        </span>
      </button>

      {isOpen && (
        <>
          <p>{summary}</p>

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
                  <th>Standard</th>
                  <th>Nå</th>
                  <th>Endring</th>
                </tr>
              </thead>
              <tbody>
                {comparison.nodes.map((node) => (
                  <tr key={node.id}>
                    <td>{node.label}</td>
                    <td>{Math.round(node.baseline)}</td>
                    <td>{Math.round(node.current)}</td>
                    <td>
                      {node.delta > 0 ? "+" : ""}
                      {Math.round(node.delta)}
                    </td>
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
