"use client";

import { useState } from "react";

export function AccentColorPicker({
  value,
  defaultColor,
}: {
  value: string;
  defaultColor: string;
}) {
  const [color, setColor] = useState(value || defaultColor);
  const [custom, setCustom] = useState(value !== "");

  function apply(next: string, useCustom: boolean) {
    setColor(next);
    setCustom(useCustom);
    const html = document.documentElement;
    if (!useCustom) {
      html.removeAttribute("data-accent");
      html.style.removeProperty("--ui-accent");
    } else {
      html.setAttribute("data-accent", next);
      html.style.setProperty("--ui-accent", next);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <input type="hidden" name="ui_accent_color" value={custom ? color : ""} />
      <label className="relative inline-flex size-16 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-line shadow-card">
        <span className="sr-only">Pilih warna aksen</span>
        <span className="absolute inset-0" style={{ background: color }} />
        <input
          type="color"
          value={color}
          aria-label="Warna aksen"
          className="absolute inset-0 cursor-pointer opacity-0"
          onChange={(e) => apply(e.target.value, true)}
        />
      </label>
      <div>
        <p className="text-sm font-medium">{custom ? color : "Palet mode"}</p>
        <button type="button" className="text-xs underline" onClick={() => apply(defaultColor, false)}>
          Reset
        </button>
      </div>
    </div>
  );
}
