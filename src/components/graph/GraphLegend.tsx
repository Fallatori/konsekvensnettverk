import { CONSEQUENCE_LABELS } from "@/lib/calc/mappings";
import { EDGE_WIRE_COLOR } from "@/components/graph/FloatingEdge";
import { DIRECT_EDGE_WIDTH, INDIRECT_EDGE_WIDTH, SEVERITY_COLORS } from "@/lib/styles/tokens";

const CATEGORY_LABEL_NO: Record<string, string> = {
  "svært små": "Svært små",
  små: "Små",
  middels: "Middels",
  store: "Store",
  "svært store": "Svært store",
};

const CONNECTION_ROWS = [
  { width: DIRECT_EDGE_WIDTH, label: "Direkte påvirkning" },
  { width: INDIRECT_EDGE_WIDTH, label: "Indirekte påvirkning" },
];

const SWATCH_WIDTH = 28;
const SWATCH_HEIGHT = 16;

/** Single bottom-right legend, two sections stacked in one panel: severity
 * color on top (always shown - it applies to every impacted node regardless
 * of the indirect toggle) and connection width below it. The connection
 * section only appears once indirect impact is on - with only direct edges
 * on screen every line is the same width, so there's nothing for it to key. */
export function GraphLegend({ indirectEnabled }: { indirectEnabled: boolean }) {
  const categories = CONSEQUENCE_LABELS.filter((label) => label !== "ingen");

  return (
    <div className="graphLegend">
      <div className="graphLegendTitle">Alvorlighetsgrad</div>
      {categories.map((category) => (
        <div key={category} className="graphLegendRow">
          <span className="graphLegendSwatch" style={{ background: SEVERITY_COLORS[category] }} />
          <span>{CATEGORY_LABEL_NO[category]}</span>
        </div>
      ))}

      {indirectEnabled && (
        <>
          <div className="graphLegendDivider" />
          <div className="graphLegendTitle">Forbindelser</div>
          {CONNECTION_ROWS.map(({ width, label }) => (
            <div key={label} className="graphLegendRow">
              <svg aria-hidden="true" height={SWATCH_HEIGHT} width={SWATCH_WIDTH}>
                <line
                  x1={2}
                  y1={SWATCH_HEIGHT / 2}
                  x2={SWATCH_WIDTH - 2}
                  y2={SWATCH_HEIGHT / 2}
                  stroke={EDGE_WIRE_COLOR}
                  strokeWidth={width}
                  strokeLinecap="round"
                />
              </svg>
              <span>{label}</span>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
