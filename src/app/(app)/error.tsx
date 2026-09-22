"use client";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-6">
      <h1 className="text-lg font-semibold">Terjadi kesalahan</h1>
      <p className="mt-2 text-sm text-muted">{error.message}</p>
      <button type="button" className="btn mt-4 rounded-lg border px-4 text-sm" onClick={reset}>
        Coba lagi
      </button>
    </div>
  );
}
