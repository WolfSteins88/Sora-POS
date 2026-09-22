"use client";

import { useState } from "react";
import { formatIdNumber, parseIdNumber } from "@/lib/format";
import { inputClass } from "@/components/ui";

export function MoneyInput({
  name,
  defaultValue = 0,
  value,
  onValueChange,
  required,
  placeholder = "0",
  id,
  className = "",
}: {
  name?: string;
  defaultValue?: number | string;
  value?: number;
  onValueChange?: (n: number) => void;
  required?: boolean;
  placeholder?: string;
  id?: string;
  className?: string;
}) {
  const [amount, setAmount] = useState(() => parseIdNumber(value ?? defaultValue));
  const numeric = value !== undefined ? parseIdNumber(value) : amount;
  const display = numeric ? formatIdNumber(numeric) : "";

  function handle(raw: string) {
    const digits = raw.replaceAll(/[^\d]/g, "");
    const n = digits ? Number(digits) : 0;
    const parsed = Number.isFinite(n) ? n : 0;
    setAmount(parsed);
    onValueChange?.(parsed);
  }

  return (
    <div className="relative">
      {name ? <input type="hidden" name={name} value={String(numeric)} /> : null}
      <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted">Rp</span>
      <input
        id={id}
        className={`${inputClass} pl-9 ${className}`}
        inputMode="numeric"
        autoComplete="off"
        required={required}
        placeholder={placeholder}
        value={display}
        onChange={(e) => handle(e.target.value)}
        aria-label={name ? `Nilai ${name}` : "Nilai rupiah"}
      />
    </div>
  );
}
