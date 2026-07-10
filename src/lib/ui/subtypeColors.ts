import type { NodeSubtype } from "@/lib/calc/mappings";

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
