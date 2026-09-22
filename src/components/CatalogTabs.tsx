import Link from "next/link";

export function CatalogTabs({
  basePath,
  pack,
}: {
  basePath: string;
  pack: "fnb" | "retail";
}) {
  const tabs = [
    { value: "fnb" as const, label: "F&B" },
    { value: "retail" as const, label: "Retail" },
  ];
  return (
    <div className="mb-4 inline-flex rounded-xl border border-line bg-white p-1">
      {tabs.map((tab) => {
        const active = pack === tab.value;
        return (
          <Link
            key={tab.value}
            href={`${basePath}?pack=${tab.value}`}
            aria-current={active ? "page" : undefined}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition duration-ui ${
              active ? "bg-accent text-white" : "text-muted hover:bg-chip hover:text-ink"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
