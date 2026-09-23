"use client";

import { useRef, useState } from "react";
import { ProductImage } from "@/components/ProductImage";
import { inputClass } from "@/components/ui";
import type { ImageKind } from "@/lib/images/types";

export function ImageField({
  kind,
  filename,
  name,
  fieldName = "image",
  variant = "inline",
}: {
  kind: ImageKind;
  filename?: string | null;
  name: string;
  fieldName?: string;
  variant?: "inline" | "card";
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");

  function onFile(file: File | undefined) {
    setPreview(file ? URL.createObjectURL(file) : null);
    setFileName(file?.name ?? "");
  }

  const previewNode = preview ? (
    <img src={preview} alt="" className={variant === "card" ? "aspect-square w-full rounded-xl object-cover" : "h-16 w-16 rounded-lg object-cover"} />
  ) : (
    <ProductImage
      kind={kind}
      filename={filename}
      name={name}
      className={variant === "card" ? "aspect-square w-full rounded-xl object-cover" : "h-16 w-16 rounded-lg object-cover"}
    />
  );

  if (variant === "card") {
    return (
      <div className="flex h-full flex-col">
        {previewNode}
        <p className="mt-2 text-xs text-muted">JPG, PNG, atau WEBP. Maksimal 2MB.</p>
        <div className="mt-auto pt-3">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="inline-flex w-full items-center justify-center rounded-full border border-line px-3 py-2 text-sm font-medium"
          >
            <span className="truncate">{fileName || "Pilih foto"}</span>
          </button>
        </div>
        <input
          ref={inputRef}
          name={fieldName}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={(event) => onFile(event.target.files?.[0])}
        />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      {previewNode}
      <input
        name={fieldName}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className={inputClass}
        onChange={(event) => onFile(event.target.files?.[0])}
      />
    </div>
  );
}
