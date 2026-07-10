import { eiendom } from "@/lib/calc/catalog/eiendom";
import { finansielleTjenester } from "@/lib/calc/catalog/finansielleTjenester";
import { helseOmsorgOgSosialeTjenester } from "@/lib/calc/catalog/helseOmsorgOgSosialeTjenester";
import { kraftforsyning } from "@/lib/calc/catalog/kraftforsyning";
import { lovOgOrden } from "@/lib/calc/catalog/lovOgOrden";
import { oppvekstOgUtdanning } from "@/lib/calc/catalog/oppvekstOgUtdanning";
import { redningstjeneste } from "@/lib/calc/catalog/redningstjeneste";
import { styringOgKriseledelse } from "@/lib/calc/catalog/styringOgKriseledelse";
import { transport } from "@/lib/calc/catalog/transport";
import type { CatalogEntry } from "@/lib/calc/catalog/types";

export type { CatalogEntry, FunctionalityTable, IndirectImpactRow, TimeframeDays } from "@/lib/calc/catalog/types";
export { TIMEFRAME_DAYS } from "@/lib/calc/catalog/types";
export { FUNCTION_KEYS, type FunctionKey } from "@/lib/calc/catalog/functionKeys";

/** The fixed catalog of critical societal functions - this IS the "built-in
 * table of connection" from the original request: each entry carries its own
 * recovery curve and its own impact-on-every-other-function matrix. */
export const CONSEQUENCE_CATALOG: Record<string, CatalogEntry> = {
  [styringOgKriseledelse.functionKey]: styringOgKriseledelse,
  [lovOgOrden.functionKey]: lovOgOrden,
  [helseOmsorgOgSosialeTjenester.functionKey]: helseOmsorgOgSosialeTjenester,
  [redningstjeneste.functionKey]: redningstjeneste,
  [kraftforsyning.functionKey]: kraftforsyning,
  [transport.functionKey]: transport,
  [oppvekstOgUtdanning.functionKey]: oppvekstOgUtdanning,
  [eiendom.functionKey]: eiendom,
  [finansielleTjenester.functionKey]: finansielleTjenester,
};

export function getCatalogEntry(functionKey: string): CatalogEntry {
  const entry = CONSEQUENCE_CATALOG[functionKey];
  if (!entry) {
    // Fail loudly per the plan's verification requirement - never silently
    // fall back to a default table.
    throw new Error(`Unknown functionKey "${functionKey}" - no catalog entry registered for it.`);
  }
  return entry;
}
