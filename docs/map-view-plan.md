# Map View — Feature Plan

Status: planning / not yet scoped for implementation. This captures the
2026-09-18/19 planning discussion on adding a geospatial map view alongside
the existing force-directed scenario graph.

## Use case

Google Maps satellite view, centered on the Oslo region. Each scenario node
is associated with GeoJSON/shapefile geometry placed on the map. The map
shows connections between nodes (mirroring the graph's edges). A scenario
can include hazard geometry (polygons/lines/points) representing the
physical extent of an event. Clicking a geo-feature shows its current data.
A storytelling layer walks through the scenario with narrative text tied to
map state (center/zoom/highlighted features). This is built up incrementally
— see **Suggested phasing** below for what ships in step 1 vs. later steps.

## Entry point

A new **nav bar button**, independent of the graph view — not attached to
any node, not something you click on a node card. It opens the map in a
**new page** (own route, e.g. `/scenarios/[id]/map` or a new tab), separate
from `ScenarioGraph.tsx` entirely. This keeps the map's render loop and
Google Maps' own lifecycle fully separate from React Flow's force
simulation (see Performance, below), and keeps the map a standalone view of
the current scenario rather than a mode of the graph.

## Current state (baseline, as of this plan)

- Next.js 16 + React 19 + Prisma 7 / Postgres app modeling Norwegian
  crisis-scenario cascades: a root "hendelse" (event) node cascading into
  "samfunnsfunksjon" (societal function) nodes, via direct + computed
  indirect edges (`prisma/schema.prisma`, `src/lib/calc/recompute.ts`).
- The only existing visualization is `ScenarioGraph.tsx` — a `@xyflow/react`
  + `d3-force` force-directed graph, recently reworked into three visual
  themes ("graf" / "lys" / "terminal") with neutral node coloring
  (`src/lib/styles/tokens.ts`).
- `Scenario.riskArea` is free-text, **not** a location — there is currently
  **no geospatial data, no coordinates, no PostGIS, no map library** anywhere
  in the codebase. This is a net-new subsystem, not a rework of the graph.
- Domain content (function catalog, scenario seed data, definitions,
  descriptions) is authored in one place, `src/data/domainData.json`, loaded
  via `src/lib/data/domainData.ts`, and seeded into Postgres by
  `prisma/seed.ts`. There is no in-app authoring UI for scenarios today.
- Access control is scenario-scoped via `Team`/`Membership`; any new geo data
  inherits this scoping automatically since it hangs off `Scenario`/`Node`.
- Rich text (`definition`, `description` fields) renders through a small
  Markdown subset in `src/components/RichText.tsx`; there's a separate fix
  history around keeping node-card text stable under Google Translate — any
  new text-bearing UI (popovers, storytelling panel) should reuse this path
  rather than inventing a new one.
- i18n lives in `src/lib/i18n`.

## Decision 1: map provider

| Option | Notes |
|---|---|
| **Google Maps JS API** (satellite) — as requested | Best imagery quality for Oslo. Requires a billed API key (`@googlemaps/js-api-loader` or `@vis.gl/react-google-maps`), domain-restricted key management via env var, and usage-cap awareness. Satellite imagery can't be recolored to match the app's "graf/lys/terminal" themes — it's photographic, not stylable SVG. |
| MapLibre GL + a satellite raster/vector source | No Google billing, full style control (fits the just-finished three-theme investment in the graph view), but high-res Oslo satellite tiles still typically need a paid tile provider (Mapbox satellite, Maxar, ESRI World Imagery). |

**Default recommendation:** Google Maps JS API, per the stated use case — but
the API-key/billing setup is a real decision, not a default to make
silently. Confirm before implementation.

## Decision 2: data model additions (Prisma)

- `Node.geometry Json?` — GeoJSON `Point`/`Polygon`/`LineString` per node. A
  samfunnsfunksjon might be a point (a facility) or a polygon (a service
  area).
- New `GeoFeature` model, scenario-scoped:
  ```
  GeoFeature {
    id            String
    scenarioId    String
    kind          HAZARD_POLYGON | HAZARD_LINE | HAZARD_POINT
    geometry      Json   // GeoJSON
    properties    Json   // shown on click
    relatedNodeId String?
  }
  ```
  Hazard footprints are modeled as their own entities rather than squeezed
  onto `Node`, since a scenario can have hazard geometry with no 1:1 node
  (e.g. a storm track line), and "current data on click" is per-feature, not
  per-node.
- Store geometry as raw `Json` (GeoJSON), **not PostGIS**, unless/until
  server-side spatial queries are actually needed (e.g. "which nodes fall
  inside this hazard polygon" for storytelling highlight logic). Adding the
  `postgis` extension + `Unsupported("geometry")` columns is a real but
  deferrable escalation — don't add it speculatively.
- `Scenario` keeps `riskArea` as free text; add an optional
  `mapCenter Json?` (lat/lng/zoom) so each scenario can override the Oslo
  default framing.

## Decision 3: authoring pipeline for geometry

Geometry sourcing tracks the phasing directly — it starts predefined and
graduates to external services as the map view earns its complexity:

1. **Step 1 — predefined, per functionality.** Geometry for a node's related
   geo-features is hand-authored per `functionKey`, seed-time only, matching
   the existing pattern (author in `domainData.json`, loaded via
   `src/lib/data/domainData.ts`). Zero new UI, zero external dependencies —
   the right amount of effort for validating the map view itself before
   investing in real data sourcing.
2. **Step 2/3 — external services.** Once the map view shows connections
   (step 2) and overlap computation (step 3), geometry should be able to
   come from real Norwegian geodata sources instead of hand-authored
   placeholders:
   - **Geonorge / Kartverket** APIs (national geodata/mapping authority) for
     base geographic layers and administrative/infrastructure geometry.
   - **DSB's "kunnskapsbank"**-type services for hazard-specific data (flood,
     landslide, storm-surge extents, etc.), where available via an API or
     downloadable dataset.
   - Either source likely arrives as GeoJSON already, or as shapefile
     exports needing conversion (`shpjs` client-side, or a server-side
     GDAL/`ogr2ogr` step) and reprojection to WGS84 (shapefiles are
     multi-file — `.shp`/`.dbf`/`.shx`/`.prj` — and typically carry a
     non-web projection).
   - This implies a fetch/cache/normalize layer (scheduled sync or
     on-demand fetch + `GeoFeature` upsert) rather than a one-time seed —
     external hazard data changes over time and shouldn't require a
     redeploy to refresh.
3. **In-app drawing tools** — explicitly out of scope unless a later need
   arises; not implied by steps 1–3 above.

**Open question for the user:** confirm Geonorge/Kartverket and DSB
kunnskapsbank are the intended external sources (vs. others), and whether
either requires an access agreement/API key before step 2 work starts.

## Rendering the graph on the map

Applies from step 1 onward, scoped per step (see **Suggested phasing**):

- Node markers at their `geometry` point (or polygon centroid) — step 1
  shows the geo-features tied to the current scenario's nodes (i.e. only
  node-associated geometry, no free-standing/unassociated hazard shapes
  yet), since entry is scenario-scoped via the nav bar, not a single
  node click.
