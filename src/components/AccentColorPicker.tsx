"use client";

import { useState } from "react";

const PRESETS = [
  { label: "Krem", hex: "#c4a574" },
  { label: "Hijau", hex: "#6f8f72" },
  { label: "Biru", hex: "#6e8b9a" },
  { label: "Ungu", hex: "#b0899a" },
] as const;

function initialSelection(value: string, defaultColor: string) {
  const hex = value.trim().toLowerCase();
  if (!hex || hex === defaultColor.toLowerCase()) return "";
  return hex;
}

export function AccentColorPicker({
  value,
  defaultColor,
}: {
  value: string;
  defaultColor: string;
}) {
  const [selected, setSelected] = useState(() => initialSelection(value, defaultColor));
  const defaultName = defaultColor.toLowerCase() === "#0ea5e9" ? "Biru" : "Cokelat";
  const extra = selected && !PRESETS.some((preset) => preset.hex === selected) ? selected : "";

  function apply(next: string) {
    setSelected(next);
    const html = document.documentElement;
    if (!next) {
      html.removeAttribute("data-accent");
      html.style.removeProperty("--ui-accent");
    } else {
      html.setAttribute("data-accent", next);
      html.style.setProperty("--ui-accent", next);
    }
  }

  const choices = [
    { label: defaultName, caption: "Default", hex: defaultColor, stored: "" },
    ...PRESETS.map((preset) => ({ label: preset.label, caption: "", hex: preset.hex, stored: preset.hex })),
    ...(extra ? [{ label: extra, caption: "", hex: extra, stored: extra }] : []),
  ];

  return (
    <div
      className="grid w-full items-start gap-2"
      style={{ gridTemplateColumns: `repeat(${choices.length}, minmax(0, 1fr))` }}
    >
      <input type="hidden" name="ui_accent_color" value={selected} />
      {choices.map((choice) => {
        const active = selected === choice.stored;
        return (
          <button
            key={choice.stored || "default"}
            type="button"
            onClick={() => apply(choice.stored)}
            className="flex min-w-0 flex-col items-center"
            aria-pressed={active}
            aria-label={choice.caption ? `${choice.label}, ${choice.caption}` : choice.label}
          >
            <span
              className={`size-10 rounded-full border border-line ${active ? "ring-2 ring-accent ring-offset-2" : ""}`}
              style={{ background: choice.hex }}
            />
            <span className={`mt-2 min-h-8 text-center text-xs leading-4 ${active ? "font-medium text-ink" : "invisible"}`}>
              {choice.label}
              <span className="block text-[11px] font-normal text-muted">{choice.caption || "\u00a0"}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
