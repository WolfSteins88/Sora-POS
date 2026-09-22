"use client";

import { useState } from "react";
import { ProductImage } from "@/components/ProductImage";
import { inputClass } from "@/components/ui";
import type { ImageKind } from "@/lib/images/types";

export function ImageField({
  kind,
  filename,
  name,
  fieldName = "image",
}: {
  kind: ImageKind;
  filename?: string | null;
  name: string;
  fieldName?: string;
}) {
  const [preview, setPreview] = useState<string | null>(null);
  return (
    <div className="flex items-center gap-3">
      {preview ? (
        <img src={preview} alt="" className="h-16 w-16 rounded-lg object-cover" />
      ) : (
        <ProductImage kind={kind} filename={filename} name={name} />
      )}
      <input
        name={fieldName}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className={inputClass}
        onChange={(e) => {
          const file = e.target.files?.[0];
          setPreview(file ? URL.createObjectURL(file) : null);
        }}
      />
    </div>
  );
}
