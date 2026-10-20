import {
  exploreCatalog,
  exploreGenres,
  type ExploreGenre,
  type ExploreManga,
} from "@/data/explore";
import type { PublicationStatus, WorkType } from "@/types/home";
import { normalizeSearchText } from "@/utils/normalize-search";

export const EXPLORE_PAGE_SIZE = 12;

export const exploreSortOptions = [
  { label: "Más populares", value: "popular" },
  { label: "Recién añadidos", value: "updated" },
  { label: "Título", value: "title" },
] as const;

export type ExploreSort = (typeof exploreSortOptions)[number]["value"];
export type ExploreView = "grid" | "list";
export type ExploreTypeFilter = "all" | WorkType;
export type ExploreStatusFilter = "all" | PublicationStatus;
export type ExploreGenreFilter = "all" | ExploreGenre;

export type ExploreFilters = {
  genre: ExploreGenreFilter;
  page: number;
  q: string;
  sort: ExploreSort;
  status: ExploreStatusFilter;
  type: ExploreTypeFilter;
  view: ExploreView;
};

export type ExploreSearchParams = Record<
  string,
  string | readonly string[] | undefined
>;

export const defaultExploreFilters: ExploreFilters = {
  genre: "all",
  page: 1,
  q: "",
  sort: "popular",
  status: "all",
  type: "all",
  view: "grid",
};

const workTypes = ["Manga", "Manhwa", "Manhua", "Webtoon", "Novela", "Comic", "One shot", "Doujinshi", "OEL"] as const;
const publicationStatuses = ["En curso", "Completado", "Pausado"] as const;

function firstValue(value: string | readonly string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function isOneOf<T extends string>(
  value: string | undefined,
  options: readonly T[],
): value is T {
  return value !== undefined && options.includes(value as T);
}

export function parseExploreFilters(
  searchParams: ExploreSearchParams,
): ExploreFilters {
  const rawGenre = firstValue(searchParams.genre);
  const rawPage = Number.parseInt(firstValue(searchParams.page) ?? "1", 10);
  const rawSort = firstValue(searchParams.sort);
  const rawStatus = firstValue(searchParams.status);
  const rawType = firstValue(searchParams.type);
  const rawView = firstValue(searchParams.view);

  return {
    genre: isOneOf(rawGenre, exploreGenres) ? rawGenre : "all",
    page: Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1,
    q: (firstValue(searchParams.q) ?? "").trim().slice(0, 80),
    sort: isOneOf(
      rawSort,
      exploreSortOptions.map((option) => option.value),
    )
      ? rawSort
      : "popular",
    status: isOneOf(rawStatus, publicationStatuses) ? rawStatus : "all",
    type: isOneOf(rawType, workTypes) ? rawType : "all",
    view: rawView === "list" ? "list" : "grid",
  };
}

export function filterAndSortExploreCatalog(filters: ExploreFilters) {
  const query = normalizeSearchText(filters.q);

  return exploreCatalog
    .filter((item) => {
      const searchable = normalizeSearchText(
        [item.title, item.type, item.status, ...item.genres].join(" "),
      );

      return (
        (!query || searchable.includes(query)) &&
        (filters.type === "all" || item.type === filters.type) &&
        (filters.status === "all" || item.status === filters.status) &&
        (filters.genre === "all" || item.genres.includes(filters.genre))
      );
    })
    .sort((left, right) => {
      switch (filters.sort) {
        case "title":
          return left.title.localeCompare(right.title, "es");
        case "updated":
          return right.updatedOrder - left.updatedOrder;
        default:
          return right.popularity - left.popularity;
      }
    });
}

export type ExplorePageResult = {
  items: readonly ExploreManga[];
  page: number;
  pageCount: number;
  total: number;
};

export function getExplorePage(filters: ExploreFilters): ExplorePageResult {
  const filtered = filterAndSortExploreCatalog(filters);
  const pageCount = Math.max(1, Math.ceil(filtered.length / EXPLORE_PAGE_SIZE));
  const page = Math.min(filters.page, pageCount);
  const start = (page - 1) * EXPLORE_PAGE_SIZE;

  return {
    items: filtered.slice(start, start + EXPLORE_PAGE_SIZE),
    page,
    pageCount,
    total: filtered.length,
  };
}

export function createExploreHref(
  filters: ExploreFilters,
  overrides: Partial<ExploreFilters> = {},
) {
  const next = { ...filters, ...overrides };
  const params = new URLSearchParams();

  if (next.q) params.set("q", next.q);
  if (next.genre !== "all") params.set("genre", next.genre);
  if (next.status !== "all") params.set("status", next.status);
  if (next.type !== "all") params.set("type", next.type);
  if (next.sort !== "popular") params.set("sort", next.sort);
  if (next.page > 1) params.set("page", String(next.page));
  if (next.view !== "grid") params.set("view", next.view);

  const query = params.toString();
  return query ? `/explorar?${query}` : "/explorar";
}
