"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { input } from "./styles";

/** Password field with a show/hide toggle. Takes the same props as a plain <input>. */
export function PasswordInput({ className = "", ...props }: Omit<React.ComponentProps<"input">, "type">) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative mt-1.5">
      <input {...props} type={visible ? "text" : "password"} className={`${input} pr-11 ${className}`} />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
        aria-pressed={visible}
        className="absolute inset-y-0 right-0 inline-flex w-11 items-center justify-center rounded-r-md text-fg-secondary transition-colors duration-150 hover:text-fg"
      >
        {visible ? <EyeOff aria-hidden className="size-[18px]" /> : <Eye aria-hidden className="size-[18px]" />}
      </button>
    </div>
  );
}
