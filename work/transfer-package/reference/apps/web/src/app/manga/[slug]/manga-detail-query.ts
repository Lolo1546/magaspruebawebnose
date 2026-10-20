import type { MangaDetail } from "@/data/manga-detail";

export const mangaDetailTabs = [
  { label: "Capítulos", value: "chapters" },
  { label: "Grupos", value: "groups" },
  { label: "Reseñas", value: "reviews" },
  { label: "Relacionados", value: "related" },
  { label: "Información", value: "info" },
] as const;

export type MangaDetailTab = (typeof mangaDetailTabs)[number]["value"];
export type ChapterSort = "asc" | "desc";

export type MangaDetailQuery = {
  readonly chapterQuery: string;
  readonly chapterSort: ChapterSort;
  readonly group: string;
  readonly tab: MangaDetailTab;
};

export type MangaDetailSearchParams = Record<
  string,
  string | readonly string[] | undefined
>;

function firstValue(value: string | readonly string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function parseMangaDetailQuery(
  searchParams: MangaDetailSearchParams,
  manga?: MangaDetail,
): MangaDetailQuery {
  const rawTab = firstValue(searchParams.tab);
  const rawGroup = firstValue(searchParams.group) ?? "all";
  const validGroup = /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(rawGroup) &&
    (!manga || manga.groups.some((group) => group.slug === rawGroup));

  return {
    chapterQuery: (firstValue(searchParams.chapterQuery) ?? "")
      .trim()
      .slice(0, 60),
    chapterSort: firstValue(searchParams.chapterSort) === "asc" ? "asc" : "desc",
    group: rawGroup === "all" || validGroup ? rawGroup : "all",
    tab: mangaDetailTabs.some((tab) => tab.value === rawTab)
      ? (rawTab as MangaDetailTab)
      : "chapters",
  };
}

export function createMangaDetailHref(slug: string, tab: MangaDetailTab) {
  return tab === "chapters"
    ? `/manga/${slug}`
    : `/manga/${slug}?tab=${tab}`;
}
