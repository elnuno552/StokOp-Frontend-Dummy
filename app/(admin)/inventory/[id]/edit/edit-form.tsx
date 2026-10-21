"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { CustomFieldInputs } from "@/components/inventory/custom-field-inputs";
import type { FieldDef } from "@/lib/custom-fields/rules";
import { MoneyInput } from "@/components/ui/money-input";
import { SubmitButton } from "@/components/ui/submit-button";
import { buttonSecondary, fieldError, input, label, panel } from "@/components/ui/styles";
import type { ItemType } from "@/lib/generated/prisma/enums";
import { ITEM_CONDITION_LABELS } from "@/lib/inventory/labels";
import type { UpdateItemField } from "@/validations/item-update";
import { updateItemAction, type EditItemState } from "../edit-actions";

type Defaults = Record<string, string>;

export function EditForm({
  itemId,
  type,
  categories,
  defaults,
  customFields,
  customValues,
}: {
  itemId: string;
  type: ItemType;
  categories: { id: string; name: string }[];
  defaults: Defaults;
  /** Active custom fields per category id, and this item's current values as form text keyed by field id. */
  customFields: Record<string, FieldDef[]>;
  customValues: Record<string, string>;
}) {
  const [state, action] = useActionState<EditItemState, FormData>(updateItemAction.bind(null, itemId), {});
  const [categoryId, setCategoryId] = useState(defaults.categoryId);
  const errors = state.fieldErrors ?? {};

  function field(name: UpdateItemField, text: string, opts: { required?: boolean; type?: string; inputMode?: "decimal"; list?: string; rows?: number; money?: boolean } = {}) {
    const common = {
      id: name,
      name,
      defaultValue: defaults[name] ?? "",
      required: opts.required,
      "aria-invalid": errors[name] ? true : undefined,
      className: `${input} mt-1`,
    } as const;
    return (
      <div>
        <label htmlFor={name} className={label}>
          {text}
          {opts.required ? "" : " (opsional)"}
        </label>
        {opts.rows ? (
          <textarea {...common} rows={opts.rows} className={`${input} mt-1 py-2`} />
        ) : opts.money ? (
          <MoneyInput {...common} className="mt-1" />
        ) : (
          <input {...common} type={opts.type ?? "text"} inputMode={opts.inputMode} list={opts.list} />
        )}
        {errors[name] && (
          <p role="alert" className={fieldError}>
            {errors[name]}
          </p>
        )}
      </div>
    );
  }

  return (
    <form action={action} key={state.attempt ?? "initial"} className={`${panel} flex flex-col gap-4 p-5`}>
      {state.error && (
        <p role="alert" className="rounded-md border border-danger-border bg-danger-soft px-3 py-2 text-sm font-medium text-danger">
          {state.error}
        </p>
      )}
      {field("name", "Nama barang", { required: true })}
      <div>
        <label htmlFor="categoryId" className={label}>
          Kategori (opsional)
        </label>
        <select id="categoryId" name="categoryId" defaultValue={defaults.categoryId} onChange={(e) => setCategoryId(e.target.value)} className={`${input} mt-1`}>
          <option value="">Tanpa kategori</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        {errors.categoryId && (
          <p role="alert" className={fieldError}>
            {errors.categoryId}
          </p>
        )}
      </div>
      {(customFields[categoryId] ?? []).length > 0 && (
        <fieldset key={`cf-${categoryId}`} className="flex flex-col gap-3 rounded-md border border-border p-4">
          <legend className="px-1 text-sm font-semibold text-fg">Data tambahan kategori</legend>
          <CustomFieldInputs fields={customFields[categoryId]} values={customValues} errors={errors as Record<string, string | undefined>} />
        </fieldset>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        {field("brand", "Merek")}
        {field("model", "Model")}
      </div>

      {type === "BMN" ? (
        <>
          {field("serialNumber", "Nomor seri")}
          <div>
            <label htmlFor="condition" className={label}>
              Kondisi
            </label>
            <select id="condition" name="condition" defaultValue={defaults.condition} className={`${input} mt-1`}>
              {defaults.condition === "" && <option value="">Hilang (tidak dapat diubah)</option>}
              <option value="GOOD">{ITEM_CONDITION_LABELS.GOOD}</option>
              <option value="MINOR_DAMAGE">{ITEM_CONDITION_LABELS.MINOR_DAMAGE}</option>
              <option value="MAJOR_DAMAGE">{ITEM_CONDITION_LABELS.MAJOR_DAMAGE}</option>
            </select>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {field("acquisitionDate", "Tanggal perolehan", { type: "date" })}
            {field("acquisitionPrice", "Harga perolehan (Rp)", { money: true })}
          </div>
          {field("fundingSource", "Sumber dana", { list: "funding-options" })}
          <datalist id="funding-options">
            {["APBN", "APBD", "PNBP", "Hibah"].map((v) => (
              <option key={v} value={v} />
            ))}
          </datalist>

          <fieldset className="flex flex-col gap-4 rounded-md border border-border p-4">
            <legend className="px-1 text-sm font-semibold text-fg">Data register BMN (SIMAN)</legend>
            <div className="grid gap-4 sm:grid-cols-3">
              {field("kodeSatker", "Kode Satker")}
              {field("kodeBarang", "Kode Barang")}
              {field("nup", "NUP", { inputMode: "decimal" })}
            </div>
            {field("kodeRegister", "Kode Register")}
            <div className="grid gap-4 sm:grid-cols-2">
              {field("umurAset", "Umur aset (tahun)", { inputMode: "decimal" })}
              {field("tanggalBukuPertama", "Tanggal buku pertama", { type: "date" })}
              {field("nilaiPerolehanPertama", "Nilai perolehan pertama (Rp)", { money: true })}
              {field("nilaiMutasi", "Nilai mutasi (Rp)", { money: true })}
              {field("nilaiPenyusutan", "Nilai penyusutan (Rp)", { money: true })}
              {field("nilaiBuku", "Nilai buku (Rp)", { money: true })}
            </div>
            {field("statusPenggunaan", "Status penggunaan")}
            <div className="grid gap-4 sm:grid-cols-2">
              {field("noPsp", "No. PSP")}
              {field("tanggalPsp", "Tanggal PSP", { type: "date" })}
            </div>
          </fieldset>
        </>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {field("unit", "Satuan", { required: true, list: "unit-options" })}
          {field("minimumStock", "Stok minimum", { inputMode: "decimal" })}
          <datalist id="unit-options">
            {["buah", "pcs", "rim", "kotak", "pak", "lusin", "botol", "roll", "set"].map((v) => (
              <option key={v} value={v} />
            ))}
          </datalist>
        </div>
      )}

      {field("description", "Keterangan", { rows: 3 })}

      <div className="flex flex-wrap gap-2">
        <SubmitButton pendingLabel="Menyimpan…">Simpan perubahan</SubmitButton>
        <Link href={`/inventory/${itemId}`} className={buttonSecondary}>
          Batal
        </Link>
      </div>
    </form>
  );
}
