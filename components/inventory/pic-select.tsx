"use client";

import { useState } from "react";
import { fieldError, hint, input, label } from "@/components/ui/styles";

type Option = { id: string; name: string };

/** Value of the "type it in" entry; never submitted (the select drops its name while it is chosen). */
const MANUAL = "__manual__";
/** Value of the optional "no PIC" entry; it clears the PIC and is never submitted as an id. */
const NONE = "__none__";

/**
 * PIC dropdown with a last entry for someone who is not in Data master yet. Choosing it shows a name field and
 * a choice: also save the person to Data master (default) or keep the name on the item only.
 *
 * Submits `selectName` (an employee id) while a person is picked from the list, or `sourceName` = "manual" with
 * `nameName` and `saveName` ("1" save / "0" item only) while the name is typed in, or `sourceName` = "none" when
 * `noneLabel` is chosen (clear the PIC). The server reads `sourceName`.
 */
export function PicSelect({
  selectId,
  selectName,
  sourceName,
  nameName,
  saveName,
  options,
  emptyLabel,
  noneLabel,
  scope,
  selectError,
  nameError,
  onEdit,
  describedBy,
}: {
  selectId: string;
  selectName: string;
  sourceName: string;
  nameName: string;
  saveName: string;
  options: Option[];
  emptyLabel: string;
  /** Adds an entry that clears the PIC. Leave out where the empty entry already means "no PIC". */
  noneLabel?: string;
  /** Wording for the save choice: "barang ini" or "barang yang dipilih". */
  scope: string;
  selectError?: string;
  nameError?: string;
  onEdit?: () => void;
  describedBy?: string;
}) {
  const [choice, setChoice] = useState("");
  const [typed, setTyped] = useState("");
  const [save, setSave] = useState("1");
  const manual = choice === MANUAL;
  const none = choice === NONE;
  const nameId = `${selectId}-manual-name`;

  return (
    <>
      <select
        id={selectId}
        name={manual || none ? undefined : selectName}
        value={choice}
        onChange={(event) => {
          setChoice(event.target.value);
          onEdit?.();
        }}
        aria-invalid={selectError ? true : undefined}
        aria-describedby={[selectError && `${selectId}-error`, describedBy].filter(Boolean).join(" ") || undefined}
        className={`${input} mt-1.5`}
      >
        <option value="">{emptyLabel}</option>
        {noneLabel && <option value={NONE}>{noneLabel}</option>}
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
        <option value={MANUAL}>Tidak ada di daftar, isi manual…</option>
      </select>
      {selectError && (
        <p id={`${selectId}-error`} role="alert" className={fieldError}>
          {selectError}
        </p>
      )}

      {none && <input type="hidden" name={sourceName} value="none" />}

      {manual && (
        <div className="mt-3 flex flex-col gap-3 rounded-md border border-border bg-surface-sunken p-3">
          <input type="hidden" name={sourceName} value="manual" />
          <div>
            <label htmlFor={nameId} className={label}>
              Nama PIC
            </label>
            <input
              id={nameId}
              name={nameName}
              value={typed}
              onChange={(event) => {
                setTyped(event.target.value);
                onEdit?.();
              }}
              maxLength={150}
              autoComplete="off"
              required
              aria-invalid={nameError ? true : undefined}
              aria-describedby={[nameError && `${nameId}-error`, `${nameId}-hint`].filter(Boolean).join(" ")}
              className={`${input} mt-1.5`}
            />
            <p id={`${nameId}-hint`} className={hint}>
              Tulis nama lengkap. Jika pegawai dengan nama yang sama sudah ada di Data master, pegawai itu yang dipakai.
            </p>
            {nameError && (
              <p id={`${nameId}-error`} role="alert" className={fieldError}>
                {nameError}
              </p>
            )}
          </div>
          <fieldset>
            <legend className={label}>Nama ini</legend>
            <div className="mt-1.5 flex flex-col gap-1">
              <label className="flex min-h-11 items-start gap-2 py-1 text-sm text-fg sm:min-h-9">
                <input type="radio" name={saveName} value="1" checked={save === "1"} onChange={() => setSave("1")} className="mt-0.5 size-4 accent-accent" />
                <span>
                  Simpan ke Data master pegawai
                  <span className="block text-muted">Bisa dipilih lagi untuk barang lain.</span>
                </span>
              </label>
              <label className="flex min-h-11 items-start gap-2 py-1 text-sm text-fg sm:min-h-9">
                <input type="radio" name={saveName} value="0" checked={save === "0"} onChange={() => setSave("0")} className="mt-0.5 size-4 accent-accent" />
                <span>
                  Hanya untuk {scope}
                  <span className="block text-muted">Tidak masuk Data master pegawai.</span>
                </span>
              </label>
            </div>
          </fieldset>
        </div>
      )}
    </>
  );
}
