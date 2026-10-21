// Indonesian display labels for inventory enums. Shared by the dashboard and
// the inventory/transaction modules.
import type {
  BorrowingStatus,
  ItemCondition,
  ItemStatus,
  ItemType,
  MaintenanceStatus,
  PurchasePlanStatus,
  StockOpnameStatus,
  TransactionType,
  VerificationStatus,
} from "@/lib/generated/prisma/enums";

export const ITEM_CONDITION_LABELS: Record<ItemCondition, string> = {
  GOOD: "Baik",
  MINOR_DAMAGE: "Rusak ringan",
  MAJOR_DAMAGE: "Rusak berat",
  LOST: "Hilang",
};

export const ITEM_TYPE_LABELS: Record<ItemType, string> = {
  BMN: "BMN",
  ATK: "ATK",
};

export const ITEM_STATUS_LABELS: Record<ItemStatus, string> = {
  AVAILABLE: "Tersedia",
  IN_USE: "Digunakan",
  BORROWED: "Dipinjam",
  UNDER_MAINTENANCE: "Dalam perawatan",
  LOST: "Hilang",
  DISPOSED: "Dihapuskan",
  IN_STOCK: "Stok tersedia",
  OUT_OF_STOCK: "Stok habis",
};

export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  IN: "Stok masuk",
  OUT: "Stok keluar",
  ASSIGN: "Penugasan",
  TRANSFER: "Pemindahan",
  BORROW: "Peminjaman",
  RETURN: "Pengembalian",
  ADJUSTMENT: "Penyesuaian",
};

export const BORROWING_STATUS_LABELS: Record<BorrowingStatus, string> = {
  BORROWED: "Dipinjam",
  RETURNED: "Dikembalikan",
  OVERDUE: "Terlambat",
  CANCELLED: "Dibatalkan",
  PENDING: "Menunggu persetujuan",
  REJECTED: "Ditolak",
};

export const MAINTENANCE_STATUS_LABELS: Record<MaintenanceStatus, string> = {
  REPORTED: "Dilaporkan",
  IN_PROGRESS: "Dikerjakan",
  COMPLETED: "Selesai",
  CANCELLED: "Dibatalkan",
};

export const OPNAME_STATUS_LABELS: Record<StockOpnameStatus, string> = {
  DRAFT: "Draf",
  IN_PROGRESS: "Berjalan",
  COMPLETED: "Selesai",
  CANCELLED: "Dibatalkan",
};

export const VERIFICATION_STATUS_LABELS: Record<VerificationStatus, string> = {
  MATCH: "Sesuai",
  MISMATCH: "Selisih",
  NOT_FOUND: "Tidak ditemukan",
  NOT_VERIFIED: "Belum diperiksa",
};

export const PURCHASE_PLAN_STATUS_LABELS: Record<PurchasePlanStatus, string> = {
  DRAFT: "Draf",
  FINAL: "Final",
  PARTIAL: "Diterima sebagian",
  RECEIVED: "Diterima",
  CANCELLED: "Dibatalkan",
};
