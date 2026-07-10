// TODO: replace with the real functionality/indirect-impact data for
// HELSE_OMSORG_OG_SOSIALE_TJENESTER - placeholder values copied from the
// example table.
import { makePlaceholderCatalogEntry } from "@/lib/calc/catalog/makeCatalogEntry";

export const helseOmsorgOgSosialeTjenester = makePlaceholderCatalogEntry(
  "HELSE_OMSORG_OG_SOSIALE_TJENESTER",
  "Helse, omsorg og sosiale tjenester",
  "befolkning", // TODO: confirm this is the right subtype
);
