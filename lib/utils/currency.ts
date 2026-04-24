export function formatPLN(amount: number | null | undefined): string {
  if (amount == null) return "—";
  return new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency: "PLN",
  }).format(amount);
}
