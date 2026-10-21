"use client";

import { useFormStatus } from "react-dom";
import { buttonPrimary } from "./styles";

export function SubmitButton({
  children,
  pendingLabel,
  className = buttonPrimary,
}: {
  children: React.ReactNode;
  pendingLabel: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} aria-disabled={pending} className={className}>
      {pending ? pendingLabel : children}
    </button>
  );
}
