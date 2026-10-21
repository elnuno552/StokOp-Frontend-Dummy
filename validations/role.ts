import { z } from "zod";
import { CAPABILITIES } from "@/lib/permissions";

export const roleInputSchema = z.object({
  label: z.string({ error: "Isi nama peran." }).trim().min(2, "Nama peran minimal 2 karakter.").max(60, "Nama peran maksimal 60 karakter."),
  // Unknown values are dropped on the server; here we only require an array of strings.
  capabilities: z.array(z.string()).default([]),
});
export type RoleInput = z.output<typeof roleInputSchema>;

export const createRoleSchema = roleInputSchema.extend({
  copyFrom: z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? undefined : v), z.string().max(50).optional()),
});
export type CreateRoleInput = z.output<typeof createRoleSchema>;

export { CAPABILITIES };
