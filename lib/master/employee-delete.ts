// When an employee may be deleted from Data master (Pegawai). Pure, so it is tested directly.
//
// Items that were deleted keep their history but no longer count: an employee who is only the PIC of deleted items
// can go (the deleted items simply lose the link). Active items and loans still block, because deleting would
// silently change who is responsible for them; deactivating the employee is the way out in that case.

export interface EmployeeUsage {
  /** Items that still exist (not deleted) with this employee as PIC. */
  activeItems: number;
  /** Loans recorded with this employee as borrower, returned or not. */
  borrowings: number;
}

/** The reason the employee cannot be deleted, or null when deleting is allowed. */
export function employeeDeleteBlock(usage: EmployeeUsage): string | null {
  if (usage.borrowings > 0) {
    return "Pegawai tercatat pada peminjaman sehingga tidak dapat dihapus. Nonaktifkan saja lewat menu Ubah.";
  }
  if (usage.activeItems > 0) {
    return `Pegawai masih menjadi PIC ${usage.activeItems} barang aktif. Ganti PIC barangnya lebih dulu, atau nonaktifkan lewat menu Ubah.`;
  }
  return null;
}
