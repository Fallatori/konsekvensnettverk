/**
 * Single source of truth for every non-CSS styling token used by the graph
 * (node shapes/sizes, connection colors/markers, severity/subtype colors).
 * Pure data/logic, no React - see context.tsx for the theme/edge-style
 * providers built on top of these, and globals.css for the CSS side (panel
 * chrome, card layout, per-[data-theme] custom properties).
 */
import { CONSEQUENCE_LABELS, type ConsequenceLabel } from "@/lib/calc/mappings";

// ---------------------------------------------------------------------------
// Theme (visual style: "graf" circular dial, "lys" card, "terminal" HUD card)
// ---------------------------------------------------------------------------

/** The three selectable visual styles (see the [data-theme] blocks in
 * globals.css). This isn't just a color re-skin - "lys" and "terminal" swap
 * the graph node from a circular gauge dial to a rectangular card, so the
 * force layout and floating-edge geometry need to know each theme's node
 * shape/size too (see THEME_NODE_LAYOUT below). */
export type Theme = "graf" | "lys" | "terminal";

export const THEME_STORAGE_KEY = "konsekvensnettverk-theme";

export const THEME_OPTIONS: { value: Theme; label: string }[] = [
  { value: "graf", label: "Graf" },
  { value: "lys", label: "Lys" },
  { value: "terminal", label: "Terminal" },
];

export function isTheme(value: string | null): value is Theme {
  return value === "graf" || value === "lys" || value === "terminal";
}

export type NodeLayoutSpec = {
  shape: "circle" | "rect";
  width: number;
  height: number;
  /** Circle themes: the gauge ring's exact radius, used for both collision
   * spacing and the floating-edge circle intersection. Rect themes: a rough
   * collision radius only (edge geometry uses width/height directly - see
   * floatingEdgeGeometry.ts). */
  radius: number;
  columnSpacing: number;
  rowSpacing: number;
};

/** "graf" keeps the app's original circular dial sizing untouched. "lys" and
 * "terminal" are wide cards, so they get more breathing room between
 * columns/rows or neighboring cards would overlap. */
export const THEME_NODE_LAYOUT: Record<Theme, NodeLayoutSpec> = {
  graf: { shape: "circle", width: 128, height: 128, radius: 54, columnSpacing: 300, rowSpacing: 170 },
  lys: { shape: "rect", width: 200, height: 112, radius: 92, columnSpacing: 320, rowSpacing: 160 },
  terminal: { shape: "rect", width: 224, height: 88, radius: 98, columnSpacing: 340, rowSpacing: 140 },
};

// ---------------------------------------------------------------------------
// Connection (edge) style - independent of theme
// ---------------------------------------------------------------------------

/** A single connection style, the same in every theme: flat gray lines (see
 * --edge-wire in globals.css, identical across [data-theme] blocks), with
 * width as the only signal - not severity, just which hop the edge is:
 * scenario -> direct impact renders at the thickest width previously used
 * (formerly the "svært store" severity tier), direct -> indirect impact at
 * the thinnest (formerly the fixed indirect width). See FloatingEdge.tsx and
 * ScenarioGraph.tsx. */
export const DIRECT_EDGE_WIDTH = 6;
export const INDIRECT_EDGE_WIDTH = 2;

// ---------------------------------------------------------------------------
// Severity colors (gauge fill, edge marker) - keyed by ConsequenceLabel
// ---------------------------------------------------------------------------

/**
 * The shared 5-class green -> light green -> yellow -> orange -> red palette
 * - single source of truth for every gauge rendering (in-graph node dial,
 * detail-panel gauge, comparison panel per-node list). "ingen" renders
 * unfilled/hidden (see GaugeIndicator), so its color is effectively unused.
 *
 * A popular modern reference palette (Tailwind CSS's default color scale, at
 * the 400-500 tier) rather than hand-picked tones - vivid and saturated
 * enough to read clearly against the app's dark purple-blue background.
 */
export const SEVERITY_COLORS: Record<ConsequenceLabel, string> = {
  ingen: "#6b7280", // neutral gray (unused - "ingen" segments are hidden, not gray-filled)
  "svært små": "#4ade80", // green-400
  små: "#a3e635", // lime-400 (light green)
  middels: "#facc15", // yellow-400
  store: "#f97316", // orange-500
  "svært store": "#ef4444", // red-500
};

/** How many of the 5 colored gauge segments should be filled for a category
 * ("ingen" = 0, "svært store" = 5). */
export function filledSegmentCount(category: ConsequenceLabel): number {
  return CONSEQUENCE_LABELS.indexOf(category);
}

/** SEVERITY_COLORS in fixed ring-segment order (position 1 is always green,
 * position 5 is always red, etc.) - the "graf" theme's segmented gauge
 * (GaugeIndicator) always draws all 5 segments in this order, filling only
 * as many as the category calls for and leaving the rest as unfilled
 * outlines, rather than filling N segments in a single color. */
export const SEGMENT_COLORS: string[] = CONSEQUENCE_LABELS.filter((label) => label !== "ingen").map(
  (label) => SEVERITY_COLORS[label],
);

// ---------------------------------------------------------------------------
// Neutral node fill (graf theme's gauge/root circle fill)
// ---------------------------------------------------------------------------

/**
 * Node "kind" (subtype/subclass) is deliberately NOT color-coded anymore -
 * only two things carry color meaning in the graph: severity (the gauge ring,
 * SEVERITY_COLORS/SEGMENT_COLORS) and the wire-frame edges (always the flat
 * gray EDGE_WIRE_COLOR). These two tokens are just the neutral surface fill
 * behind the "graf" theme's circle (its only consumer - "lys"/"terminal"
 * render subtype as plain neutral text/borders directly in globals.css,
 * without going through fillColor at all):
 * - NODE_FILL_IMPACT: direct/indirect impact node's gauge fill - the darker
 *   of the two, so the severity ring segments read clearly against it.
 * - NODE_FILL_SCENARIO: hendelse (root) node fill - a lighter neutral, so the
 *   root node has some contrast against ordinary impact nodes without
 *   introducing another categorical (subtype) color.
 */
export const NODE_FILL_IMPACT = "var(--control-track)";
export const NODE_FILL_SCENARIO = "var(--surface-bright)";
