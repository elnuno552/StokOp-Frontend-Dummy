"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CustomFieldInputs } from "@/components/inventory/custom-field-inputs";
import { PicSelect } from "@/components/inventory/pic-select";
import type { FieldDef } from "@/lib/custom-fields/rules";
import { MoneyInput } from "@/components/ui/money-input";
import { Notice } from "@/components/ui/notice";
import { buttonPrimary, buttonSecondary, fieldError, hint, input, label } from "@/components/ui/styles";
import type { ItemType } from "@/lib/generated/prisma/enums";
import { ITEM_CONDITION_LABELS, ITEM_STATUS_LABELS } from "@/lib/inventory/labels";
import { prepareImage } from "@/lib/image-prepare";
import { BMN_INITIAL_STATUSES, ITEM_CONDITIONS, type CreateItemField } from "@/validations/item";

type Option = { id: string; name: string };
type FieldErrors = Partial<Record<CreateItemField, string>>;

const UNIT_SUGGESTIONS = ["buah", "pcs", "rim", "kotak", "pak", "lusin", "botol", "roll", "set"];
const FUNDING_SUGGESTIONS = ["APBN", "APBD", "PNBP", "Hibah"];

const TYPE_INFO: Record<ItemType, { title: string; text: string }> = {
  BMN: { title: "BMN", text: "Aset individual, misalnya laptop atau proyektor. Jumlah selalu 1 dan dapat dipinjam." },
  ATK: { title: "ATK", text: "Barang habis pakai dengan stok, misalnya kertas atau pulpen. Jumlah dicatat per satuan." },
};

const section = "flex flex-col gap-5 rounded-lg border border-border bg-surface p-4 sm:p-5";
const sectionTitle = "px-1 text-base font-semibold text-fg";
const radioCard =
  "flex cursor-pointer items-start gap-3 rounded-md border border-border-strong p-3 transition-colors duration-150 has-[:checked]:border-accent has-[:checked]:bg-accent-soft";

