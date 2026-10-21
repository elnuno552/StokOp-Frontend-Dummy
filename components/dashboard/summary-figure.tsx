import { panel } from "@/components/ui/styles";

// One real count with the context needed to act on it. `alert` marks a number
// that asks for attention (text states why, color only reinforces it).
export function SummaryFigure({
  label,
  value,
  display,
  detail,
  alert = false,
}: {
  label: string;
  value: number;
  /** Text shown instead of the plain number (e.g. a compact rupiah amount). */
  display?: string;
  detail?: React.ReactNode;
  alert?: boolean;
}) {
  return (
    <div className={`${panel} flex flex-col gap-1 p-3 sm:p-4`}>
      <p className="text-sm font-medium text-muted">{label}</p>
      <p className={`text-3xl font-bold tabular-nums tracking-tight ${alert ? "text-danger" : "text-fg"}`}>
        {display ?? value.toLocaleString("id-ID")}
      </p>
      {detail && <p className="text-sm tabular-nums text-muted">{detail}</p>}
    </div>
  );
}
