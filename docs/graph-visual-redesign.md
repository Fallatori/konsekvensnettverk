# Graph visual redesign — severity-coded edges ("Layered flow" design)

## Why

Right now an edge's color is a gradient from its source node's **subtype**
color to its target node's subtype color (`FloatingEdge.tsx`, driven by
`SUBTYPE_FILL_COLORS`). Subtype is identity ("what kind of node"), not
severity ("how bad is it") — so the graph carries three independent color
signals at once (node fill = subtype, node ring = severity, edge = subtype
gradient) plus width/opacity for strength. On a scenario with a lot of edges
this reads as noisy, and the edge color in particular tells you nothing
about how serious the effect is.

The fix demoed and approved: **one severity color language, reused
everywhere it appears**, and edges get a neutral/muted line so color isn't
doing double duty. Concretely:

- Edge color stops being source→target subtype and starts being **the
  severity of the effect that edge carries** — reusing the exact
  `SEVERITY_COLORS` scale already used for the node gauge ring
  (`src/lib/ui/severityColors.ts`). No new palette to invent or validate.
- The edge line itself becomes a single muted "wire" color. Severity is
  shown instead as a small **shape marker at the edge's midpoint** —
  color and shape are redundant encodings of the same value, which is also
  the accessibility mitigation (a status color should never be the only
  channel carrying meaning).
- Line **width/opacity keep meaning what they already mean** (connection
  strength / indirect-impact points) — that channel is not part of this
  change.
- Node fill (subtype), node gauge ring (severity), and the column/force
  layout in `ScenarioGraph.tsx` are **not changed** — they already separate
  identity from severity correctly; the edge was the one place that
  conflated the two.

This is scoped intentionally narrow: fix the one channel that's actually
confusing, don't re-architect the rest of the graph.

## What "severity" means for an edge

Neither `ComputedEdge` (DIRECT or INDIRECT) carries a severity field today —
only `connectionLevel` (strength/points). But the edge's **target** node
always has one: `ComputedNode.consequenceCategory` (`ConsequenceLabel`,
`null` only for the hendelse root). Define:

```
edgeSeverity(edge) = nodesById.get(edge.childId)?.consequenceCategory ?? "ingen"
```

i.e. an edge is colored/marked by **how severely its effect landed on the
node it points to** — the same category already driving that node's own
gauge ring, so hovering along an edge to its target is visually consistent
with the ring you land on.

## Implementation steps

### 1. Severity → marker shape

New file `src/lib/ui/severityMarker.ts`. Map each non-"ingen"
`ConsequenceLabel` to a distinct shape, ordered so shape "weight" increases
with severity (redundant with color, not replacing it):

| Category | Shape | Color source |
|---|---|---|
| `svært små` | circle | `SEVERITY_COLORS["svært små"]` |
| `små` | triangle | `SEVERITY_COLORS["små"]` |
| `middels` | diamond | `SEVERITY_COLORS["middels"]` |
| `store` | square | `SEVERITY_COLORS["store"]` |
| `svært store` | star (or a filled double-ring if a 5-point star is awkward in SVG) | `SEVERITY_COLORS["svært store"]` |
| `ingen` | *(no marker rendered at all — matches how "ingen" gauge segments are already hidden, not gray-filled, in `GaugeIndicator.tsx`)* | — |

Export something like:

```ts
export type SeverityMarker = { shape: "circle" | "triangle" | "diamond" | "square" | "star"; color: string } | null;
export function severityMarkerFor(category: ConsequenceLabel): SeverityMarker { ... }
```

### 2. Expose the edge's midpoint

`floatingEdgeGeometry.ts`'s `curvedPath()` already computes `controlX`/
`controlY` internally but only returns the path string. Change it to also
return the on-curve midpoint (quadratic Bézier at t=0.5:
`0.25*P0 + 0.5*C + 0.25*P2`), e.g.:

```ts
export function curvedPath(sx, sy, tx, ty, edgeId): { path: string; mid: { x: number; y: number } } {
  // ...existing control point math...
  const mid = {
    x: 0.25 * sx + 0.5 * controlX + 0.25 * tx,
    y: 0.25 * sy + 0.5 * controlY + 0.25 * ty,
  };
  return { path: `M ${sx},${sy} Q ${controlX},${controlY} ${tx},${ty}`, mid };
}
```

Update the one call site in `FloatingEdge.tsx` accordingly.

### 3. `FloatingEdge.tsx`: neutral wire + severity marker

