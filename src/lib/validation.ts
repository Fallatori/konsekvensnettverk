import { z } from "zod";
import { CONSEQUENCE_LABELS, type ConsequenceLabel } from "@/lib/calc/mappings";

const consequenceLabelSchema = z.enum(CONSEQUENCE_LABELS as [ConsequenceLabel, ...ConsequenceLabel[]]);

export const timeframeDaysSchema = z.union([
  z.literal(1),
  z.literal(3),
  z.literal(7),
  z.literal(30),
  z.literal(90),
]);

export const recomputeRequestSchema = z.object({
  indirectEnabled: z.boolean(),
  timeframeDays: timeframeDaysSchema,
  overrides: z
    .object({
      nodeCategories: z.record(z.string(), consequenceLabelSchema).optional(),
      connectionLevels: z.record(z.string(), z.number().int().min(0).max(5)).optional(),
    })
    .optional(),
});

export type RecomputeRequestBody = z.infer<typeof recomputeRequestSchema>;
