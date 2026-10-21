import { z } from "zod";
import { HISTORY_ACTIONS } from "@/lib/history/log";

const emptyToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;
const optional = <T extends z.ZodType>(schema: T) => z.preprocess(emptyToUndefined, schema.optional()).catch(undefined);

export const HISTORY_PAGE_SIZE = 25;

/** Filters from the URL. Invalid values fall back to "not set" instead of erroring. */
export const historyQuerySchema = z.object({
  q: optional(z.string().trim().max(100)),
  module: optional(z.string().trim().max(100)),
  action: optional(z.enum(HISTORY_ACTIONS)),
  from: optional(z.iso.date()),
  to: optional(z.iso.date()),
  page: z.coerce.number().int().min(1).catch(1),
});

export type HistoryQuery = z.output<typeof historyQuerySchema>;