- Drop the `linearGradient` (source/target subtype) entirely. Replace with
  a flat, muted stroke — introduce e.g. `--edge-wire: rgba(231, 236, 247, 0.28)`
  in `globals.css` (derived from the existing `--foreground` at low opacity,
  consistent with the app's other dark-surface tokens) and use it as the
  base stroke color for every edge.
- After drawing the `<BaseEdge>`, if `severityMarkerFor(data.severity)` is
  non-null, render the shape at `mid` (circle/polygon/rect per shape,
  ~10–12px, filled with the marker color, with a thin dark stroke — reuse
  `--surface` or `--background` — so it reads clearly against edges and
  the dotted canvas background).
- `FloatingEdgeData` gains `severity: ConsequenceLabel` and drops
  `sourceColor`/`targetColor` (no longer used once the gradient is gone).

### 4. `ScenarioGraph.tsx`: wire severity into edge data

Next to the existing `colorFor` map (subtype color by node id), add:

```ts
const nodesById = new Map(nodes.map((n) => [n.id, n]));
const severityFor = (nodeId: string): ConsequenceLabel =>
  nodesById.get(nodeId)?.consequenceCategory ?? "ingen";
```

and set `data: { kind: edge.kind, severity: severityFor(edge.childId) }` on
each `FloatingEdgeType`. Leave the DIRECT/INDIRECT width and opacity
formulas (`1 + edge.connectionLevel`, `indirectEdgeOpacity(...)`) exactly as
they are — that's the strength channel, untouched by this change.

### 5. Add a severity legend

New file `src/components/graph/SeverityLegend.tsx` — a small fixed panel
(reuse the existing `.panel`/glass styling from `globals.css`:
`--glass-bg`, `--panel-border`, `backdrop-filter: blur(12px)`) listing the
5 non-"ingen" categories, each as *shape + color swatch + Norwegian label*
("Svært små" … "Svært store"), same order as `CONSEQUENCE_LABELS`. Render it
absolutely positioned (e.g. bottom-left) inside `.graphArea`, from
`ScenarioGraph.tsx` or `ScenarioApp.tsx`.

Icon + label pairing here is not optional — it's what makes the sub-3:1
tiers (if any, check against `--background`) legible without relying on
color alone, matching how the gauge ring is already labeled by the node's
text label.

### 6. Hover-to-isolate

Dense scenarios (many indirect edges) still benefit from being able to
temporarily declutter without hiding real data. Add local state in
`ScenarioGraph.tsx`:

```ts
const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
```

Pass `onNodeMouseEnter={(_, node) => setHoveredNodeId(node.id)}` and
`onNodeMouseLeave={() => setHoveredNodeId(null)}` to `<ReactFlow>`. In the
`useMemo` that builds `rfNodes`/`rfEdges`, add `hoveredNodeId` as a
dependency and compute per-element opacity: full opacity for the hovered
node and anything it connects to, ~0.25–0.3 for unrelated nodes, ~0.05 for
unrelated edges, unchanged when nothing is hovered. This mirrors the
approved demo's interaction and needs no new UI — it activates on the
existing pointer-hover a user already does while exploring the graph.

## Explicitly out of scope (don't touch)

- `GaugeIndicator.tsx` / `GaugeNode.tsx` / `src/lib/ui/severityColors.ts` —
  the node gauge ring already does severity correctly.
- `src/lib/ui/subtypeColors.ts` and the node fill — subtype is identity,
  not severity; keep it a separate channel.
- The column + `d3-force` layout in `ScenarioGraph.tsx`
  (`computeAnchors`/`layoutWithForce`) — it already implements the
  "layered flow" (hazard → samfunnsfunksjon columns by subtype → indirect)
  that the approved design keeps. No layout changes needed.
- DIRECT edge width formula and INDIRECT opacity formula — that's the
  strength channel, already correct, not part of this change.

## Verification checklist

1. `npm run typecheck` — `FloatingEdgeData` and `curvedPath`'s new return
   shape are typed changes; make sure every call site is updated.
2. `npm run dev`, open a scenario:
   - Every edge's marker color matches the gauge-ring color of the node it
     points *into*.
   - Edges with a target at `ingen` render with no marker (not a gray one).
   - Toggling indirect on/off still visibly distinguishes DIRECT vs
     INDIRECT via width/opacity, unchanged from today.
   - The legend is visible and its 5 swatches match the gauge palette
     exactly (same hex values, same order).
   - Hovering a node dims unrelated edges/nodes and un-dims on mouse leave.
3. `npm run test` — if any Vitest snapshot/unit test touches
   `FloatingEdgeData`, `curvedPath`'s return type, or `SUBTYPE_FILL_COLORS`
   usage in edge construction, update it.
4. `npm run test:e2e` — a grep of `e2e/scenario.spec.ts` for
   `gradient|color|severity|subtype` currently turns up nothing, so this
   change shouldn't need e2e updates; re-check if that test later grows
   style assertions.
