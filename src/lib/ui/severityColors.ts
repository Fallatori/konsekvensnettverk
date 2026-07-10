import { CONSEQUENCE_LABELS, type ConsequenceLabel } from "@/lib/calc/mappings";

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
