import { CONSEQUENCE_LABELS, connectionLevelForCategory } from "@/lib/calc/mappings";
import { EDGE_FLOW_COLOR, EDGE_WIRE_COLOR } from "@/components/graph/FloatingEdge";
import { useCurrentEdgeStyle } from "@/lib/styles/context";
import { SEVERITY_COLORS } from "@/lib/styles/tokens";

const CATEGORY_LABEL_NO: Record<string, string> = {
  "svært små": "Svært små",
  små: "Små",
  middels: "Middels",
  store: "Store",
  "svært store": "Svært store",
};

const SWATCH_WIDTH = 28;
const SWATCH_HEIGHT = 16;

/** Legend line thickness mirrors a direct edge's own strokeWidth formula
 * (see ScenarioGraph.tsx: `1 + edge.connectionLevel`), so the legend reads
 * as a key for the edges' actual rendered width rather than a separate
 * shape/color code. Swatch color tracks the active connection style
 * (EdgeStyleContext) so it stays consistent with what's actually on screen:
 * "standard" and "flow" render every edge in one flat color regardless of
 * severity, so the legend matches that; "gradient" colors each edge by its
 * source/target node subtype (no single representative color), so the
 * severity palette is kept there as the closest available proxy. */
export function SeverityLegend() {
  const categories = CONSEQUENCE_LABELS.filter((label) => label !== "ingen");
  const connectionStyle = useCurrentEdgeStyle();
  const flatColor = connectionStyle === "standard" ? EDGE_WIRE_COLOR : connectionStyle === "flow" ? EDGE_FLOW_COLOR : null;

  return (
    <div className="severityLegend">
      <div className="severityLegendTitle">Alvorlighetsgrad</div>
      {categories.map((category) => {
        const strokeWidth = 1 + connectionLevelForCategory(category);
        return (
          <div key={category} className="severityLegendRow">
            <svg aria-hidden="true" height={SWATCH_HEIGHT} width={SWATCH_WIDTH}>
              <line
                x1={2}
                y1={SWATCH_HEIGHT / 2}
                x2={SWATCH_WIDTH - 2}
                y2={SWATCH_HEIGHT / 2}
                stroke={flatColor ?? SEVERITY_COLORS[category]}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
              />
            </svg>
            <span>{CATEGORY_LABEL_NO[category]}</span>
          </div>
        );
      })}
    </div>
  );
}
