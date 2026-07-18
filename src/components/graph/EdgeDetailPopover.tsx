import type { ComputedEdge, ComputedNode } from "@/lib/calc/recompute";
import { CONSEQUENCE_LABELS, consequenceLabelForIndirectPoints } from "@/lib/calc/mappings";

export function EdgeDetailPopover({
  edge,
  nodes,
  onClose,
}: {
  edge: ComputedEdge;
  nodes: ComputedNode[];
  onClose: () => void;
}) {
  const source = nodes.find((n) => n.id === edge.parentId);
  const target = nodes.find((n) => n.id === edge.childId);

  // Direct: connectionLevel is the target's time-adjusted severity, as the
  // ConsequenceLabel taxonomy's ordinal (0 "ingen" .. 5 "svært store") - see
  // ComputedEdge.connectionLevel in lib/calc/recompute.ts.
  const strength =
    edge.kind === "DIRECT"
      ? (CONSEQUENCE_LABELS[edge.connectionLevel] ?? "ingen")
      : consequenceLabelForIndirectPoints(edge.connectionLevel);

  return (
    <div className="panel">
      <div className="panelHeader">
        <h2>Forbindelse</h2>
        <button type="button" onClick={onClose} aria-label="Lukk">
          <span className="material-symbols-outlined" aria-hidden="true">
            close
          </span>
        </button>
      </div>
      <p>
        <strong>Retning:</strong> {source?.label ?? edge.parentId} → {target?.label ?? edge.childId}
      </p>
      <p>
        <strong>Type:</strong> {edge.kind === "DIRECT" ? "Direkte følge" : "Indirekte følge"}
      </p>
      <p>
        <strong>Styrke:</strong> {strength}
      </p>
    </div>
  );
}
