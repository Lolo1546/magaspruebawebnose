export function formatCompactCount(value: number) {
  const safeValue = Math.max(0, Math.floor(value));

  if (safeValue < 1_000) return String(safeValue);

  const divisor = safeValue >= 1_000_000 ? 1_000_000 : 1_000;
  const suffix = divisor === 1_000_000 ? "M" : "K";
  const rounded = Math.round((safeValue / divisor) * 10) / 10;

  const formatted = Number.isInteger(rounded)
    ? String(rounded)
    : rounded.toFixed(1).replace(".", ",");

  return `${formatted}${suffix}`;
}
