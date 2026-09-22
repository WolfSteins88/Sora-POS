export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
      </div>
      {actions}
    </div>
  );
}

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const pad = /\bp-/.test(className) ? "" : "p-4";
  return <div className={`rounded-card border border-line bg-surface shadow-card ${pad} ${className}`}>{children}</div>;
}

export function GlassCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`glass-card p-5 ${className}`}>{children}</div>;
}

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium">{label}</span>
      {children}
      {hint && !error ? <span className="mt-1 block text-xs text-muted">{hint}</span> : null}
      {error ? <span className="mt-1 block text-xs text-danger">{error}</span> : null}
    </label>
  );
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "ok" | "warn" | "accent";
}) {
  const tones = {
    neutral: "bg-chip text-ink",
    ok: "bg-ok-soft text-ok",
    warn: "bg-warn-soft text-warn",
    accent: "bg-accent-soft text-accent",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${tones[tone]}`}>
      {children}
    </span>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-card border border-dashed border-line bg-surface px-4 py-10 text-center">
      <p className="font-semibold">{title}</p>
      {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}

export const inputClass =
  "w-full rounded-xl border border-line bg-white px-3.5 py-3 text-sm outline-none transition duration-ui focus:border-accent focus:ring-2 focus:ring-accent/25";

export const compactInputClass =
  "rounded-xl border border-line bg-white px-2.5 py-1.5 text-sm outline-none transition duration-ui focus:border-accent focus:ring-2 focus:ring-accent/25";

export const ghostButtonClass =
  "btn inline-flex items-center justify-center rounded-xl border border-accent px-4 text-sm font-medium text-accent transition duration-ui hover:bg-accent-soft active:scale-[0.98] disabled:opacity-50";

const rowActionClass =
  "inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-medium transition-all duration-200 active:scale-95";

export const editActionClass = `${rowActionClass} border border-accent/30 bg-accent-soft text-accent hover:bg-accent/15`;

export const neutralActionClass = `${rowActionClass} border border-line bg-white text-ink hover:bg-chip`;

export const dangerActionClass = `${rowActionClass} border border-danger/20 bg-danger/10 text-danger hover:border-danger hover:bg-danger hover:text-white`;

export const tableHeadRowClass =
  "border-b border-line text-left text-xs font-semibold tracking-wide text-muted uppercase";

export const tableHeadCellClass = "px-5 py-3 font-semibold";

export const tableCellClass = "px-5 py-3.5";

export function PrimaryButton({
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`btn inline-flex items-center justify-center rounded-xl bg-accent px-4 text-sm font-semibold text-white transition duration-ui hover:brightness-110 active:scale-[0.98] disabled:opacity-50 ${props.className ?? ""}`}
    >
      {children}
    </button>
  );
}

export function GhostButton({
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button {...props} className={`${ghostButtonClass} ${props.className ?? ""}`}>
      {children}
    </button>
  );
}
