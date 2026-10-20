export type ReleaseProgress = {
  chapterReleaseId: string;
  pageNumber: number;
  completedAt: string | null;
};

export function releaseReadLabel(progress?: ReleaseProgress) {
  if (!progress) return "Leer";
  return progress.completedAt ? "✓ Leído" : "Continuar";
}

// A bounded batch, never one request per chapter/publication. No shared cache.
export async function fetchReleaseProgressBatches(
  origin: string,
  releaseIds: readonly string[],
  options: RequestInit,
): Promise<ReleaseProgress[]> {
  const ids = [...new Set(releaseIds)];
  const items: ReleaseProgress[] = [];
  for (let offset = 0; offset < ids.length; offset += 100) {
    const batch = ids.slice(offset, offset + 100);
    const query = new URLSearchParams({ releaseIds: batch.join(",") });
    const response = await fetch(
      `${origin.replace(/\/+$/, "")}/me/release-progress?${query}`,
      { ...options, cache: "no-store" },
    );
    if (!response.ok) throw new Error("No se pudo consultar el progreso.");
    const data: { items: ReleaseProgress[] } = await response.json();
    items.push(...data.items.filter((item) => batch.includes(item.chapterReleaseId)));
  }
  return items;
}
