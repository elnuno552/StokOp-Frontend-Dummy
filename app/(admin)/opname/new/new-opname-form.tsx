"use client";

import { useActionState, useState } from "react";
import { SubmitButton } from "@/components/ui/submit-button";
import { fieldError, hint, input, label, panel } from "@/components/ui/styles";
import { createOpnameAction, type OpnameFormState } from "../actions";

type Mode = "STANDARD" | "LOCATION_SURVEY";

export function NewOpnameForm({
  locations,
  types,
  categories,
  canSurvey,
  unplaced,
}: {
  locations: { id: string; name: string }[];
  types: ("BMN" | "ATK")[];
  /** BMN categories, for narrowing a location survey. */
  categories: { id: string; name: string }[];
  /** The user may count BMN, so the location survey is offered. */
  canSurvey: boolean;
  /** BMN assets that have no location yet. */
  unplaced: number;
}) {
  const [state, action] = useActionState<OpnameFormState, FormData>(createOpnameAction, {});
  const [mode, setMode] = useState<Mode>("STANDARD");
  const errors = state.fieldErrors ?? {};
  const survey = mode === "LOCATION_SURVEY";

  return (
    <form action={action} key={state.attempt} className={`${panel} flex flex-col gap-4 p-5`}>
      {state.error && (
        <p role="alert" className="rounded-md border border-danger-border bg-danger-soft px-3 py-2 text-sm font-medium text-danger">
          {state.error}
        </p>
      )}

      {canSurvey && (
        <fieldset>
          <legend className={label}>Jenis pemeriksaan</legend>
          <div className="mt-2 flex flex-col gap-2">
            <label className="flex items-start gap-2.5 text-sm text-fg">
              <input type="radio" name="mode" value="STANDARD" checked={!survey} onChange={() => setMode("STANDARD")} className="mt-0.5 size-4 accent-accent" />
              <span>
                Stock opname biasa
                <span className="block text-muted">Mencocokkan jumlah ATK atau lokasi dan kondisi BMN yang sudah tercatat.</span>
              </span>
            </label>
            <label className="flex items-start gap-2.5 text-sm text-fg">
              <input type="radio" name="mode" value="LOCATION_SURVEY" checked={survey} onChange={() => setMode("LOCATION_SURVEY")} className="mt-0.5 size-4 accent-accent" />
              <span>
                Pendataan lokasi BMN
                <span className="block text-muted">
                  Mencatat ruangan aset yang belum berlokasi, ruangan demi ruangan ({unplaced.toLocaleString("id-ID")} aset belum berlokasi saat ini).
                </span>
              </span>
            </label>
          </div>
          {errors.mode && <p className={fieldError}>{errors.mode}</p>}
        </fieldset>
      )}

      <div>
        <label htmlFor="op-location" className={label}>
          {survey ? "Ruangan yang didata" : "Lokasi"}
        </label>
        <select id="op-location" name="locationId" defaultValue="" required={survey} className={`${input} mt-1`}>
          <option value="">{survey ? "Pilih ruangan" : "Semua lokasi"}</option>
          {locations.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
        {survey && <p className={hint}>Aset yang ditemukan di ruangan ini akan dicatat berada di sini. Ruangan belum ada? Tambahkan di bawah formulir.</p>}
        {errors.locationId && <p className={fieldError}>{errors.locationId}</p>}
      </div>

      {survey ? (
        <div>
          <label htmlFor="op-category" className={label}>
            Kategori (opsional)
          </label>
          <select id="op-category" name="categoryId" defaultValue="" className={`${input} mt-1`}>
            <option value="">Semua kategori</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <p className={hint}>Mempersempit daftar agar lembar hitung lebih singkat, misalnya satu kategori per ruangan.</p>
          {errors.categoryId && <p className={fieldError}>{errors.categoryId}</p>}
        </div>
      ) : (
        <div>
          <label htmlFor="op-type" className={label}>
            Tipe barang
          </label>
          <select id="op-type" name="type" defaultValue={types.length === 1 ? types[0] : ""} className={`${input} mt-1`}>
            {types.length > 1 && <option value="">Semua tipe</option>}
            {types.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          {errors.type && <p className={fieldError}>{errors.type}</p>}
        </div>
      )}

      <div>
        <label htmlFor="op-notes" className={label}>
          Catatan (opsional)
        </label>
        <textarea id="op-notes" name="notes" rows={2} maxLength={500} className={`${input} mt-1 py-2`} />
        <p className={hint}>{survey ? "Contoh: Pendataan lokasi Lantai 2." : "Contoh: Pemeriksaan stok ATK triwulan III."}</p>
        {errors.notes && <p className={fieldError}>{errors.notes}</p>}
      </div>
      <div>
        <SubmitButton pendingLabel="Memulai…">{survey ? "Mulai pendataan" : "Mulai opname"}</SubmitButton>
      </div>
    </form>
  );
}
