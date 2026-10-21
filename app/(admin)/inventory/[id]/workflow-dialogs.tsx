"use client";

import { menuTrigger } from "@/components/ui/menu";
import { useState } from "react";
import { ActionDialog, type DialogState } from "@/components/ui/action-dialog";
import { MoneyInput } from "@/components/ui/money-input";
import { buttonPrimary, buttonSecondary, fieldError, hint, input, label } from "@/components/ui/styles";
import { ITEM_CONDITION_LABELS } from "@/lib/inventory/labels";
import type { MaintenanceOp } from "@/validations/workflow";
import { borrowAction, maintenanceAction, reportMaintenanceAction, returnAction } from "./workflow-actions";

type Errors = Partial<Record<string, string>>;

const small = "min-h-9 px-3";

function FieldError({ errors, name }: { errors: Errors; name: string }) {
  return errors[name] ? (
    <p role="alert" className={fieldError}>
      {errors[name]}
    </p>
  ) : null;
}

const CONDITION_OPTIONS = ["GOOD", "MINOR_DAMAGE", "MAJOR_DAMAGE"] as const;

// Employee or outside party. An outside party needs a basis document (nomor surat / BAST).
function BorrowerFields({ employees, errors }: { employees: { id: string; name: string }[]; errors: Errors }) {
  const [type, setType] = useState<"EMPLOYEE" | "EXTERNAL">("EMPLOYEE");
  return (
    <>
      <fieldset>
        <legend className={label}>Jenis peminjam</legend>
        <div className="mt-1 flex flex-wrap gap-4">
          {(["EMPLOYEE", "EXTERNAL"] as const).map((t) => (
            <label key={t} className="flex min-h-9 items-center gap-2 text-sm text-fg">
              <input type="radio" name="borrowerType" value={t} checked={type === t} onChange={() => setType(t)} className="size-4 accent-accent" />
              {t === "EMPLOYEE" ? "Pegawai" : "Pihak lain / instansi lain"}
            </label>
          ))}
        </div>
      </fieldset>
      {type === "EMPLOYEE" ? (
        <div>
          <label htmlFor="bw-borrower" className={label}>
            Peminjam
          </label>
          <select id="bw-borrower" name="borrowerId" defaultValue="" required aria-invalid={errors.borrowerId ? true : undefined} className={`${input} mt-1`}>
            <option value="" disabled>
              Pilih pegawai
            </option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
          <FieldError errors={errors} name="borrowerId" />
        </div>
      ) : (
        <>
          <div>
            <label htmlFor="bw-party" className={label}>
              Nama pihak / instansi
            </label>
            <input id="bw-party" name="externalParty" maxLength={200} required aria-invalid={errors.externalParty ? true : undefined} className={`${input} mt-1`} />
            <FieldError errors={errors} name="externalParty" />
          </div>
          <div>
            <label htmlFor="bw-basis" className={label}>
              Nomor surat / BAST
            </label>
            <input id="bw-basis" name="basisDocument" maxLength={200} required aria-invalid={errors.basisDocument ? true : undefined} className={`${input} mt-1`} />
            <FieldError errors={errors} name="basisDocument" />
          </div>
          <div>
            <label htmlFor="bw-usage" className={label}>
              Jenis penggunaan (opsional)
            </label>
            <input id="bw-usage" name="usageType" maxLength={150} placeholder="Digunakan sementara oleh pihak lain" className={`${input} mt-1`} />
            <p className={hint}>Menjadi Status Penggunaan aset selama dipinjam, lalu dikembalikan seperti semula.</p>
            <FieldError errors={errors} name="usageType" />
          </div>
          <div>
            <label htmlFor="bw-contact" className={label}>
              Kontak (opsional)
            </label>
            <input id="bw-contact" name="externalContact" maxLength={200} className={`${input} mt-1`} />
            <FieldError errors={errors} name="externalContact" />
          </div>
        </>
      )}
    </>
  );
}

