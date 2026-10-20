import {
  listSortValues,
  listVisibilityFilters,
  type ListsSort,
  type ListVisibilityFilter,
  type UserList,
} from "@/data/lists";
import {
  firstSearchParamValue,
  isAllowedValue,
  type AppSearchParams,
} from "@/utils/search-params";

export const listsSortOptions = [
  { label: "Actualización reciente", value: "recent" },
  { label: "Nombre", value: "name" },
  { label: "Cantidad", value: "count" },
] as const;

export type ListsView = "grid" | "list";
export type ListsSearchParams = AppSearchParams;

export type ListsFilters = {
  readonly q: string;
  readonly sort: ListsSort;
  readonly view: ListsView;
  readonly visibility: ListVisibilityFilter;
};

export const defaultListsFilters: ListsFilters = {
  q: "",
  sort: "recent",
  view: "grid",
  visibility: "all",
};

export function parseListsFilters(
  searchParams: ListsSearchParams,
): ListsFilters {
  const rawSort = firstSearchParamValue(searchParams.sort);
  const rawVisibility = firstSearchParamValue(searchParams.visibility);

  return {
    q: (firstSearchParamValue(searchParams.q) ?? "").trim().slice(0, 80),
    sort: isAllowedValue(rawSort, listSortValues) ? rawSort : "recent",
    view: firstSearchParamValue(searchParams.view) === "list" ? "list" : "grid",
    visibility: isAllowedValue(rawVisibility, listVisibilityFilters)
      ? rawVisibility
      : "all",
  };
}

export function getListsStats(lists: readonly UserList[]) {
  return {
    privateCount: lists.filter((list) => list.visibility === "private").length,
    publicCount: lists.filter((list) => list.visibility === "public").length,
    total: lists.length,
    totalManga: lists.reduce((total, list) => total + list.itemCount, 0),
  };
}
