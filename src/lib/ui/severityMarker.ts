import { SEVERITY_COLORS } from "@/lib/ui/severityColors";
import type { ConsequenceLabel } from "@/lib/calc/mappings";

export type SeverityMarkerShape = "circle" | "triangle" | "diamond" | "square" | "star";

export type SeverityMarker = { shape: SeverityMarkerShape; color: string };

const SHAPE_BY_CATEGORY: Record<Exclude<ConsequenceLabel, "ingen">, SeverityMarkerShape> = {
  "svært små": "circle",
  små: "triangle",
  middels: "diamond",
  store: "square",
  "svært store": "star",
};

/** Edge severity marker: shape + color redundantly encode the same category
 * (accessibility - color is never the only channel). "ingen" renders no
 * marker at all, matching how "ingen" gauge segments are hidden rather than
 * gray-filled (see GaugeIndicator.tsx). */
export function severityMarkerFor(category: ConsequenceLabel): SeverityMarker | null {
  if (category === "ingen") return null;
  return { shape: SHAPE_BY_CATEGORY[category], color: SEVERITY_COLORS[category] };
}

function regularPolygonPoints(cx: number, cy: number, r: number, sides: number, rotationDeg: number): string {
  const points: string[] = [];
  for (let i = 0; i < sides; i++) {
    const angle = ((rotationDeg + (360 / sides) * i) * Math.PI) / 180;
    points.push(`${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`);
  }
  return points.join(" ");
}

function starPoints(cx: number, cy: number, outerR: number, innerR: number): string {
  const points: string[] = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const angle = (-90 + (360 / 10) * i) * (Math.PI / 180);
    points.push(`${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`);
  }
  return points.join(" ");
}

/** SVG polygon `points` for every shape except "circle" (rendered with a
 * plain `<circle>` element instead) - shared by the in-graph edge marker
 * (FloatingEdge.tsx) and the legend swatch (SeverityLegend.tsx) so the two
 * stay pixel-identical. */
export function severityGlyphPoints(shape: SeverityMarkerShape, cx: number, cy: number, r: number): string | null {
  switch (shape) {
    case "circle":
      return null;
    case "triangle":
      return regularPolygonPoints(cx, cy, r, 3, -90);
    case "diamond":
      return regularPolygonPoints(cx, cy, r, 4, -90);
    case "square":
      return regularPolygonPoints(cx, cy, r, 4, -45);
    case "star":
      return starPoints(cx, cy, r, r * 0.45);
  }
}
