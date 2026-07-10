import { BaseEdge, useInternalNode, type Edge, type EdgeProps } from "@xyflow/react";
import { curvedPath, floatingEdgePoints } from "@/components/graph/floatingEdgeGeometry";
import { NODE_RADIUS } from "@/components/graph/layoutConstants";
import { severityGlyphPoints, severityMarkerFor, type SeverityMarkerShape } from "@/lib/ui/severityMarker";
import { useEdgeHoverOpacity } from "@/components/graph/graphHoverContext";
import type { ConsequenceLabel } from "@/lib/calc/mappings";

export type FloatingEdgeData = {
  kind: "DIRECT" | "INDIRECT";
  /** Severity of the effect this edge carries - the target node's
   * consequenceCategory (see lib/ui/severityMarker.ts). */
  severity: ConsequenceLabel;
};

export type FloatingEdgeType = Edge<FloatingEdgeData, "floating">;

// Flat, muted "wire" stroke shared by every edge - severity is carried by the
// midpoint marker (shape + color), not by the line itself. Matches
// --edge-wire in globals.css (kept as a literal here since SVG presentation
// attributes don't reliably resolve CSS custom properties).
export const EDGE_WIRE_COLOR = "rgba(231, 236, 247, 0.28)";
// Thin outline so a marker reads clearly against edges/the dotted canvas -
// matches --surface in globals.css.
const MARKER_OUTLINE_COLOR = "#0a1526";
const MARKER_RADIUS = 6;

function SeverityMarkerGlyph({
  shape,
  x,
  y,
  color,
}: {
  shape: SeverityMarkerShape;
  x: number;
  y: number;
  color: string;
}) {
  const shared = { fill: color, stroke: MARKER_OUTLINE_COLOR, strokeWidth: 1.5 };

  if (shape === "circle") return <circle cx={x} cy={y} r={MARKER_RADIUS} {...shared} />;
  return <polygon points={severityGlyphPoints(shape, x, y, MARKER_RADIUS) ?? ""} {...shared} />;
}

/**
 * Kumu-style floating edge: connects wherever the straight line between the
 * two nodes' current centers crosses their circular boundaries, with a
 * gentle curve - rather than snapping to a fixed handle position on a
 * hierarchical layout. This is what lets many edges fan out naturally
 * instead of converging on the same point and overlapping.
 *
 * The line itself is a flat neutral wire; severity (how bad the effect
 * landed on the target node) is shown as a shape+color marker at the edge's
 * midpoint instead - see severityMarker.ts for why color alone isn't enough.
 */
export function FloatingEdge({ id, source, target, markerEnd, style, data }: EdgeProps<FloatingEdgeType>) {
  const sourceNode = useInternalNode(source);
  const targetNode = useInternalNode(target);
  const opacity = useEdgeHoverOpacity(source, target);

  if (!sourceNode || !targetNode) return null;

  const { sx, sy, tx, ty } = floatingEdgePoints(sourceNode, targetNode, NODE_RADIUS, NODE_RADIUS);
  const { path, mid } = curvedPath(sx, sy, tx, ty, id);
  const marker = data ? severityMarkerFor(data.severity) : null;

  return (
    <g opacity={opacity}>
      <BaseEdge id={id} path={path} markerEnd={markerEnd} style={{ ...style, stroke: EDGE_WIRE_COLOR }} />
      {marker && <SeverityMarkerGlyph shape={marker.shape} x={mid.x} y={mid.y} color={marker.color} />}
    </g>
  );
}
