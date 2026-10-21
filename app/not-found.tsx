import { NotFoundContent } from "@/components/ui/not-found-content";

// Unmatched URLs: rendered without the admin shell.
export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-4 py-16">
      <NotFoundContent />
    </main>
  );
}
