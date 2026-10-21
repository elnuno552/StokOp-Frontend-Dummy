"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/ui/submit-button";
import { fieldError, hint, input, label, panel } from "@/components/ui/styles";
import { createPlanAction, type NewPlanState } from "../actions";

export function NewPlanForm({ today }: { today: string }) {
  const [state, action] = useActionState<NewPlanState, FormData>(createPlanAction, {});
  const errors = state.fieldErrors ?? {};

  return (
    <form action={action} key={state.attempt} className={`${panel} flex flex-col gap-4 p-5`}>
      {state.error && (
        <p role="alert" className="rounded-md border border-danger-border bg-danger-soft px-3 py-2 text-sm font-medium text-danger">
          {state.error}
        </p>
      )}
      <div>
        <label htmlFor="title" className={label}>
          Judul
        </label>
        <input id="title" name="title" defaultValue="RAB Pembelian ATK" maxLength={255} required aria-invalid={errors.title ? true : undefined} className={`${input} mt-1`} />
        {errors.title && <p className={fieldError}>{errors.title}</p>}
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor="planDate" className={label}>
            Tanggal
          </label>
          <input id="planDate" name="planDate" type="date" defaultValue={today} required aria-invalid={errors.planDate ? true : undefined} className={`${input} mt-1`} />
          {errors.planDate && <p className={fieldError}>{errors.planDate}</p>}
        </div>
        <div>
          <label htmlFor="pricePercent" className={label}>
            Kenaikan harga (%)
          </label>
          <input id="pricePercent" name="pricePercent" defaultValue="15" inputMode="decimal" required aria-invalid={errors.pricePercent ? true : undefined} className={`${input} mt-1`} />
          {errors.pricePercent && <p className={fieldError}>{errors.pricePercent}</p>}
        </div>
        <div>
          <label htmlFor="ppnRate" className={label}>
            PPN (%)
          </label>
          <input id="ppnRate" name="ppnRate" defaultValue="11" inputMode="decimal" required aria-invalid={errors.ppnRate ? true : undefined} className={`${input} mt-1`} />
          {errors.ppnRate && <p className={fieldError}>{errors.ppnRate}</p>}
        </div>
      </div>
      <p className={hint}>
        Harga per unit dihitung: harga satuan × (1 + kenaikan) + biaya pengiriman ÷ volume. Pada RAB yang lama kenaikannya 15%.
      </p>
      <div>
        <label htmlFor="notes" className={label}>
          Catatan (opsional)
        </label>
        <textarea id="notes" name="notes" rows={2} maxLength={500} className={`${input} mt-1 py-2`} />
        {errors.notes && <p className={fieldError}>{errors.notes}</p>}
      </div>
      <div>
        <SubmitButton pendingLabel="Membuat…">Buat RAB</SubmitButton>
      </div>
    </form>
  );
}
