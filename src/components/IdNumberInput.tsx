"use client";

import { useRef, useState } from "react";
import { formatIdDecimal, parseIdNumber } from "@/lib/format";
import { inputClass } from "@/components/ui";

function groupInt(digits: string) {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function formatTyping(raw: string) {
  const cleaned = raw.replaceAll(/[^\d,]/g, "");
  const comma = cleaned.indexOf(",");
  const intDigits = (comma === -1 ? cleaned : cleaned.slice(0, comma)).replace(/^0+(?=\d)/, "");
  const frac = comma === -1 ? null : cleaned.slice(comma + 1).replaceAll(",", "");
  const grouped = intDigits ? groupInt(intDigits) : "";
  if (frac === null) return grouped;
  return `${grouped || "0"},${frac}`;
}

function caretAfterDigits(formatted: string, digitCount: number) {
  if (digitCount <= 0) return 0;
  let seen = 0;
  for (let i = 0; i < formatted.length; i++) {
    if (/\d/.test(formatted[i])) seen++;
    if (seen === digitCount) return i + 1;
  }
  return formatted.length;
}

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
  const inputRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState(() => {
    const n = parseIdNumber(defaultValue);
    return n ? formatIdDecimal(n) : "";
  });
  const numeric = parseIdNumber(text);

  function handle(raw: string, caret: number) {
    const digitsBefore = raw.slice(0, caret).replaceAll(/[^\d]/g, "").length;
    const next = formatTyping(raw);
    setText(next);
    onValueChange?.(parseIdNumber(next));
    requestAnimationFrame(() => {
      const el = inputRef.current;
      if (!el) return;
      const pos = caretAfterDigits(next, digitsBefore);
      el.setSelectionRange(pos, pos);
    });
  }

  return (
    <>
      {name ? <input type="hidden" name={name} value={String(numeric)} /> : null}
      <input
        ref={inputRef}
        id={id}
        className={inputClass}
        inputMode="decimal"
        autoComplete="off"
        required={required}
        placeholder={placeholder}
        value={text}
        onChange={(e) => handle(e.target.value, e.target.selectionStart ?? e.target.value.length)}
        onBlur={() => setText(numeric ? formatIdDecimal(numeric) : "")}
        aria-label={name ? `Angka ${name}` : "Angka"}
      />
    </>
  );
}
