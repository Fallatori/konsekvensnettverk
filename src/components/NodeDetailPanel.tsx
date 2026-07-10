import {
  CONSEQUENCE_LABELS,
  NODE_SUBTYPE_LABEL,
  nearestConsequenceLabel,
  type ConsequenceLabel,
} from "@/lib/calc/mappings";
import { GaugeIndicator } from "@/components/graph/GaugeIndicator";
import type { ComputedEdge, ComputedNode } from "@/lib/calc/recompute";
import { SUBTYPE_FILL_COLORS } from "@/lib/ui/subtypeColors";

export function NodeDetailPanel({
  node,
  incomingDirectEdge,
  editImpactSummary,
  onClose,
  onCategoryChange,
  onConnectionLevelChange,
  onResetOverrides,
}: {
  node: ComputedNode;
  /** The node's single incoming direct edge, if it has one (only direct
   * nodes do - indirect/synthesized nodes have no persisted edge to edit). */
  incomingDirectEdge: ComputedEdge | null;
  /** "As a result of this change" summary, shown after the most recent edit. */
  editImpactSummary: string | null;
  onClose: () => void;
  onCategoryChange: (nodeId: string, category: ConsequenceLabel) => void;
  onConnectionLevelChange: (edgeId: string, level: number) => void;
  onResetOverrides: () => void;
}) {
  const canEdit = node.isDirect && !node.isHendelse;

  return (
    <div className="panel">
      <div className="panelHeader">
        <h2>{node.label}</h2>
        <button type="button" onClick={onClose} aria-label="Lukk">
          <span className="material-symbols-outlined" aria-hidden="true">
            close
          </span>
        </button>
      </div>

      <p className="hint">Undertype: {NODE_SUBTYPE_LABEL[node.subtype]}</p>

      {node.description && <p>{node.description}</p>}

      {!node.isHendelse && (
        <div style={{ display: "flex", justifyContent: "center", margin: "1rem 0" }}>
          {/* Reflects the current effective severity (totalConsequenceValue),
              same as the in-graph node dial - NOT the raw assigned category,
              which can differ once time decay/indirect effects are applied. */}
          <GaugeIndicator
            category={nearestConsequenceLabel(node.totalConsequenceValue)}
            size={120}
            label={node.label}
            fillColor={SUBTYPE_FILL_COLORS[node.subtype]}
          />
        </div>
      )}

      {!node.isHendelse && (
        <dl className="valueList">
          <dt>Tidsjustert konsekvens</dt>
          <dd>{Math.round(node.timedConsequenceValue)}</dd>
          <dt>Indirekte konsekvens</dt>
          <dd>{Math.round(node.indirectConsequenceValue)}</dd>
          <dt>Total konsekvensverdi</dt>
          <dd>{Math.round(node.totalConsequenceValue)}</dd>
        </dl>
      )}

      {canEdit && (
        <div className="editControls">
          <label>
            Konsekvenskategori
            <select
              value={node.consequenceCategory ?? "ingen"}
              onChange={(e) => onCategoryChange(node.id, e.target.value as ConsequenceLabel)}
            >
              {CONSEQUENCE_LABELS.map((label) => (
                <option key={label} value={label}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          {incomingDirectEdge && (
            <label>
              Forbindelsesstyrke (1-5)
              <input
                type="number"
                min={1}
                max={5}
                value={incomingDirectEdge.connectionLevel}
                onChange={(e) => onConnectionLevelChange(incomingDirectEdge.id, Number(e.target.value))}
              />
            </label>
          )}

          <button type="button" onClick={onResetOverrides}>
            Tilbakestill til standardverdier
          </button>
        </div>
      )}

      {!canEdit && !node.isHendelse && (
        <p className="hint">Denne funksjonen er kun indirekte påvirket og kan ikke redigeres direkte.</p>
      )}

      {editImpactSummary && <p className="editImpact">{editImpactSummary}</p>}
    </div>
  );
}
