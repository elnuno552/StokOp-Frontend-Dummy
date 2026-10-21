import { Inbox } from "lucide-react";
import { panel } from "./styles";

/**
 * Shown instead of an empty table (DESIGN.md §27): what is missing, why, and what to do next. `bare` drops the panel
 * frame when the state sits inside an existing panel or table cell.
 */
export function EmptyState({
  title,
  description,
  action,
  bare = false,
}: {
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  bare?: boolean;
}) {
  return (
    <div className={`flex flex-col items-center px-5 py-10 text-center ${bare ? "" : panel}`}>
      <Inbox aria-hidden className="mb-3 size-8 text-disabled" strokeWidth={1.5} />
      <p className="text-base font-semibold text-fg">{title}</p>
      {description && <p className="mt-1 max-w-md text-sm text-muted">{description}</p>}
      {action && <div className="mt-4 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}
