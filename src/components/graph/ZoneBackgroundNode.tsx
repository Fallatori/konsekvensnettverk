import type { Node, NodeProps } from "@xyflow/react";

export type ZoneKind = "hendelse" | "direkte" | "indirekte";

export type ZoneBackgroundData = {
  label: string;
  kind: ZoneKind;
  /** First/last lane get outer corner rounding (the whole row of lanes
   * reads as one contiguous shape); last also skips the divider border -
   * nothing to its right to divide from. */
  isFirst: boolean;
  isLast: boolean;
};

export type ZoneBackgroundNodeType = Node<ZoneBackgroundData, "zoneBackground">;

/**
 * A non-interactive "swim lane" backdrop behind the graph, dividing the
 * canvas into the scenario's three causal stages - hendelse (the root
 * event) -> direkte påvirkning (its direct effects) -> indirekte påvirkning
 * (effects only reachable once the indirect toggle synthesizes them).
 *
 * Same three-tier visual language in every theme - accent tint / neutral /
 * hatched "inferred" texture (see globals.css .zoneBackground rules) - each
 * theme only supplies its own colors for those tiers, same as every other
 * themed element.
 */
export function ZoneBackgroundNode({ data }: NodeProps<ZoneBackgroundNodeType>) {
  const classes = [
    "zoneBackground",
    `zoneBackground--${data.kind}`,
    data.isLast ? "" : "zoneBackgroundDivider",
    data.isFirst ? "zoneBackgroundFirst" : "",
    data.isLast ? "zoneBackgroundLast" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classes}>
      <span className="zoneBackgroundLabel">{data.label}</span>
    </div>
  );
}
