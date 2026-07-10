/**
 * The fixed catalog of critical societal functions ("kritiske
 * samfunnsfunksjoner"). This is a representative subset of the real
 * ~18-function catalog - TODO: add the remaining real functions the same
 * way (one file per function key).
 */
export const FUNCTION_KEYS = [
  "STYRING_OG_KRISELEDELSE",
  "LOV_OG_ORDEN",
  "HELSE_OMSORG_OG_SOSIALE_TJENESTER",
  "REDNINGSTJENESTE",
  "KRAFTFORSYNING",
  "TRANSPORT",
  "OPPVEKST_OG_UTDANNING",
  "EIENDOM",
  "FINANSIELLE_TJENESTER",
] as const;

export type FunctionKey = (typeof FUNCTION_KEYS)[number];
