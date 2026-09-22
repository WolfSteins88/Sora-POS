export function money(amount: number | string, currency = "Rp") {
  return `${currency} ${formatIdNumber(amount)}`;
}

export function num(value: number | string | null | undefined) {
  return parseIdNumber(value);
}

/** 5000000 or "5.000.000" or "5.000.000,50" → number. "28000.00" from SQL stays 28000. "500.000" is 500000. */
export function parseIdNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") return 0;
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const raw = String(value).trim().replaceAll(/\s/g, "");
  if (!raw) return 0;
  if (raw.includes(",")) {
    const n = Number(raw.replaceAll(".", "").replace(",", "."));
    return Number.isFinite(n) ? n : 0;
  }
  const dots = raw.match(/\./g) || [];
  if (dots.length > 1) {
    const n = Number(raw.replaceAll(".", ""));
    return Number.isFinite(n) ? n : 0;
  }
  if (dots.length === 1) {
    const frac = raw.split(".")[1] ?? "";
    if (frac.length === 3) {
      const n = Number(raw.replaceAll(".", ""));
      return Number.isFinite(n) ? n : 0;
    }
  }
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}

function groupThousands(intPart: string) {
  const neg = intPart.startsWith("-");
  const digits = neg ? intPart.slice(1) : intPart;
  const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return neg ? `-${grouped}` : grouped;
}

export function formatIdNumber(value: number | string | null | undefined) {
  const n = Math.round(parseIdNumber(value));
  return groupThousands(String(n));
}

export function formatIdDecimal(value: number | string | null | undefined, maxFrac = 3) {
  const n = parseIdNumber(value);
  const fixed = n.toFixed(maxFrac);
  const [intPart, fracPart = ""] = fixed.split(".");
  const frac = fracPart.replace(/0+$/, "");
  const grouped = groupThousands(intPart);
  return frac ? `${grouped},${frac}` : grouped;
}
