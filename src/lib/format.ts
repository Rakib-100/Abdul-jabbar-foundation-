const money = new Intl.NumberFormat("en-BD", {
  style: "currency",
  currency: "BDT",
  currencyDisplay: "narrowSymbol",
  maximumFractionDigits: 0,
});

const date = new Intl.DateTimeFormat("bn-BD", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

export function formatCurrency(amount: number | null | undefined) {
  return amount == null ? "—" : money.format(amount);
}

export function formatDate(value: string | null | undefined) {
  if (!value) return "তারিখ উল্লেখ নেই";
  const parsed = new Date(`${value.slice(0, 10)}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? "তারিখ উল্লেখ নেই" : date.format(parsed);
}
