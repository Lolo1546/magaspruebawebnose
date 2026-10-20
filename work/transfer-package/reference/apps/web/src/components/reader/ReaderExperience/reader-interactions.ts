export function calculateReaderProgress(currentPage: number, totalPages: number) {
  if (totalPages <= 0) return 0;

  return Math.min(100, Math.max(0, (currentPage / totalPages) * 100));
}

export function findCurrentReaderPage(ratios: ReadonlyMap<number, number>) {
  const current = [...ratios.entries()].sort(
    (left, right) => right[1] - left[1],
  )[0];

  return current && current[1] > 0 ? current[0] : undefined;
}

export function getReaderScrollPosition(target: Window | HTMLElement) {
  return "scrollY" in target ? target.scrollY : target.scrollTop;
}

export function normalizeReaderSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLocaleLowerCase("es");
}

export function isEditableReaderTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;

  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    Boolean(target.isContentEditable)
  );
}
