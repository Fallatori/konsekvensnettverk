// TODO: replace with the real functionality/indirect-impact data for
// OPPVEKST_OG_UTDANNING - placeholder values copied from the example table.
import { makePlaceholderCatalogEntry } from "@/lib/calc/catalog/makeCatalogEntry";

export const oppvekstOgUtdanning = makePlaceholderCatalogEntry(
  "OPPVEKST_OG_UTDANNING",
  "Oppvekst og utdanning",
  "befolkning", // TODO: confirm this is the right subtype
);
