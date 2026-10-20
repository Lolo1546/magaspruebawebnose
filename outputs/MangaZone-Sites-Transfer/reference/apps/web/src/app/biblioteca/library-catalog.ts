import { type WorkType, type PublicationStatus, type VisualTone } from "@/types/home";
import { firstSearchParamValue, isAllowedValue, type AppSearchParams } from "@/utils/search-params";

export const librarySortOptions = [
  { label: "Actualización reciente", value: "recent" },
  { label: "Título", value: "title" },
] as const;

export type LibrarySort = (typeof librarySortOptions)[number]["value"];
export type LibraryView = "grid" | "list";

export type LibraryStatus = "reading" | "planned" | "completed" | "paused" | "dropped";
export const libraryStatuses: readonly LibraryStatus[] = ["reading", "planned", "completed", "paused", "dropped"];

export type LibraryStatusFilter = "all" | LibraryStatus;
export type LibrarySearchParams = AppSearchParams;

export type LibraryFilters = {
  readonly q: string;
  readonly sort: LibrarySort;
  readonly status: LibraryStatusFilter;
  readonly view: LibraryView;
};

export type LibraryItem = {
  readonly entry: {
    readonly mangaSlug: string;
    readonly status: LibraryStatus;
  };
  readonly manga: {
    readonly id: string;
    readonly slug: string;
    readonly title: string;
    readonly type: WorkType;
    readonly coverTone: VisualTone;
    readonly cover: string;
    readonly genre?: string;
    readonly genres?: readonly string[];
    readonly status?: PublicationStatus;
  };
};

export const defaultLibraryFilters: LibraryFilters = {
  q: "",
  sort: "recent",
  status: "all",
  view: "grid",
};

export function parseLibraryFilters(
  searchParams: LibrarySearchParams,
): LibraryFilters {
  const rawSort = firstSearchParamValue(searchParams.sort);
  const rawStatus = firstSearchParamValue(searchParams.status);

  return {
    q: (firstSearchParamValue(searchParams.q) ?? "").trim().slice(0, 80),
    sort: isAllowedValue(
      rawSort,
      librarySortOptions.map((option) => option.value),
    )
      ? rawSort
      : "recent",
    status: isAllowedValue(rawStatus, libraryStatuses) ? rawStatus : "all",
    view: firstSearchParamValue(searchParams.view) === "list" ? "list" : "grid",
  };
}