export function BorrowDialog({ itemId, itemName, employees, needsApproval }: { itemId: string; itemName: string; employees: { id: string; name: string }[]; needsApproval: boolean }) {
  return (
    <ActionDialog
      triggerLabel="Pinjamkan"
      triggerClassName={buttonPrimary}
      title="Pinjamkan barang"
      description={needsApproval ? `${itemName}. Peminjaman ini akan menunggu persetujuan.` : itemName}
      action={borrowAction.bind(null, itemId) as (prev: DialogState, fd: FormData) => Promise<DialogState>}
      submitLabel={needsApproval ? "Ajukan peminjaman" : "Pinjamkan"}
      pendingLabel="Menyimpan…"
    >
      {(errors) => (
        <>
          <BorrowerFields employees={employees} errors={errors} />
          <div>
            <label htmlFor="bw-return" className={label}>
              Batas pengembalian (opsional)
            </label>
            <input id="bw-return" name="expectedReturnAt" type="date" aria-invalid={errors.expectedReturnAt ? true : undefined} className={`${input} mt-1`} />
            <FieldError errors={errors} name="expectedReturnAt" />
          </div>
          <div>
            <label htmlFor="bw-notes" className={label}>
              Keperluan / catatan (opsional)
            </label>
            <textarea id="bw-notes" name="notes" rows={2} maxLength={500} className={`${input} mt-1 py-2`} />
            <FieldError errors={errors} name="notes" />
          </div>
        </>
      )}
    </ActionDialog>
  );
}

export function ReturnDialog({ itemId, borrowingId, borrowerName, asMenuItem }: { itemId: string; borrowingId: string; borrowerName: string; asMenuItem?: boolean }) {
  return (
    <ActionDialog
      triggerLabel="Kembalikan"
      triggerClassName={`${buttonSecondary} ${small}`}
      title="Pengembalian barang"
      description={`Dari ${borrowerName}`}
      action={returnAction.bind(null, itemId, borrowingId) as (prev: DialogState, fd: FormData) => Promise<DialogState>}
      submitLabel="Terima pengembalian"
      pendingLabel="Menyimpan…"
      {...menuTrigger(asMenuItem)}
    >
      {(errors) => (
        <>
          <div>
            <label htmlFor="rt-condition" className={label}>
              Kondisi saat dikembalikan
            </label>
            <select id="rt-condition" name="conditionAfter" defaultValue="GOOD" className={`${input} mt-1`}>
              {CONDITION_OPTIONS.map((c) => (
                <option key={c} value={c}>
                  {ITEM_CONDITION_LABELS[c]}
                </option>
              ))}
            </select>
            <FieldError errors={errors} name="conditionAfter" />
          </div>
          <div>
            <label htmlFor="rt-notes" className={label}>
              Catatan (opsional)
            </label>
            <textarea id="rt-notes" name="notes" rows={2} maxLength={500} className={`${input} mt-1 py-2`} />
          </div>
        </>
      )}
    </ActionDialog>
  );
}

// Who repairs the asset: staff of the institution or an outside vendor (named).
function ExecutorFields({ errors, idPrefix, defaultType, defaultVendor }: { errors: Errors; idPrefix: string; defaultType: "INTERNAL" | "VENDOR"; defaultVendor?: string | null }) {
  const [type, setType] = useState<"INTERNAL" | "VENDOR">(defaultType);
  return (
    <>
      <div>
        <label htmlFor={`${idPrefix}-exec`} className={label}>
          Pelaksana perawatan
        </label>
        <select id={`${idPrefix}-exec`} name="executorType" value={type} onChange={(e) => setType(e.target.value as "INTERNAL" | "VENDOR")} className={`${input} mt-1`}>
          <option value="INTERNAL">Internal (pegawai sendiri)</option>
          <option value="VENDOR">Vendor / pihak luar</option>
        </select>
        <FieldError errors={errors} name="executorType" />
      </div>
      {type === "VENDOR" && (
        <div>
          <label htmlFor={`${idPrefix}-vendor`} className={label}>
            Nama vendor
          </label>
          <input id={`${idPrefix}-vendor`} name="vendorName" maxLength={150} required defaultValue={defaultVendor ?? ""} aria-invalid={errors.vendorName ? true : undefined} className={`${input} mt-1`} />
          <FieldError errors={errors} name="vendorName" />
        </div>
      )}
    </>
  );
}