export function ItemForm({
  allowedTypes,
  categories,
  locations,
  employees,
  codePreview,
  customFields,
}: {
  allowedTypes: readonly ItemType[];
  categories: (Option & { type: ItemType })[];
  locations: Option[];
  employees: Option[];
  codePreview: Partial<Record<ItemType, string>>;
  /** Active custom fields per category id (Pengaturan > Kolom kustom). */
  customFields: Record<string, FieldDef[]>;
}) {
  const router = useRouter();
  const [type, setType] = useState<ItemType>(allowedTypes[0]);
  const [codeMode, setCodeMode] = useState<"auto" | "manual">("auto");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [preview, setPreview] = useState<{ url: string | null; name: string; size: number } | null>(null);
  const [attempt, setAttempt] = useState(0);
  // The photo that is actually sent: the picked file, or a smaller copy of it (see prepareImage).
  const [upload, setUpload] = useState<File | null>(null);
  const [preparing, setPreparing] = useState(false);
  const photoToken = useRef(0);
  const noticeRef = useRef<HTMLDivElement>(null);
  const [nupHint, setNupHint] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const typeCategories = categories.filter((c) => c.type === type);
  const errorCount = Object.keys(errors).length;

  // After a failed submit, move focus to the first field that needs attention.
  useEffect(() => {
    if (attempt === 0) return;
    formRef.current?.querySelector<HTMLElement>("[aria-invalid='true']")?.focus();
  }, [attempt]);

  // A message above the fold is easy to miss when Simpan is at the bottom of a long form.
  useEffect(() => {
    if (formError) noticeRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [formError, attempt]);

  // Release the previous object URL when the preview changes or the form unmounts.
  useEffect(() => {
    const url = preview?.url;
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [preview]);

  function fieldProps(field: CreateItemField, hasHint = false) {
    return {
      id: field,
      name: field,
      "aria-invalid": errors[field] ? true : undefined,
      "aria-describedby": [errors[field] && `${field}-error`, hasHint && `${field}-hint`].filter(Boolean).join(" ") || undefined,
    } as const;
  }

  function errorText(field: CreateItemField) {
    return errors[field] ? (
      <p id={`${field}-error`} className={fieldError}>
        {errors[field]}
      </p>
    ) : null;
  }

  function clearError(field: CreateItemField) {
    if (!errors[field]) return;
    setErrors((current) => {
      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  async function onFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    clearError("image");
    const input = event.target;
    const file = input.files?.[0];
    const token = ++photoToken.current;
    setUpload(null);
    if (!file) return setPreview(null);

    setPreparing(true);
    const prepared = await prepareImage(file);
    if (token !== photoToken.current) return; // another photo was picked meanwhile
    setPreparing(false);
    if (!prepared.ok) {
      input.value = "";
      setPreview(null);
      setErrors((current) => ({ ...current, image: prepared.error }));
      return;
    }
    setUpload(prepared.file);
    // Browsers cannot display HEIC, so show the file name only.
    const displayable = prepared.file.type === "image/jpeg" || prepared.file.type === "image/png";
    setPreview({ url: displayable ? URL.createObjectURL(prepared.file) : null, name: prepared.file.name, size: prepared.file.size });
  }

  // Suggest the next free NUP for the Satker + Kode Barang typed so far.
  async function suggestNup() {
    const form = formRef.current;
    if (!form) return;
    const value = (name: string) => (form.elements.namedItem(name) as HTMLInputElement | null)?.value.trim() ?? "";
    setNupHint(null);
    if (!value("kodeSatker") || !value("kodeBarang")) return setNupHint("Isi Kode Satker dan Kode Barang dahulu.");
    try {
      const response = await fetch(`/api/inventory/next-nup?kodeSatker=${encodeURIComponent(value("kodeSatker"))}&kodeBarang=${encodeURIComponent(value("kodeBarang"))}`);
      if (!response.ok) return setNupHint("Saran NUP tidak dapat dimuat.");
      const { nup, existing } = (await response.json()) as { nup: number; existing: boolean };
      const field = form.elements.namedItem("nup") as HTMLInputElement | null;
      if (field) field.value = String(nup);
      clearError("nup");
      setNupHint(existing ? `NUP berikutnya setelah yang sudah ada: ${nup}.` : `Belum ada barang dengan kode ini; dimulai dari ${nup}.`);
    } catch {
      setNupHint("Saran NUP tidak dapat dimuat.");
    }
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (preparing) return setFormError("Foto masih diproses. Tunggu sebentar lalu simpan lagi.");
    setSubmitting(true);
    setFormError(null);
    try {
      const data = new FormData(event.currentTarget);
      if (upload) data.set("image", upload);
      const response = await fetch("/api/items", { method: "POST", body: data });
      if (response.status === 201) {
        const { code } = (await response.json()) as { code: string };
        // Show the new item: search for its code and say it was added.
        router.push(`/inventory?q=${encodeURIComponent(code)}&created=${encodeURIComponent(code)}`);
        return;
      }
      if (response.status === 401) {
        router.push("/login");
        return;
      }
      const body = (await response.json().catch(() => ({}))) as { error?: string; fieldErrors?: FieldErrors };
      // The hosting platform answers an oversized upload itself, with no JSON body.
      if (response.status === 413 && !body.fieldErrors) {
        body.fieldErrors = { image: "Foto terlalu besar untuk diunggah. Pilih foto yang lebih kecil atau hapus foto, lalu simpan lagi." };
      }
      setErrors(body.fieldErrors ?? {});
      setFormError(body.error ?? (body.fieldErrors ? null : "Barang gagal disimpan. Coba lagi."));
      setAttempt((n) => n + 1);
      setSubmitting(false);
    } catch {
      setFormError("Tidak dapat terhubung ke server. Periksa koneksi lalu coba lagi.");
      setSubmitting(false);
    }
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} noValidate encType="multipart/form-data" className="flex max-w-3xl flex-col gap-6">
      {(formError || errorCount > 0) && (
        <div ref={noticeRef}>
          <Notice tone="error">{formError ?? `Periksa kembali ${errorCount} isian yang ditandai.`}</Notice>
        </div>
      )}

      {/* Jenis barang */}
      {allowedTypes.length > 1 ? (
        <fieldset className={section}>
          <legend className={sectionTitle}>Jenis barang</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {allowedTypes.map((value) => (
              <label key={value} className={radioCard}>
                <input
                  type="radio"
                  name="type"
                  value={value}
                  checked={type === value}
                  onChange={() => {
                    setType(value);
                    setErrors({});
                  }}
                  className="mt-0.5 size-4 accent-accent"
                />
                <span>
                  <span className="block text-sm font-semibold text-fg">{TYPE_INFO[value].title}</span>
                  <span className="block text-sm text-muted">{TYPE_INFO[value].text}</span>
                </span>
              </label>
            ))}
          </div>
          {errorText("type")}
        </fieldset>
      ) : (
        <input type="hidden" name="type" value={type} />
      )}

      {/* Identitas */}
      <fieldset className={section}>
        <legend className={sectionTitle}>Identitas barang</legend>

        <div>
          <span id="code-label" className={label}>
            Kode barang
          </span>
          <div role="radiogroup" aria-labelledby="code-label" className="mt-1.5 flex flex-wrap gap-x-6 gap-y-2">
            <label className="flex min-h-11 items-center gap-2 text-sm text-fg sm:min-h-9">
              <input
                type="radio"
                name="codeMode"
                value="auto"
                checked={codeMode === "auto"}
                onChange={() => {
                  setCodeMode("auto");
                  clearError("code");
                }}
                className="size-4 accent-accent"
              />
              Buat otomatis
            </label>
            <label className="flex min-h-11 items-center gap-2 text-sm text-fg sm:min-h-9">
              <input
                type="radio"
                name="codeMode"
                value="manual"
                checked={codeMode === "manual"}
                onChange={() => setCodeMode("manual")}
                className="size-4 accent-accent"
              />
              Isi manual
            </label>
          </div>
          {codeMode === "auto" ? (
            <p id="code-hint" className={hint}>
              Kode dibuat saat disimpan dengan format {type}-TAHUN-NOMOR. Kode berikutnya:{" "}
              <span className="font-mono font-semibold text-fg">{codePreview[type] ?? `${type}-…`}</span>
            </p>
          ) : (
            <>
              <input
                {...fieldProps("code", true)}
                aria-labelledby="code-label"
                required
                maxLength={100}
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                placeholder={`contoh: ${codePreview[type] ?? `${type}-2026-00001`}`}
                onChange={() => clearError("code")}
                className={`${input} mt-2 font-mono uppercase sm:max-w-sm`}
              />
              <p id="code-hint" className={hint}>
                Huruf, angka, titik, garis miring, garis bawah, atau tanda hubung. Harus unik di antara barang aktif.
              </p>
            </>
          )}
          {errorText("code")}
        </div>

        <div>
          <label htmlFor="name" className={label}>
            Nama barang
          </label>
          <input
            {...fieldProps("name")}
            required
            maxLength={255}
            autoComplete="off"
            placeholder={type === "BMN" ? "contoh: Laptop Dell Latitude 5440" : "contoh: Kertas HVS A4 70 gsm"}
            onChange={() => clearError("name")}
            className={`${input} mt-1.5`}
          />
          {errorText("name")}
        </div>

        <div className="sm:max-w-sm">
          <label htmlFor="categoryId" className={label}>
            Kategori <span className="font-normal text-muted">(opsional)</span>
          </label>
          <select key={type} {...fieldProps("categoryId", true)} defaultValue="" onChange={(e) => {
              setCategoryId(e.target.value);
              clearError("categoryId");
            }} className={`${input} mt-1.5`}>
            <option value="">Tanpa kategori</option>
            {typeCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <p id="categoryId-hint" className={hint}>
            {typeCategories.length ? `Hanya kategori ${type} yang ditampilkan.` : `Belum ada kategori ${type}.`}
          </p>
          {errorText("categoryId")}
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="brand" className={label}>
              Merek <span className="font-normal text-muted">(opsional)</span>
            </label>
            <input {...fieldProps("brand")} maxLength={150} autoComplete="off" className={`${input} mt-1.5`} />
            {errorText("brand")}
          </div>
          <div>
            <label htmlFor="model" className={label}>
              Model / tipe <span className="font-normal text-muted">(opsional)</span>
            </label>
            <input {...fieldProps("model")} maxLength={150} autoComplete="off" className={`${input} mt-1.5`} />
            {errorText("model")}
          </div>
        </div>

        {type === "BMN" && (
          <div className="sm:max-w-sm">
            <label htmlFor="serialNumber" className={label}>
              Nomor seri <span className="font-normal text-muted">(opsional)</span>
            </label>
            <input {...fieldProps("serialNumber")} maxLength={150} autoComplete="off" spellCheck={false} className={`${input} mt-1.5 font-mono`} />
            {errorText("serialNumber")}
          </div>
        )}
      </fieldset>

      {(customFields[categoryId] ?? []).length > 0 && typeCategories.some((c) => c.id === categoryId) && (
        <fieldset key={`cf-${categoryId}`} className={section}>
          <legend className={sectionTitle}>Data tambahan kategori</legend>
          <CustomFieldInputs fields={customFields[categoryId]} errors={errors as Record<string, string | undefined>} onEdit={(key) => clearError(key as CreateItemField)} />
        </fieldset>
      )}

      {type === "BMN" ? (
        <>
          <fieldset key="bmn-placement" className={section}>
            <legend className={sectionTitle}>Penempatan dan status</legend>
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="locationId" className={label}>
                  Lokasi <span className="font-normal text-muted">(opsional)</span>
                </label>
                <select {...fieldProps("locationId")} defaultValue="" className={`${input} mt-1.5`}>
                  <option value="">Belum ditentukan</option>
                  {locations.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
                {errorText("locationId")}
              </div>
              <div>
                <label htmlFor="picId" className={label}>
                  PIC / penanggung jawab <span className="font-normal text-muted">(opsional)</span>
                </label>
                <PicSelect
                  selectId="picId"
                  selectName="picId"
                  sourceName="picSource"
                  nameName="picManualName"
                  saveName="picSave"
                  options={employees}
                  emptyLabel="Belum ada PIC"
                  scope="barang ini"
                  selectError={errors.picId}
                  nameError={errors.picManualName}
                  onEdit={() => {
                    clearError("picId");
                    clearError("picManualName");
                  }}
                />
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <fieldset>
                <legend className={label}>Status awal</legend>
                <div className="mt-1.5 flex flex-col gap-2">
                  {BMN_INITIAL_STATUSES.map((status) => (
                    <label key={status} className="flex min-h-11 items-center gap-2 text-sm text-fg sm:min-h-9">
                      <input
                        type="radio"
                        name="status"
                        value={status}
                        defaultChecked={status === "AVAILABLE"}
                        aria-describedby="status-hint"
                        className="size-4 accent-accent"
                      />
                      {ITEM_STATUS_LABELS[status]}
                    </label>
                  ))}
                </div>
                <p id="status-hint" className={hint}>
                  Status lain (dipinjam, perawatan, hilang, dihapuskan) diubah melalui transaksinya masing-masing.
                </p>
                {errorText("status")}
              </fieldset>
              <div>
                <label htmlFor="condition" className={label}>
                  Kondisi
                </label>
                <select {...fieldProps("condition")} defaultValue="GOOD" className={`${input} mt-1.5`}>
                  {ITEM_CONDITIONS.map((condition) => (
                    <option key={condition} value={condition}>
                      {ITEM_CONDITION_LABELS[condition]}
                    </option>
                  ))}
                </select>
                {errorText("condition")}
              </div>
            </div>
          </fieldset>

          <fieldset key="bmn-acquisition" className={section}>
            <legend className={sectionTitle}>
              Perolehan <span className="text-sm font-normal text-muted">(opsional)</span>
            </legend>
            <div className="grid gap-5 sm:grid-cols-3">
              <div>
                <label htmlFor="acquisitionDate" className={label}>
                  Tanggal perolehan
                </label>
                <input {...fieldProps("acquisitionDate")} type="date" className={`${input} mt-1.5`} />
                {errorText("acquisitionDate")}
              </div>
              <div>
                <label htmlFor="acquisitionPrice" className={label}>
                  Harga perolehan
                </label>
                <div className="relative mt-1.5">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted">Rp</span>
                  <MoneyInput
                    {...fieldProps("acquisitionPrice", true)}
                    placeholder="15.000.000"
                    onChange={() => clearError("acquisitionPrice")}
                    className="pl-9"
                  />
                </div>
                <p id="acquisitionPrice-hint" className={hint}>
                  Titik ribuan terisi otomatis. Sen memakai koma, misalnya 1.500,50.
                </p>
                {errorText("acquisitionPrice")}
              </div>
              <div>
                <label htmlFor="fundingSource" className={label}>
                  Sumber dana
                </label>
                <input {...fieldProps("fundingSource")} list="funding-suggestions" maxLength={150} autoComplete="off" className={`${input} mt-1.5`} />
                <datalist id="funding-suggestions">
                  {FUNDING_SUGGESTIONS.map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
                {errorText("fundingSource")}
              </div>
            </div>
          </fieldset>

          <fieldset key="bmn-register" className={section}>
            <legend className={sectionTitle}>
              Data register BMN <span className="text-sm font-normal text-muted">(opsional)</span>
            </legend>
            <p className="-mt-2 text-sm text-muted">Untuk aset yang belum ada di ekspor SIMAN terbaru. Kode Satker, Kode Barang, dan NUP diisi bersamaan agar aset dapat dicocokkan saat impor SIMAN berikutnya.</p>
            <div className="grid gap-5 sm:grid-cols-3">
              <div>
                <label htmlFor="kodeSatker" className={label}>
                  Kode Satker
                </label>
                <input {...fieldProps("kodeSatker")} maxLength={50} autoComplete="off" className={`${input} mt-1.5 tabular-nums`} />
                {errorText("kodeSatker")}
              </div>
              <div>
                <label htmlFor="kodeBarang" className={label}>
                  Kode Barang
                </label>
                <input {...fieldProps("kodeBarang")} maxLength={20} autoComplete="off" className={`${input} mt-1.5 tabular-nums`} />
                {errorText("kodeBarang")}
              </div>
              <div>
                <label htmlFor="nup" className={label}>
                  NUP
                </label>
                <div className="mt-1.5 flex gap-2">
                  <input {...fieldProps("nup", true)} inputMode="numeric" autoComplete="off" onChange={() => clearError("nup")} className={`${input} tabular-nums`} />
                  <button type="button" onClick={suggestNup} className={`${buttonSecondary} shrink-0 px-3`}>
                    Saran
                  </button>
                </div>
                <p id="nup-hint" className={hint} aria-live="polite">
                  {nupHint ?? "Tombol Saran mengisi NUP berikutnya."}
                </p>
                {errorText("nup")}
              </div>
              <div>
                <label htmlFor="kodeRegister" className={label}>
                  Kode Register
                </label>
                <input {...fieldProps("kodeRegister")} maxLength={64} autoComplete="off" className={`${input} mt-1.5`} />
                {errorText("kodeRegister")}
              </div>
              <div>
                <label htmlFor="nilaiPerolehanPertama" className={label}>
                  Nilai perolehan pertama
                </label>
                <MoneyInput {...fieldProps("nilaiPerolehanPertama")} onChange={() => clearError("nilaiPerolehanPertama")} className="mt-1.5" />
                {errorText("nilaiPerolehanPertama")}
              </div>
              <div>
                <label htmlFor="nilaiBuku" className={label}>
                  Nilai buku
                </label>
                <MoneyInput {...fieldProps("nilaiBuku")} onChange={() => clearError("nilaiBuku")} className="mt-1.5" />
                {errorText("nilaiBuku")}
              </div>
              <div className="sm:col-span-3">
                <label htmlFor="statusPenggunaan" className={label}>
                  Status penggunaan
                </label>
                <input {...fieldProps("statusPenggunaan")} maxLength={150} autoComplete="off" placeholder="Digunakan sendiri untuk operasional" className={`${input} mt-1.5`} />
                {errorText("statusPenggunaan")}
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="noPsp" className={label}>
                  Nomor PSP
                </label>
                <input {...fieldProps("noPsp")} maxLength={100} autoComplete="off" className={`${input} mt-1.5`} />
                {errorText("noPsp")}
              </div>
              <div>
                <label htmlFor="tanggalPsp" className={label}>
                  Tanggal PSP
                </label>
                <input {...fieldProps("tanggalPsp")} type="date" className={`${input} mt-1.5`} />
                {errorText("tanggalPsp")}
              </div>
            </div>
          </fieldset>
        </>
      ) : (
        <fieldset key="atk-stock" className={section}>
          <legend className={sectionTitle}>Stok</legend>
          <div className="grid gap-5 sm:grid-cols-3">
            <div>
              <label htmlFor="unit" className={label}>
                Satuan
              </label>
              <input
                {...fieldProps("unit", true)}
                list="unit-suggestions"
                required
                maxLength={50}
                autoComplete="off"
                placeholder="rim, kotak, buah…"
                onChange={() => clearError("unit")}
                className={`${input} mt-1.5`}
              />
              <datalist id="unit-suggestions">
                {UNIT_SUGGESTIONS.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
              <p id="unit-hint" className={hint}>
                Wajib untuk ATK.
              </p>
              {errorText("unit")}
            </div>
            <div>
              <label htmlFor="initialStock" className={label}>
                Stok awal
              </label>
              <input
                {...fieldProps("initialStock", true)}
                inputMode="decimal"
                autoComplete="off"
                defaultValue="0"
                onChange={() => clearError("initialStock")}
                className={`${input} mt-1.5 tabular-nums`}
              />
              <p id="initialStock-hint" className={hint}>
                Dicatat sebagai stok masuk &ldquo;Stok awal&rdquo;.
              </p>
              {errorText("initialStock")}
            </div>
            <div>
              <label htmlFor="minimumStock" className={label}>
                Stok minimum <span className="font-normal text-muted">(opsional)</span>
              </label>
              <input
                {...fieldProps("minimumStock", true)}
                inputMode="decimal"
                autoComplete="off"
                onChange={() => clearError("minimumStock")}
                className={`${input} mt-1.5 tabular-nums`}
              />
              <p id="minimumStock-hint" className={hint}>
                Batas untuk peringatan &ldquo;perlu diisi ulang&rdquo;.
              </p>
              {errorText("minimumStock")}
            </div>
          </div>
          <div className="sm:max-w-sm">
            <label htmlFor="locationId" className={label}>
              Lokasi penyimpanan <span className="font-normal text-muted">(opsional)</span>
            </label>
            <select {...fieldProps("locationId")} defaultValue="" className={`${input} mt-1.5`}>
              <option value="">Belum ditentukan</option>
              {locations.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
            {errorText("locationId")}
          </div>
        </fieldset>
      )}

      {/* Foto dan keterangan */}
      <fieldset className={section}>
        <legend className={sectionTitle}>
          Foto dan keterangan <span className="text-sm font-normal text-muted">(opsional)</span>
        </legend>

        <div>
          <label htmlFor="image" className={label}>
            Foto barang
          </label>
          <input
            ref={fileRef}
            {...fieldProps("image", true)}
            type="file"
            accept=".jpg,.jpeg,.png,.heic,image/jpeg,image/png,image/heic"
            onChange={onFileChange}
            className="mt-1.5 block w-full text-sm text-muted file:mr-3 file:min-h-10 file:rounded-md file:border file:border-border-strong file:bg-surface file:px-4 file:text-sm file:font-semibold file:text-fg hover:file:bg-surface-sunken"
          />
          <p id="image-hint" className={hint}>
            JPG, PNG, atau HEIC. Foto yang besar dikecilkan otomatis sebelum diunggah.
          </p>
          {errorText("image")}
          {preview && (
            <div className="mt-3 flex items-center gap-3 rounded-md border border-border p-2">
              {preview.url ? (
                // eslint-disable-next-line @next/next/no-img-element -- local object URL preview
                <img src={preview.url} alt="" className="size-16 rounded object-cover" />
              ) : (
                <span className="flex size-16 items-center justify-center rounded bg-surface-sunken text-xs text-fg-secondary">HEIC</span>
              )}
              <div className="min-w-0 flex-1 text-sm">
                <p className="truncate font-medium text-fg">{preview.name}</p>
                <p className="tabular-nums text-muted">{(preview.size / 1024 / 1024).toLocaleString("id-ID", { maximumFractionDigits: 1 })} MB</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (fileRef.current) fileRef.current.value = "";
                  photoToken.current++;
                  setUpload(null);
                  setPreparing(false);
                  setPreview(null);
                  clearError("image");
                }}
                className="min-h-11 rounded-md px-3 text-sm font-medium text-danger hover:bg-danger-soft sm:min-h-9"
              >
                Hapus foto
              </button>
            </div>
          )}
        </div>

        <div>
          <label htmlFor="description" className={label}>
            Keterangan
          </label>
          <textarea
            {...fieldProps("description")}
            rows={3}
            maxLength={2000}
            className={`${input} mt-1.5 py-2`}
            placeholder="Spesifikasi atau informasi lain tentang barang."
          />
          {errorText("description")}
        </div>
      </fieldset>

      <div className="flex flex-col gap-3 sm:flex-row">
        <button type="submit" disabled={submitting} aria-disabled={submitting} className={buttonPrimary}>
          {submitting ? "Menyimpan…" : preparing ? "Memproses foto…" : "Simpan barang"}
        </button>
        <Link href="/inventory" className={buttonSecondary}>
          Batal
        </Link>
      </div>
    </form>
  );
}
