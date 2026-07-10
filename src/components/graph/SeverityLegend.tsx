import { CONSEQUENCE_LABELS } from "@/lib/calc/mappings";
import { severityGlyphPoints, severityMarkerFor } from "@/lib/ui/severityMarker";

const CATEGORY_LABEL_NO: Record<string, string> = {
  "svært små": "Svært små",
  små: "Små",
  middels: "Middels",
  store: "Store",
  "svært store": "Svært store",
};

const GLYPH_CENTER = 8;
const GLYPH_RADIUS = 6;

/** Shape + color pairing for every non-"ingen" severity, so the edge markers
 * (FloatingEdge.tsx) are legible without relying on color alone. */
export function SeverityLegend() {
  const categories = CONSEQUENCE_LABELS.filter((label) => label !== "ingen");

  return (
    <div className="severityLegend">
      <div className="severityLegendTitle">Alvorlighetsgrad</div>
      {categories.map((category) => {
        const marker = severityMarkerFor(category);
        if (!marker) return null;
        const points = severityGlyphPoints(marker.shape, GLYPH_CENTER, GLYPH_CENTER, GLYPH_RADIUS);
        return (
          <div key={category} className="severityLegendRow">
            <svg aria-hidden="true" height="16" width="16">
              {points ? (
                <polygon fill={marker.color} points={points} />
              ) : (
                <circle cx={GLYPH_CENTER} cy={GLYPH_CENTER} fill={marker.color} r={GLYPH_RADIUS} />
              )}
            </svg>
            <span>{CATEGORY_LABEL_NO[category]}</span>
          </div>
        );
      })}
    </div>
  );
}
