import { PageSkeleton } from "@/components/ui/skeleton";

export default function ItemDetailLoading() {
  return <PageSkeleton rows={8} label="Memuat detail barang…" />;
}