export function ReportMaintenanceDialog({ itemId, itemName }: { itemId: string; itemName: string }) {
  return (
    <ActionDialog
      triggerLabel="Lapor kerusakan"
      title="Lapor kerusakan"
      description={itemName}
      action={reportMaintenanceAction.bind(null, itemId) as (prev: DialogState, fd: FormData) => Promise<DialogState>}
      submitLabel="Kirim laporan"
      pendingLabel="Menyimpan…"
    >
      {(errors) => (
        <>
          <div>
            <label htmlFor="mt-problem" className={label}>
              Masalah
            </label>
            <textarea id="mt-problem" name="problem" rows={3} maxLength={2000} required aria-invalid={errors.problem ? true : undefined} className={`${input} mt-1 py-2`} />
            <FieldError errors={errors} name="problem" />
            <p className={hint}>Barang langsung berstatus dalam perawatan dan tidak dapat dipinjam.</p>
          </div>
          <ExecutorFields errors={errors} idPrefix="mt" defaultType="INTERNAL" />
          <div>
            <label htmlFor="mt-tech" className={label}>
              Teknisi (opsional)
            </label>
            <input id="mt-tech" name="technician" maxLength={150} className={`${input} mt-1`} />
          </div>
        </>
      )}
    </ActionDialog>
  );
}

const OP_TEXT: Record<MaintenanceOp, { trigger: string; title: string; submit: string }> = {
  start: { trigger: "Mulai", title: "Mulai perawatan?", submit: "Mulai" },
  complete: { trigger: "Selesaikan", title: "Selesaikan perawatan", submit: "Selesaikan" },
  cancel: { trigger: "Batalkan", title: "Batalkan perawatan?", submit: "Ya, batalkan" },
};

export function MaintenanceOpDialog({
  itemId,
  recordId,
  op,
  executorType = "INTERNAL",
  vendorName,
  asMenuItem,
}: {
  itemId: string;
  recordId: string;
  op: MaintenanceOp;
  executorType?: "INTERNAL" | "VENDOR";
  vendorName?: string | null;
  asMenuItem?: boolean;
}) {
  const text = OP_TEXT[op];
  return (
    <ActionDialog
      triggerLabel={text.trigger}
      triggerClassName={`${buttonSecondary} ${small}`}
      title={text.title}
      description={op === "cancel" ? "Barang dikembalikan ke status sebelumnya." : undefined}
      action={maintenanceAction.bind(null, itemId, recordId, op) as (prev: DialogState, fd: FormData) => Promise<DialogState>}
      submitLabel={text.submit}
      pendingLabel="Menyimpan…"
      tone={op === "cancel" ? "danger" : "primary"}
      {...menuTrigger(asMenuItem)}
    >
      {op === "complete"
        ? (errors) => (
            <>
              <div>
                <label htmlFor="mc-action" className={label}>
                  Tindakan yang dilakukan
                </label>
                <textarea id="mc-action" name="actionTaken" rows={3} maxLength={2000} required aria-invalid={errors.actionTaken ? true : undefined} className={`${input} mt-1 py-2`} />
                <FieldError errors={errors} name="actionTaken" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="mc-cost" className={label}>
                    Biaya (Rp, opsional)
                  </label>
                  <MoneyInput id="mc-cost" name="cost" aria-invalid={errors.cost ? true : undefined} className="mt-1" />
                  <FieldError errors={errors} name="cost" />
                </div>
                <div>
                  <label htmlFor="mc-condition" className={label}>
                    Kondisi akhir
                  </label>
                  <select id="mc-condition" name="conditionAfter" defaultValue="GOOD" className={`${input} mt-1`}>
                    {CONDITION_OPTIONS.map((c) => (
                      <option key={c} value={c}>
                        {ITEM_CONDITION_LABELS[c]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <ExecutorFields errors={errors} idPrefix="mc" defaultType={executorType} defaultVendor={vendorName} />
              <div>
                <label htmlFor="mc-tech" className={label}>
                  Teknisi (opsional)
                </label>
                <input id="mc-tech" name="technician" maxLength={150} className={`${input} mt-1`} />
              </div>
            </>
          )
        : undefined}
    </ActionDialog>
  );
}
