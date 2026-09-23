export type ProductQuery = {
  pack?: string;
  q?: string;
  category?: string;
  status?: string;
  sort?: string;
  page?: string;
  id?: string;
  edit?: string;
};

export function productHref(current: ProductQuery, patch: Partial<ProductQuery> = {}) {
  const next = { ...current, ...patch };
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(next)) {
    if (value) params.set(key, value);
  }
  const text = params.toString();
  return text ? `/products?${text}` : "/products";
}
