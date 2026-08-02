import {
  CONSEQUENCE_LABELS,
  CONSEQUENCE_VALUE,
  NODE_SUBTYPE_LABEL,
  consequenceLabelForIndirectPoints,
  nearestConsequenceLabel,
  type ConsequenceLabel,
} from "@/lib/calc/mappings";
import { GaugeIndicator } from "@/components/graph/GaugeIndicator";
import { InfoTooltip } from "@/components/InfoTooltip";
import { RichText } from "@/components/RichText";
import type { ComputedNode } from "@/lib/calc/recompute";
import { SUBTYPE_FILL_COLORS } from "@/lib/styles/tokens";

export function NodeDetailPanel({
  node,
  editImpactSummary,
  onClose,
  onCategoryChange,
  onResetOverrides,
}: {
  node: ComputedNode;
  /** "As a result of this change" summary, shown after the most recent edit. */
  editImpactSummary: string | null;
  onClose: () => void;
  onCategoryChange: (nodeId: string, category: ConsequenceLabel) => void;
  onResetOverrides: () => void;
}) {
  const canEdit = node.isDirect && !node.isHendelse;

  return (
    <div className="panel">
      <div className="panelHeader">
        {/* The definition is the function's general description from the
            catalog (domainData.json), so it belongs on the label itself -
            the scenario-specific text is rendered separately below. */}
        <h2 className="tooltipAnchor">
          {node.label}
          {node.definition && <InfoTooltip text={node.definition} placement="below" />}
        </h2>
        <button type="button" onClick={onClose} aria-label="Lukk">
          <span className="material-symbols-outlined" aria-hidden="true">
            close
          </span>
        </button>
      </div>

      <p className="hint">Undertype: {NODE_SUBTYPE_LABEL[node.subtype]}</p>

      {node.description && (
        <>
          <p className="hint descriptionLabel">{node.isHendelse ? "Om hendelsen" : "I dette scenarioet"}</p>
          <RichText text={node.description} />
        </>
      )}

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
          <dt>
            Opprinnelig konsekvensverdi (V₁)
            <InfoTooltip
              text={
                'Dette er start-poengsummen rett etter at noe skjer, før vi tar hensyn til tid. Den kommer rett fra kategorien over: "ingen"=0, "svært små"=20, "små"=40, "middels"=60, "store"=80, "svært store"=100.'
              }
            />
          </dt>
          <dd>
            {Math.round(CONSEQUENCE_VALUE[node.consequenceCategory ?? "ingen"])} ({node.consequenceCategory ?? "ingen"})
          </dd>

          <dt>
            Tidsjustert konsekvens
            <InfoTooltip
              text="Hvor ille det fortsatt er etter at litt tid har gått, siden ting ofte blir reparert litt etter litt. Regnestykke: start-verdien (V₁) ganges med en brøk som blir mindre jo mer som er reparert innen den valgte tidsfristen. Er alt reparert, går tallet mot 0. Er ingenting reparert, forblir tallet nesten som V₁."
            />
          </dt>
          <dd>
            {Math.round(node.timedConsequenceValue)} ({nearestConsequenceLabel(node.timedConsequenceValue)})
          </dd>

          <dt>
            Indirekte konsekvens
            <InfoTooltip
              text="Ekstra poeng denne funksjonen får fordi ANDRE funksjoner rundt den også er rammet, og problemet sprer seg hit. Vi ser på alle funksjonene som påvirker denne, og bruker bare den STØRSTE effekten - vi legger ikke sammen alle sammen."
            />
          </dt>
          <dd>
            {Math.round(node.indirectConsequenceValue)} ({consequenceLabelForIndirectPoints(node.indirectConsequenceValue)})
          </dd>

          <dt>
            Total konsekvensverdi
            <InfoTooltip text="Sluttresultatet: tidsjustert konsekvens pluss indirekte konsekvens lagt sammen, men aldri mer enn 100 poeng. Dette tallet bestemmer hvor mange ringer som lyser i måleren over." />
          </dt>
          <dd>
            {Math.round(node.totalConsequenceValue)} ({nearestConsequenceLabel(node.totalConsequenceValue)})
          </dd>
        </dl>
      )}

      {canEdit && (
        <div className="editControls">
          <label>
            <span className="tooltipAnchor">
              Endre opprinnelig konsekvens til
              <InfoTooltip text='Hvor alvorlig konsekvensen er, valgt fra en skala fra "ingen" til "svært store". Dette valget bestemmer start-poengsummen (V₁) som alle de andre tallene under regnes ut fra.' />
            </span>
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
