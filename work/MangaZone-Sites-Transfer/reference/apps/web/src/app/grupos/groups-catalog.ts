import {
  scanlationGroupSortValues,
  type ScanlationGroupSort,
} from "@/data/scanlation-groups";
import {
  firstSearchParamValue,
  isAllowedValue,
  type AppSearchParams,
} from "@/utils/search-params";

export const groupSortOptions = [
  { label: "Nombre", value: "name" },
  { label: "Más recientes", value: "recent" },
] as const satisfies readonly {
  label: string;
  value: ScanlationGroupSort;
}[];

export type GroupsView = "grid" | "list";
export type GroupsSearchParams = AppSearchParams;

export type GroupsFilters = {
  readonly language: string;
  readonly page: number;
  readonly pageSize: number;
  readonly q: string;
  readonly sort: ScanlationGroupSort;
  readonly view: GroupsView;
};

export const defaultGroupsFilters: GroupsFilters = {
  language: "",
  page: 1,
  pageSize: 20,
  q: "",
  sort: "name",
  view: "grid",
};

function parseBoundedInteger(
  value: string | undefined,
  fallback: number,
  maximum?: number,
): number {
  if (!value || !/^\d+$/.test(value)) return fallback;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) return fallback;
  return maximum === undefined || parsed <= maximum ? parsed : fallback;
}

export function parseGroupsFilters(
  searchParams: GroupsSearchParams,
): GroupsFilters {
  const sort = firstSearchParamValue(searchParams.sort);

  return {
    language: (firstSearchParamValue(searchParams.language) ?? "")
      .trim()
      .slice(0, 35),
    page: parseBoundedInteger(firstSearchParamValue(searchParams.page), 1),
    pageSize: parseBoundedInteger(
      firstSearchParamValue(searchParams.pageSize),
      20,
      50,
    ),
    q: (firstSearchParamValue(searchParams.q) ?? "").trim().slice(0, 80),
    sort: isAllowedValue(sort, scanlationGroupSortValues) ? sort : "name",
    view: firstSearchParamValue(searchParams.view) === "list" ? "list" : "grid",
  };
}

export function hasGroupsFilters(filters: GroupsFilters): boolean {
  return Boolean(filters.q || filters.language);
}

export function createGroupsHref(
  filters: GroupsFilters,
  updates: Partial<GroupsFilters>,
): string {
  const next = { ...filters, ...updates };
  const params = new URLSearchParams();

  if (next.q) params.set("q", next.q);
  if (next.language) params.set("language", next.language);
  if (next.sort !== "name") params.set("sort", next.sort);
  if (next.page !== 1) params.set("page", String(next.page));
  if (next.pageSize !== 20) params.set("pageSize", String(next.pageSize));
  if (next.view !== "grid") params.set("view", next.view);

  const query = params.toString();
  return query ? `/grupos?${query}` : "/grupos";
}
