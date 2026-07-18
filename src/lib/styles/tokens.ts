/**
 * Single source of truth for every non-CSS styling token used by the graph
 * (node shapes/sizes, connection colors/markers, severity/subtype colors).
 * Pure data/logic, no React - see context.tsx for the theme/edge-style
 * providers built on top of these, and globals.css for the CSS side (panel
 * chrome, card layout, per-[data-theme] custom properties).
 */
import { CONSEQUENCE_LABELS, type ConsequenceLabel, type NodeSubtype } from "@/lib/calc/mappings";

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
  graf: { shape: "circle", width: 96, height: 96, radius: 40, columnSpacing: 260, rowSpacing: 140 },
  lys: { shape: "rect", width: 200, height: 112, radius: 92, columnSpacing: 320, rowSpacing: 160 },
  terminal: { shape: "rect", width: 224, height: 88, radius: 98, columnSpacing: 340, rowSpacing: 140 },
};

// ---------------------------------------------------------------------------
// Connection (edge) style - independent of theme
// ---------------------------------------------------------------------------

/** The three connection (edge) rendering modes, selectable independently of
 * the visual theme (see context.tsx) - every theme supports all three, each
 * rendered with that theme's own wire texture/accent color (see
 * FloatingEdge.tsx). */
export type EdgeStyle = "standard" | "gradient" | "flow";

export const EDGE_STYLE_STORAGE_KEY = "konsekvensnettverk-edge-style";

export const EDGE_STYLE_OPTIONS: { value: EdgeStyle; label: string }[] = [
  { value: "standard", label: "Standard" },
  { value: "gradient", label: "Gradient" },
  { value: "flow", label: "Flyt" },
];

export function isEdgeStyle(value: string | null): value is EdgeStyle {
  return value === "standard" || value === "gradient" || value === "flow";
}

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
// Subtype colors (node fill, edge gradient endpoints)
// ---------------------------------------------------------------------------

/**
 * Node fill color by subtype - four hues (orange, blue, pink, teal-green)
 * chosen to read clearly against the app's dark purple-blue background, and
 * kept distinct from the severity gauge ring's green/yellow/orange/red so
 * the two visual dimensions (what kind of node vs. how severe it currently
 * is) don't blend into each other:
 * - "hazards" is a deep orange, not red, so it doesn't collide with the
 *   severity ring's red top tier on the same node.
 * - "funksjon" is teal (blue-green), distinct from the severity ring's
 *   grass-green low tier.
 *
 * Colors are Tailwind CSS's default palette at the 500-600 tier (a widely
 * used, modern reference scale) - saturated enough for good contrast on a
 * dark background, and dark enough for legible white text where a node
 * (hendelse) shows its label directly on the fill.
 */
export const SUBTYPE_FILL_COLORS: Record<NodeSubtype, string> = {
  hazards: "#ea580c", // orange-600
  stabilitet: "#3b82f6", // blue-500
  befolkning: "#ec4899", // pink-500
  funksjon: "#14b8a6", // teal-500
};

/** #rrggbb -> rgba() at the given alpha - used for the "lys" theme's pastel
 * subtype pill background (solid text color, tinted background). */
export function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// ---------------------------------------------------------------------------
// Severity marker (edge midpoint glyph: shape + color, redundant encoding)
// ---------------------------------------------------------------------------

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
 * gray-filled (see SEVERITY_COLORS above). */
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
