// Status badge (DESIGN.md §21): pill with a dot and the status text. Color only reinforces the text.

export type BadgeTone = "success" | "warning" | "danger" | "info" | "accent" | "neutral";

const TONES: Record<BadgeTone, { box: string; dot: string }> = {
  success: { box: "border-success-border bg-success-soft text-success", dot: "bg-success" },
  warning: { box: "border-warning-border bg-warning-soft text-warning", dot: "bg-warning" },
  danger: { box: "border-danger-border bg-danger-soft text-danger", dot: "bg-danger" },
  info: { box: "border-info-border bg-info-soft text-info", dot: "bg-info" },
  accent: { box: "border-accent/25 bg-accent-soft text-accent", dot: "bg-accent" },
  neutral: { box: "border-border bg-surface-sunken text-fg-secondary", dot: "bg-muted" },
};

export function Badge({ tone, children, className = "" }: { tone: BadgeTone; children: React.ReactNode; className?: string }) {
  const t = TONES[tone];
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium ${t.box} ${className}`}>
      <span aria-hidden className={`size-1.5 shrink-0 rounded-full ${t.dot}`} />
      {children}
    </span>
  );
}
