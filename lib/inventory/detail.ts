import { picDisplayName } from "@/lib/employees/manual-pic-rules";
import { borrowerLabel } from "@/lib/borrowing/rules";
import { displayCustomValue } from "@/lib/custom-fields/rules";
import { isOpenDisposal } from "@/lib/disposal/rules";
import type { AuthContext } from "@/lib/auth/guards";
import { AuthorizationError } from "@/lib/auth/errors";
import { formatDate, formatDateTime, formatQuantity, formatRupiah } from "@/lib/format";
import { borrowings, disposals, employeeById, fieldDefs, itemById, locationById, maintenance, notes, transactions, userName } from "@/lib/mock/data";
import { categoryById } from "@/lib/mock/data";
import { canReadInventory } from "@/lib/permissions";
import type { InventoryListQuery } from "@/validations/inventory";
import { selectItems } from "./list";

const rupiah = (value: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);

/** One item with everything the detail tabs need. Returns null for a missing item. */
export async function getItemDetail(actor: AuthContext, id: string) {
  if (!canReadInventory(actor.role)) throw new AuthorizationError();

  const item = itemById(id);
  if (!item) return null;

  const category = categoryById(item.categoryId);
  const location = locationById(item.locationId);
  const pic = employeeById(item.picId);
  const itemNotes = notes.filter((n) => n.itemId === id).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  const itemTransactions = transactions.filter((t) => t.itemId === id);
  const itemBorrowings = borrowings.filter((b) => b.itemId === id).sort((a, b) => b.borrowedAt.getTime() - a.borrowedAt.getTime());
  const itemMaintenance = maintenance.filter((m) => m.itemId === id).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  const itemDisposals = disposals.filter((d) => d.itemId === id).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  // Custom fields of the category: active ones (even when empty) and archived ones that still hold a value.
  const customFields = fieldDefs
    .filter((d) => d.categoryId === item.categoryId)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((d) => ({ id: d.id, label: d.label, archived: d.archivedAt !== null, display: displayCustomValue({ type: d.type }, item.customValues[d.id]) }))
    .filter((f) => !f.archived || f.display !== "");

  const quantity = item.quantity;
  const minimumStock = item.minimumStock;
  const now = Date.now();
  const hasPendingBorrowing = itemBorrowings.some((b) => b.status === "PENDING");
  const isOverdue = (b: (typeof itemBorrowings)[number]) =>
    b.status === "OVERDUE" || (b.status === "BORROWED" && b.expectedReturnAt !== null && b.expectedReturnAt.getTime() < now);

  return {
    id: item.id,
    code: item.code,
    name: item.name,
    type: item.type,
    status: item.status,
    condition: item.condition,
    brand: item.brand,
    model: item.model,
    serialNumber: item.serialNumber,
    description: item.description,
    unit: item.unit,
    fundingSource: item.fundingSource,
    quantityLabel: formatQuantity(quantity),
    minimumStockLabel: minimumStock === null ? null : formatQuantity(minimumStock),
    lowStock: item.type === "ATK" && item.status !== "DISPOSED" && (quantity === 0 || (minimumStock !== null && quantity <= minimumStock)),
    overdueBorrowing: itemBorrowings.some(isOverdue),
    hasPendingBorrowing,
    customFields,
    openDisposal: itemDisposals.some((d) => isOpenDisposal(d.status)),
    disposals: itemDisposals.map((d) => ({
      id: d.id,
      status: d.status,
      reasonType: d.reasonType,
      reason: d.reason,
      proposalNumber: d.proposalNumber,
      proposalDateLabel: d.proposalDate ? formatDate(d.proposalDate) : null,
      decisionNumber: d.decisionNumber,
      decisionDateLabel: d.decisionDate ? formatDate(d.decisionDate) : null,
      decisionNotes: d.decisionNotes,
      completedLabel: d.completedAt ? formatDate(d.completedAt) : null,
      createdLabel: formatDate(d.createdAt),
    })),
    acquisitionDateLabel: item.acquisitionDate ? formatDate(item.acquisitionDate) : null,
    acquisitionPriceLabel: item.acquisitionPrice === null ? null : rupiah(item.acquisitionPrice),
    register: {
      kodeSatker: item.kodeSatker,
      kodeBarang: item.kodeBarang,
      nup: item.nup,
      kodeRegister: item.kodeRegister,
      umurAset: item.umurAset,
      tanggalBukuPertamaLabel: item.tanggalBukuPertama ? formatDate(item.tanggalBukuPertama) : null,
      nilaiPerolehanPertamaLabel: item.nilaiPerolehanPertama === null ? null : formatRupiah(item.nilaiPerolehanPertama),
      nilaiMutasiLabel: item.nilaiMutasi === null ? null : formatRupiah(item.nilaiMutasi),
      nilaiPenyusutanLabel: item.nilaiPenyusutan === null ? null : formatRupiah(item.nilaiPenyusutan),
      nilaiBukuLabel: item.nilaiBuku === null ? null : formatRupiah(item.nilaiBuku),
      statusPenggunaan: item.statusPenggunaan,
      noPsp: item.noPsp,
      tanggalPspLabel: item.tanggalPsp ? formatDate(item.tanggalPsp) : null,
      // Shown only when the asset came from (or was filled with) register data.
      hasData: Boolean(item.kodeBarang || item.kodeSatker || item.kodeRegister || item.nilaiBuku !== null || item.nilaiPerolehanPertama !== null || item.noPsp),
    },
    createdAtLabel: formatDateTime(item.createdAt),
    updatedAtLabel: formatDateTime(item.updatedAt),
    categoryName: category?.name ?? null,
    locationId: item.locationId,
    locationName: location?.name ?? null,
    locationPath: location ? [location.building, location.floor, location.room].filter(Boolean) : [],
    picName: picDisplayName(pic ? { name: pic.name } : null, item.picName),
    /** A PIC typed in by hand that is not in Data master. */
    picIsManual: !pic && Boolean(item.picName),
    picUnit: pic?.unit ?? null,
    images: [] as { id: string; fileName: string; sizeLabel: string; createdAtLabel: string }[],
    notes: itemNotes.map((n) => ({ id: n.id, content: n.content, userName: userName(n.userId) ?? "—", createdAtLabel: formatDateTime(n.createdAt) })),
    transactions: itemTransactions.map((t) => ({
      id: t.id,
      type: t.type,
      quantityLabel: formatQuantity(t.quantity),
      beforeLabel: formatQuantity(t.quantityBefore),
      afterLabel: formatQuantity(t.quantityAfter),
      from: locationById(t.fromLocationId)?.name ?? picDisplayName(employeeById(t.fromPicId), t.fromPicName),
      to: locationById(t.toLocationId)?.name ?? picDisplayName(employeeById(t.toPicId), t.toPicName),
      description: t.description,
      userName: userName(t.performedById) ?? "—",
      createdAtLabel: formatDateTime(t.createdAt),
    })),
    borrowings: itemBorrowings.map((b) => ({
      id: b.id,
      borrowerName: borrowerLabel({ borrowerType: b.borrowerType, borrowerName: employeeById(b.borrowerId)?.name, externalParty: b.externalParty }),
      basisDocument: b.basisDocument,
      rejectedReason: b.rejectedReason,
      status: b.status,
      borrowedAtLabel: formatDate(b.borrowedAt),
      expectedReturnLabel: b.expectedReturnAt ? formatDate(b.expectedReturnAt) : null,
      returnedLabel: b.returnedAt ? formatDate(b.returnedAt) : null,
      overdue: isOverdue(b),
      notes: b.notes,
    })),
    maintenance: itemMaintenance.map((m) => ({
      id: m.id,
      problem: m.problem,
      actionTaken: m.actionTaken,
      technician: m.technician,
      executorType: m.executorType,
      vendorName: m.vendorName,
      status: m.status,
      costLabel: m.cost === null ? null : rupiah(m.cost),
      createdAtLabel: formatDate(m.createdAt),
      completedLabel: m.completedAt ? formatDate(m.completedAt) : null,
    })),
  };
}

export type ItemDetail = NonNullable<Awaited<ReturnType<typeof getItemDetail>>>;

/** Position of `id` in the list that the user came from, with its neighbours. Null when the item is not in that list. */
export async function getItemNeighbors(actor: AuthContext, id: string, query: InventoryListQuery) {
  if (!canReadInventory(actor.role)) throw new AuthorizationError();
  const rows = await selectItems(query);
  const index = rows.findIndex((r) => r.id === id);
  if (index === -1) return null;
  return {
    position: index + 1,
    total: rows.length,
    prevId: rows[index - 1]?.id ?? null,
    nextId: rows[index + 1]?.id ?? null,
  };
}
