// Table toolbar and header icons, from Lucide (the one icon library, DESIGN.md §36). Decorative: every button that
// uses one also has a text label (visible or aria-label).
import {
  Bookmark,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronsUpDown,
  Columns3,
  Download,
  Filter,
  RefreshCw,
  Search,
  X,
  type LucideIcon,
} from "lucide-react";

type IconProps = { className?: string };

const wrap = (Icon: LucideIcon) =>
  function WrappedIcon({ className = "size-4" }: IconProps) {
    return <Icon aria-hidden="true" focusable="false" className={className} strokeWidth={2} />;
  };

export const SearchIcon = wrap(Search);
export const RefreshIcon = wrap(RefreshCw);
export const ColumnsIcon = wrap(Columns3);
export const FilterIcon = wrap(Filter);
export const DownloadIcon = wrap(Download);
export const CloseIcon = wrap(X);
export const ChevronLeftIcon = wrap(ChevronLeft);
export const ChevronRightIcon = wrap(ChevronRight);
export const BookmarkIcon = wrap(Bookmark);

/** Sort indicator: both arrows when unsorted, one when sorted. */
export function SortIcon({ dir, className = "size-3.5" }: IconProps & { dir?: "asc" | "desc" }) {
  const Icon = dir === "asc" ? ChevronUp : dir === "desc" ? ChevronDown : ChevronsUpDown;
  return <Icon aria-hidden="true" focusable="false" className={`${className} ${dir ? "" : "opacity-50"}`} strokeWidth={2} />;
}
