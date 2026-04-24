export function roundToHundred(n: number): number {
  if (!isFinite(n) || n <= 0) return 100;
  return Math.ceil(n / 100) * 100;
}

export function roundToHalf(n: number): number {
  return Math.round(n * 2) / 2;
}

export function formatHours(n: number): string {
  return (
    new Intl.NumberFormat("pl-PL", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 1,
    }).format(n) + "\u00a0h"
  );
}
