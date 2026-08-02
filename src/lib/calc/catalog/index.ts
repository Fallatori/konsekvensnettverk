export type {
  CatalogEntry,
  CatalogEntryType,
  CatalogSubtypeLabel,
  FunctionalityTable,
  IndirectImpactRow,
  TimeframeDays,
} from "@/lib/calc/catalog/types";
export { TIMEFRAME_DAYS } from "@/lib/calc/catalog/types";

/** The catalog itself is data-driven - see src/lib/data/domainData.ts, the
 * single input point that reads src/data/domainData.json. Re-exported here
 * so callers keep importing from "@/lib/calc/catalog" as before. */
export { CONSEQUENCE_CATALOG, FUNCTION_KEYS, getCatalogEntry } from "@/lib/data/domainData";

/** Kept as a plain string (not a literal union) since function keys are now
 * authored in JSON rather than as a fixed compile-time list. */
export type FunctionKey = string;
