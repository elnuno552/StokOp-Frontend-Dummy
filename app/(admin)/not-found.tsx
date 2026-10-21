import { NotFoundContent } from "@/components/ui/not-found-content";

// notFound() inside the admin area: rendered within the shell's <main>.
export default function AdminNotFound() {
  return (
    <section className="max-w-lg py-8">
      <NotFoundContent />
    </section>
  );
}
