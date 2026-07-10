# Filling in real data and checking the maths

The app currently runs on placeholder data (see `TODO` comments
throughout `src/lib/calc/catalog/*.ts` and `prisma/seed.ts`). This guide is
the step-by-step process for replacing that placeholder data with your real
domain data, and verifying the maths at each step rather than all at once.

## Step 1 — Gather your real numbers per function

For each of the 9 catalog functions, you need two tables (see the example in
`requirments.md`):

1. **Functionality-recovery table**: for each of the 6 severity categories,
   what % functionality is restored at day 1/3/7/30/90.
2. **Indirect-impact row**: for each of the 6 severity categories *this
   function* could be at, what impact category it induces on every *other*
   function.

Have these on paper/spreadsheet before touching code — it's much easier to
type in once than to iterate in TypeScript.

## Step 2 — Fill in one catalog file, verify it alone

Start with just one function, e.g. `src/lib/calc/catalog/kraftforsyning.ts`.
Replace the placeholder call:

```ts
// current placeholder version
import { makePlaceholderCatalogEntry } from "@/lib/calc/catalog/makeCatalogEntry";
export const kraftforsyning = makePlaceholderCatalogEntry("KRAFTFORSYNING", "Kraftforsyning");
```

with the literal object, matching the `CatalogEntry` shape in
`src/lib/calc/catalog/types.ts`:

```ts
// real version
import type { CatalogEntry } from "@/lib/calc/catalog/types";

export const kraftforsyning: CatalogEntry = {
  functionKey: "KRAFTFORSYNING",
  label: "Kraftforsyning",
  functionalityTable: {
    ingen: { 1: 100, 3: 100, 7: 100, 30: 100, 90: 100 },
    "svært små": { 1: /* your real number */, 3: ..., 7: ..., 30: ..., 90: ... },
    små: { 1: ..., 3: ..., 7: ..., 30: ..., 90: ... },
    middels: { 1: ..., 3: ..., 7: ..., 30: ..., 90: ... },
    store: { 1: ..., 3: ..., 7: ..., 30: ..., 90: ... },
    "svært store": { 1: ..., 3: ..., 7: ..., 30: ..., 90: ... },
  },
  indirectImpactRow: {
    ingen: {},
    "svært små": { LOV_OG_ORDEN: "ingen", TRANSPORT: "små", /* ...every other functionKey */ },
    små: { /* ... */ },
    middels: { /* ... */ },
    store: { /* ... */ },
    "svært store": { /* ... */ },
  },
};
```

Once a file no longer uses `makePlaceholderCatalogEntry`, you can drop its
import.

Then check the maths for *that function alone*, without needing the whole
app running — add a quick throwaway test:

```ts
// scratch check, e.g. paste into src/lib/calc/__tests__/scratch.test.ts temporarily
import { describe, it, expect } from "vitest";
import { computeTimedConsequenceValue } from "@/lib/calc/formulas/timed";
import { kraftforsyning } from "@/lib/calc/catalog/kraftforsyning";

it("kraftforsyning: store at day 3", () => {
  const v = computeTimedConsequenceValue({
    consequenceValue: 80, // CONSEQUENCE_VALUE["store"]
    category: "store",
    functionalityTable: kraftforsyning.functionalityTable,
    timeframeDays: 3,
  });
  console.log(v); // compare against your own hand-calculation
});
```

Run just that:

```bash
npx vitest run src/lib/calc/__tests__/scratch.test.ts
```

Compare the printed value against what you'd compute by hand from your
table. Delete the scratch file once satisfied — this is just a calculator,
not a permanent test.

Repeat this step for each of the 9 functions, one at a time, so a mistake in
one table doesn't get lost among nine:

- `styringOgKriseledelse.ts`
- `lovOgOrden.ts`
- `helseOmsorgOgSosialeTjenester.ts`
- `redningstjeneste.ts`
- `kraftforsyning.ts`
- `transport.ts`
- `oppvekstOgUtdanning.ts`
- `eiendom.ts`
- `finansielleTjenester.ts`

### Adding a function beyond the current 9

- `src/lib/calc/catalog/functionKeys.ts` — add the new key to `FUNCTION_KEYS`
- `src/lib/calc/catalog/index.ts` — import the new file and add it to
  `CONSEQUENCE_CATALOG`

## Step 3 — Check the indirect-impact rows once all 9 are filled

The indirect math needs *multiple* functions active to be interesting (it's
about cross-function influence), so do this after all 9 functionality tables
are done. Same approach as Step 2 — a temporary scratch test using
`listIndirectContributions`/`maxIndirectContribution` from
`src/lib/calc/formulas/indirect.ts` directly against two real catalog
entries, checking a specific (source category → target) cell against your
table by hand.

## Step 4 — Update the permanent automated tests

Once you trust the real data, update `src/lib/calc/__tests__/timed.test.ts`
and `recompute.test.ts` — replace the placeholder-table assertions with a
couple of real-data cases (pick 2-3 representative ones, not all of them).
This is what locks correctness in for the future so a later edit can't
silently break your numbers. Run `npm run test` to confirm everything still
passes.

## Step 5 — Fill in `prisma/seed.ts` with real scenario content

Now that the catalog is real, edit `prisma/seed.ts`:

- `hendelse.description` — replace the `TODO` placeholder
- `directHits` array — which functions this scenario's event directly hits,
  real severity category, real connection level, real per-node description

## Step 6 — Re-seed and eyeball it in the browser

```bash
npm run db:seed   # idempotent, safe to re-run
npm run dev
```

Log in, open the scenario, and cross-check the gauge values against your own
expectation:

- Toggle indirect **off** first — direct nodes' values should exactly match
  `CONSEQUENCE_VALUE[category]` at day 1 (no decay yet).
- Move the timeframe slider — watch values decay per your functionality
  table.
- Toggle indirect **on** — watch for the new indirectly-affected nodes and
  check the Comparison panel's numbers against your own hand-calculation for
  at least one node.

## Step 7 — Full regression check

```bash
npm run typecheck
npm run test
npm run test:e2e   # needs the dev server + seeded DB, per playwright.config.ts's webServer
```

If something looks off in the browser, Step 2/3's scratch-test approach is
the fastest way to isolate whether it's a data-entry typo or a genuine
formula question.
