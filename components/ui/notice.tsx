const styles = {
  success: "border-success-border bg-success-soft text-success",
  error: "border-danger-border bg-danger-soft text-danger",
  info: "border-info-border bg-info-soft text-info",
};

/** Inline message. Meaning is carried by the text, not only the color. */
export function Notice({
  tone,
  children,
}: {
  tone: keyof typeof styles;
  children: React.ReactNode;
}) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`rounded-md border px-4 py-3 text-sm font-medium ${styles[tone]}`}
    >
      {children}
    </div>
  );
}