- Hazard polygons/lines/points as `google.maps.Data` features (or
  `Polygon`/`Polyline`/`Marker` per kind), styled by `NodeSubtype`/severity
  color where applicable — reuse existing color tokens rather than
  hardcoding new map colors. A muted/desaturated ("gray") satellite style is
  the step-1 baseline look, both to keep hazard highlight colors legible
  against imagery and as a partial answer to the satellite-vs-theme mismatch
  raised under Theming below.
- Click on a geo-feature → reuse/adapt `EdgeDetailPopover`'s pattern for a
  feature-detail popover showing the text/current data tied to that node
  (the `definition`/`description`-style content already authored per
  function).
- **From step 2:** connections between nodes, drawn as geodesic polylines
  between node coordinates. Reuse the already-computed edge strength/opacity
  logic (`indirectEdgeOpacity`, `DIRECT_EDGE_WIDTH`/`INDIRECT_EDGE_WIDTH` in
  `src/lib/styles/tokens.ts`) for stroke width/opacity, so the map reads
  consistently with the existing graph view instead of inventing a second
  visual language.
- **From step 3:** overlap/intersection computation between hazard
  geometries and node geometries (see Suggested phasing for what this
  unlocks and what it costs).

## Storytelling layer

A distinct feature from the map itself: an ordered sequence of steps per
scenario (new model or JSON field), each with narrative text plus which
features/zoom/center are active for that step. Needs:

