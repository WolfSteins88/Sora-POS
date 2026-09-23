"use client";

import { useState } from "react";
import { formatIdDecimal, parseIdNumber } from "@/lib/format";
import { inputClass } from "@/components/ui";

export function IdNumberInput({
  name,
  defaultValue = 0,
  required,
  placeholder = "0",
  id,
  onValueChange,
}: {
  name?: string;
  defaultValue?: number | string;
  required?: boolean;
  placeholder?: string;
  id?: string;
  onValueChange?: (n: number) => void;
}) {
  const [text, setText] = useState(() => {
    const n = parseIdNumber(defaultValue);
    return n ? formatIdDecimal(n) : "";
  });
  const numeric = parseIdNumber(text);

  function handle(raw: string) {
    const cleaned = raw.replaceAll(/[^\d,]/g, "");
    setText(cleaned);
    onValueChange?.(parseIdNumber(cleaned));
  }

  return (
    <>
      {name ? <input type="hidden" name={name} value={String(numeric)} /> : null}
      <input
        id={id}
        className={inputClass}
        inputMode="decimal"
        autoComplete="off"
        required={required}
        placeholder={placeholder}
        value={text}
        onChange={(e) => handle(e.target.value)}
        onBlur={() => setText(numeric ? formatIdDecimal(numeric) : "")}
        aria-label={name ? `Angka ${name}` : "Angka"}
      />
    </>
  );
}
