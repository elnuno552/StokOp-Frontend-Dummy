import { PageSkeleton } from "@/components/ui/skeleton";

export default function InventoryLoading() {
  return <PageSkeleton rows={10} label="Memuat data inventaris…" />;
}
