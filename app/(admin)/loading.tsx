import { PageSkeleton } from "@/components/ui/skeleton";

// Covers every admin page without its own loading state (including Beranda).
export default function AdminLoading() {
  return <PageSkeleton />;
}
