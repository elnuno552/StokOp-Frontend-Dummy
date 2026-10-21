// Shared class strings so controls look and behave the same everywhere (DESIGN.md §13, §16, §17).
// Radius: 6px controls (rounded-md), 8px panels (rounded-lg), 10px dialogs, pills for badges.

const buttonBase =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-4 text-sm font-medium transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-60 sm:min-h-10";

/** Main action of a page or form. */
export const buttonPrimary = `${buttonBase} bg-accent text-on-accent hover:bg-accent-hover active:bg-accent-active`;

/** Alternative actions: Batal, Kembali, Ekspor, Reset. */
export const buttonSecondary = `${buttonBase} border border-border-strong bg-surface text-fg hover:bg-surface-sunken`;

/** Opens a destructive action (the confirmation then uses buttonDangerSolid). Never the default primary action. */
export const buttonDanger = `${buttonBase} border border-danger-border bg-surface text-danger hover:bg-danger-soft`;

/** Confirms a destructive action inside a dialog. */
export const buttonDangerSolid = `${buttonBase} bg-danger text-white hover:bg-red-800`;

export const input =
  "block min-h-11 w-full rounded-md border border-border-strong bg-surface px-3 text-sm text-fg placeholder:text-disabled aria-invalid:border-danger disabled:bg-surface-sunken disabled:text-disabled sm:min-h-10";

export const label = "block text-sm font-medium text-fg";

export const hint = "mt-1 text-sm text-muted";

export const fieldError = "mt-1 text-sm font-medium text-danger";

export const panel = "rounded-lg border border-border bg-surface";

export const link = "font-medium text-accent underline-offset-2 hover:underline";

/** Title inside a panel (16px / 600). */
export const cardTitle = "text-base font-semibold text-fg";

/** Section heading on a page (18px / 600). */
export const sectionTitle = "text-lg font-semibold text-fg";
