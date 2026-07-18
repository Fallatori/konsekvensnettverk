import { BaseEdge, useInternalNode, type Edge, type EdgeProps } from "@xyflow/react";
import { curvedPath, floatingEdgePoints, type NodeBoundary } from "@/components/graph/floatingEdgeGeometry";
import { useEdgeHoverOpacity } from "@/components/graph/graphHoverContext";
import { useCurrentEdgeStyle, useCurrentTheme } from "@/lib/styles/context";
import {
  severityGlyphPoints,
  severityMarkerFor,
  SUBTYPE_FILL_COLORS,
  THEME_NODE_LAYOUT,
  type SeverityMarkerShape,
} from "@/lib/styles/tokens";
import type { GaugeNodeType } from "@/components/graph/GaugeNode";
import type { ConsequenceLabel } from "@/lib/calc/mappings";

export type FloatingEdgeData = {
  kind: "DIRECT" | "INDIRECT";
  /** Severity of the effect this edge carries - the target node's
   * consequenceCategory (see lib/styles/tokens.ts). */
  severity: ConsequenceLabel;
};

export type FloatingEdgeType = Edge<FloatingEdgeData, "floating">;

// Flat "wire" stroke shared by every edge - severity is carried by the
// midpoint marker (shape + color), not by the line itself. Reads the
// --edge-wire custom property directly so the wire recolors on theme switch
// (see globals.css [data-theme] blocks). --edge-wire is a fully opaque color
// in every theme - EDGE_BASE_OPACITY below is what makes edges translucent,
// so it's the one thing controlling how strongly overlapping edges combine,
// regardless of connection style or color source (flat wire, gradient, or
// flow accent).
export const EDGE_WIRE_COLOR = "var(--edge-wire)";
// Every connection - any style, any theme - renders at this base opacity, so
// a single edge reads as soft/muted but two or more crossing at the same
// point visibly compound into a stronger color (plain SVG alpha stacking -
// no blend-mode trick needed). Multiplied with the per-edge strokeOpacity
// ScenarioGraph.tsx already sets for indirect edges (their own strength
// signal), not replaced by it.
const EDGE_BASE_OPACITY = 0.55;
// Thin outline so a marker reads clearly against edges/the dotted canvas -
// matches --surface-container-lowest in globals.css.
const MARKER_OUTLINE_COLOR = "var(--surface-container-lowest)";
const MARKER_RADIUS = 6;
// Animated "flow" connection style - marching-ants dash, sped up per its own
// keyframes in globals.css (.edgeFlow). The only dashed style now - "graf",
// "lys", and "terminal" all draw solid "standard"/"gradient" lines.
const FLOW_DASHARRAY = "6 6";

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
 * two nodes' current centers crosses their boundaries (circle or rect card,
 * per the active theme), with a gentle curve - rather than snapping to a
 * fixed handle position on a hierarchical layout. This is what lets many
 * edges fan out naturally instead of converging on the same point and
 * overlapping.
 *
 * Severity (how bad the effect landed on the target node) is always shown as
 * a shape+color marker at the edge's midpoint, regardless of connection
 * style - see severityMarker.ts for why color alone isn't enough. The line
 * itself has three independently selectable styles (see EdgeStyleContext),
 * all solid and all translucent (EDGE_BASE_OPACITY) so crossing edges
 * visibly compound into a stronger color where they overlap:
 * - "standard": each theme's own flat wire color.
 * - "gradient": a linear gradient from the source node's subtype color to
 *   the target's, along the edge's own path.
 * - "flow": an animated dashed line in the theme's accent color, reading as
 *   directional data/consequence flow rather than a static connection.
 */
export function FloatingEdge({ id, source, target, markerEnd, style, data }: EdgeProps<FloatingEdgeType>) {
  const sourceNode = useInternalNode<GaugeNodeType>(source);
  const targetNode = useInternalNode<GaugeNodeType>(target);
  const opacity = useEdgeHoverOpacity(source, target);
  const theme = useCurrentTheme();
  const connectionStyle = useCurrentEdgeStyle();

  if (!sourceNode || !targetNode) return null;

  const layout = THEME_NODE_LAYOUT[theme];
  const boundary: NodeBoundary =
    layout.shape === "circle"
      ? { shape: "circle", radius: layout.radius }
      : { shape: "rect", halfWidth: layout.width / 2, halfHeight: layout.height / 2 };

  const { sx, sy, tx, ty } = floatingEdgePoints(sourceNode, targetNode, boundary, boundary);
  const { path, mid } = curvedPath(sx, sy, tx, ty, id);
  const marker = data ? severityMarkerFor(data.severity) : null;

  const gradientId = `edge-gradient-${id}`;

  let stroke: string = EDGE_WIRE_COLOR;
  let strokeDasharray: string | undefined;
  let className: string | undefined;
  let filter: string | undefined;

  if (connectionStyle === "gradient") {
    stroke = `url(#${gradientId})`;
  } else if (connectionStyle === "flow") {
    stroke = "var(--accent)";
    strokeDasharray = FLOW_DASHARRAY;
    className = "edgeFlow";
    // "lys" is a flat SaaS-card look with no ambient glow elsewhere, so a
    // glow filter there would look out of place - "graf"/"terminal" already
    // lean on glow throughout.
    if (theme !== "lys") filter = "drop-shadow(0 0 4px var(--accent-glow))";
  }

  // Multiplied, not overwritten - indirect edges already carry their own
  // strokeOpacity (impact strength, see ScenarioGraph.tsx); direct edges
  // have none set, so `?? 1` leaves EDGE_BASE_OPACITY as the only factor.
  const strokeOpacity = EDGE_BASE_OPACITY * (typeof style?.strokeOpacity === "number" ? style.strokeOpacity : 1);

  const edgeStyle = { ...style, stroke, strokeDasharray, filter, strokeOpacity };

  return (
    <g opacity={opacity}>
      {connectionStyle === "gradient" && (
        <defs>
          <linearGradient id={gradientId} gradientUnits="userSpaceOnUse" x1={sx} y1={sy} x2={tx} y2={ty}>
            <stop offset="0%" stopColor={SUBTYPE_FILL_COLORS[sourceNode.data.subtype]} />
            <stop offset="100%" stopColor={SUBTYPE_FILL_COLORS[targetNode.data.subtype]} />
          </linearGradient>
        </defs>
      )}
      <BaseEdge id={id} path={path} markerEnd={markerEnd} style={edgeStyle} className={className} />
      {marker && <SeverityMarkerGlyph shape={marker.shape} x={mid.x} y={mid.y} color={marker.color} />}
    </g>
  );
}