- An ordered list of steps (model or JSON field on `Scenario`).
- A UI panel driving `map.panTo`/`setZoom`/feature-highlight as the active
  step changes.
- Text rendered through the existing `RichText.tsx` Markdown subset, for
  authoring consistency with `definition`/`description` fields elsewhere.

## Cross-cutting considerations

- **Theming**: the three visual styles just unified for the graph view won't
  visually match a photographic Google satellite basemap. Decide whether
  the map view gets its own visual identity, or whether a stylable
  non-satellite basemap is needed for theme parity in "lys"/"terminal"
  modes.
- **i18n**: map popovers and storytelling text need the same
  translate-safe-text treatment as the recent node-card fix, not a fresh
  text-rendering path.
- **Performance**: React Flow's force simulation is CPU-side; Google Maps
  has its own render loop. Running both simultaneously (e.g. a split view)
  needs care to avoid jank.
- **Access control**: inherits existing `Team`/`Membership` scenario
  scoping automatically — no new authz model needed.
- **Testing**: Google Maps in headless Playwright is flaky (tile loading,
  API key in CI). Plan for a fake/stub map layer in tests from day one
  rather than retrofitting it later.

## Suggested phasing

### Step 1 — standalone map view, node-only geometry, predefined data

- Entry: a new nav bar button, unrelated to the graph, opens a **new page**
  with the map view for the current scenario (see Entry point above).
- Map: Google satellite (muted/gray style) centered on the Oslo region.
- Content: only geo-features connected to a node — highlighted
  polygon(s)/line(s)/dot(s) per node — no free-standing hazard geometry and
  no connections between nodes yet.
- Interaction: click a geo-feature → read the text/current data tied to
  that node.
- Data source: predefined per functionality, hand-authored in
  `domainData.json` per `functionKey` (Decision 3, step 1).
- Schema: `Node.geometry` / `GeoFeature` added, seeded, no import/authoring
  UI.
- This step validates the map UX and data model cheaply before any external
  data integration is attempted.

### Step 2 — connections on the map

- Adds geodesic polyline connections between nodes on the map, mirroring
  the graph's direct/indirect edges (styling reused from
  `src/lib/styles/tokens.ts`, per "Rendering the graph on the map" above).
- Data source: starts sourcing node/hazard geometry from external services
  (Geonorge/Kartverket, DSB kunnskapsbank) instead of only hand-authored
  placeholders, per Decision 3.

### Step 3 — overlap computation

- Adds computation of overlap/intersection between hazard geometry and node
  geometry (e.g. "which nodes' geometry falls inside this hazard polygon"),
  surfaced on the map (highlighting affected nodes) and potentially feeding
  back into the existing indirect-impact computation
  (`src/lib/calc/recompute.ts`).
- This is the point where plain JSON-geometry storage may stop being enough
  — real spatial queries (intersects, contains, buffer) are much cheaper and
  more correct with PostGIS than with hand-rolled JS geometry math, so this
  step is the natural trigger for revisiting the "no PostGIS" default in
  Decision 2.
- Data source: continues from step 2's external services; overlap
  computation quality depends on the precision of that external hazard
  geometry.
- The storytelling layer (see above) fits naturally on top of step 2/3, once
  there's more than one feature/connection on screen worth narrating through.

## Open questions before implementation starts

1. Google Maps (satellite, as requested) vs. MapLibre + a satellite tile
   source — confirm given the theming and billing tradeoffs above. A
   muted/gray satellite style is assumed for step 1 either way.
2. Confirm Geonorge/Kartverket and DSB kunnskapsbank as the intended step
   2/3 external data sources, and whether either needs an access
   agreement/API key lined up before that work starts.
3. Whether storytelling steps need to be authorable in-app or are
   seed/JSON-only, matching the current no-authoring-UI pattern (relevant
   once step 2/3 land).
4. Whether step 3's overlap computation should run client-side (e.g.
   Turf.js against JSON geometry) or server-side (PostGIS) — affects
   whether Decision 2's "no PostGIS" default holds through step 3.
