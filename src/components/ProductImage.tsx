import { imageUrl, type ImageKind } from "@/lib/images/types";

export function ProductImage({
  kind,
  filename,
  name,
  className = "h-16 w-16 rounded-lg object-cover",
}: {
  kind: ImageKind;
  filename?: string | null;
  name: string;
  className?: string;
}) {
  const src = filename && filename !== "demothumb.png" ? imageUrl(kind, filename) : null;
  if (!src) {
    const initial = name.trim().slice(0, 1).toUpperCase() || "?";
    return (
      <span
        className={`inline-flex items-center justify-center bg-accent-soft text-sm font-semibold text-accent ${className}`}
        aria-hidden
      >
        {initial}
      </span>
    );
  }
  return <img src={src} alt={name} className={className} />;
}
