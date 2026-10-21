"use client";

import { useEffect, useRef, useState } from "react";
import { formatMoneyInput, normalizeMoneyValue } from "@/lib/money-input";
import { input } from "./styles";

type Props = Omit<React.ComponentProps<"input">, "type" | "value" | "defaultValue" | "name" | "onChange"> & {
  /** Form field name. The server receives the plain number (no thousands dots) under this name. */
  name?: string;
  /** Starting value for an uncontrolled field; a stored decimal such as "15000000.50" is fine. */
  defaultValue?: string | number | null;
  /** Controlled mode: the value kept in the parent. It may be plain or already formatted. */
  value?: string;
  /** Called with the formatted text ("1.500.000,5") whenever the person types. */
  onValueChange?: (formatted: string) => void;
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
  /** Skip the standard field styling, for compact table cells that bring their own `className`. */
  bare?: boolean;
};

/**
 * Rupiah field that inserts thousands dots while typing. Controlled when `value` is given (the value is
 * the formatted text, which parseMoney reads); otherwise it submits the plain number through a hidden
 * input named `name`, so server validation stays unchanged.
 */
export function MoneyInput({ name, defaultValue, value, onValueChange, onChange, bare = false, className = "", ...props }: Props) {
  const controlled = value !== undefined;
  const initial = formatMoneyInput(normalizeMoneyValue(defaultValue)).text;
  const [inner, setInner] = useState(initial);
  const ref = useRef<HTMLInputElement>(null);
  const display = controlled ? formatMoneyInput(normalizeMoneyValue(value)).text : inner;

  // A form reset (React resets forms after an action) puts the field back to its starting value.
  useEffect(() => {
    if (controlled) return;
    const form = ref.current?.form;
    if (!form) return;
    const reset = () => setTimeout(() => setInner(initial), 0);
    form.addEventListener("reset", reset);
    return () => form.removeEventListener("reset", reset);
  }, [controlled, initial]);

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const el = event.target;
    let typed = el.value;
    let caret = el.selectionStart ?? typed.length;
    let next = formatMoneyInput(typed, caret);

    // Backspace/Delete on a dot would be undone by reformatting; remove the neighbouring digit instead.
    const inputType = (event.nativeEvent as InputEvent).inputType;
    if (next.text === display && typed.length < display.length) {
      if (inputType === "deleteContentBackward" && caret > 0) {
        typed = typed.slice(0, caret - 1) + typed.slice(caret);
        caret -= 1;
        next = formatMoneyInput(typed, caret);
      } else if (inputType === "deleteContentForward") {
        typed = typed.slice(0, caret) + typed.slice(caret + 1);
        next = formatMoneyInput(typed, caret);
      }
    }

    // Write the formatted text and caret now so the caret does not jump to the end on re-render.
    el.value = next.text;
    el.setSelectionRange(next.caret, next.caret);
    if (!controlled) setInner(next.text);
    onValueChange?.(next.text);
    onChange?.(event);
  }

  return (
    <>
      <input
        ref={ref}
        inputMode="decimal"
        autoComplete="off"
        {...props}
        type="text"
        value={display}
        onChange={handleChange}
        className={`${bare ? "" : input} tabular-nums ${className}`}
      />
      {name && <input type="hidden" name={name} value={formatMoneyInput(display).raw} />}
    </>
  );
}
