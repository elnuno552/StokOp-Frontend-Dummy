import { z } from "zod";
import { FIELD_TYPES, parseOptions } from "@/lib/custom-fields/rules";

const checkbox = z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean());

export const customFieldSchema = z
  .object({
    categoryId: z.uuid("Kategori tidak valid."),
    label: z.string({ error: "Isi nama kolom." }).trim().min(1, "Isi nama kolom.").max(100, "Nama kolom maksimal 100 karakter."),
    type: z.enum(FIELD_TYPES, { error: "Pilih jenis kolom." }),
    optionsText: z.string().default(""),
    required: checkbox,
    showInList: checkbox,
    filterable: checkbox,
  })
  .transform((value, ctx) => {
    let options: string[] = [];
    if (value.type === "SELECT") {
      const parsed = parseOptions(value.optionsText);
      if (!parsed.ok) ctx.addIssue({ code: "custom", path: ["optionsText"], message: parsed.error });
      else if (parsed.options.length === 0) ctx.addIssue({ code: "custom", path: ["optionsText"], message: "Isi minimal satu pilihan, satu per baris." });
      else options = parsed.options;
    }
    const { optionsText, ...rest } = value;
    void optionsText;
    return { ...rest, options };
  });

export type CustomFieldInput = z.output<typeof customFieldSchema>;
