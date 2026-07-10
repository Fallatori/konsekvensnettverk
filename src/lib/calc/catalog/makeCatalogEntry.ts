import { FUNCTION_KEYS, type FunctionKey } from "@/lib/calc/catalog/functionKeys";
import {
  PLACEHOLDER_FUNCTIONALITY_TABLE,
  placeholderIndirectImpactRow,
} from "@/lib/calc/catalog/placeholderData";
import type { CatalogEntry } from "@/lib/calc/catalog/types";
import type { NodeSubtype } from "@/lib/calc/mappings";

/** TODO: once you have real data, stop calling this and inline the real
 * functionalityTable/indirectImpactRow directly in each function's file. */
export function makePlaceholderCatalogEntry(
  functionKey: FunctionKey,
  label: string,
  subtype: NodeSubtype,
): CatalogEntry {
  const otherKeys = FUNCTION_KEYS.filter((key) => key !== functionKey);
  return {
    functionKey,
    label,
    subtype,
    functionalityTable: PLACEHOLDER_FUNCTIONALITY_TABLE,
    indirectImpactRow: placeholderIndirectImpactRow(otherKeys),
  };
}
