import { fieldError, hint, input, label } from "@/components/ui/styles";
import { customFieldKey, type FieldDef } from "@/lib/custom-fields/rules";

/**
 * The inputs of the custom fields of a category (Pengaturan > Kolom kustom), named `cf:<id>`. Used by the add and edit
 * forms. `values` holds the text of each current value, keyed by field id; `errors` is keyed by form field name.
 */
export function CustomFieldInputs({
  fields,
  values = {},
  errors,
  onEdit,
}: {
  fields: readonly FieldDef[];
  values?: Readonly<Record<string, string>>;
  errors: Readonly<Record<string, string | undefined>>;
  onEdit?: (key: string) => void;
}) {
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      {fields.map((f) => {
        const key = customFieldKey(f.id);
        const id = `cf-${f.id}`;
        const common = {
          id,
          name: key,
          required: f.required,
          defaultValue: values[f.id] ?? "",
          "aria-invalid": errors[key] ? true : undefined,
          onChange: () => onEdit?.(key),
          className: `${input} mt-1.5`,
        } as const;
        const current = values[f.id] ?? "";
        return (
          <div key={f.id} className={f.type === "TEXT" ? "sm:col-span-2" : undefined}>
            <label htmlFor={id} className={label}>
              {f.label}
              {f.required ? "" : " (opsional)"}
            </label>
            {f.type === "SELECT" ? (
              <select {...common}>
                <option value="">{f.required ? "Pilih" : "Tidak diisi"}</option>
                {f.options.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
                {current !== "" && !f.options.includes(current) && <option value={current}>{current} (tidak lagi tersedia)</option>}
              </select>
            ) : f.type === "BOOLEAN" ? (
              <select {...common}>
                <option value="">{f.required ? "Pilih" : "Tidak diisi"}</option>
                <option value="ya">Ya</option>
                <option value="tidak">Tidak</option>
              </select>
            ) : f.type === "DATE" ? (
              <input {...common} type="date" />
            ) : f.type === "NUMBER" ? (
              <input {...common} inputMode="decimal" autoComplete="off" className={`${input} mt-1.5 tabular-nums`} />
            ) : (
              <input {...common} maxLength={500} autoComplete="off" />
            )}
            {f.type === "NUMBER" && <p className={hint}>Desimal dengan koma, tanpa titik ribuan.</p>}
            {errors[key] && (
              <p role="alert" className={fieldError}>
                {errors[key]}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
