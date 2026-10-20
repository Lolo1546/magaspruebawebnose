import { communitySortValues, type CommunitySort } from "@/data/communities.public";
import { firstSearchParamValue, isAllowedValue, type AppSearchParams } from "@/utils/search-params";

export const communitySortOptions = [
  { label: "Nombre", value: "name" },
  { label: "Más recientes", value: "recent" },
] as const satisfies readonly { label: string; value: CommunitySort }[];

export type CommunitiesView = "grid" | "list";
export type CommunitiesSearchParams = AppSearchParams;
export type CommunitiesFilters = {
  readonly page: number;
  readonly pageSize: number;
  readonly q: string;
  readonly sort: CommunitySort;
  readonly view: CommunitiesView;
};

export const defaultCommunitiesFilters: CommunitiesFilters = { page: 1, pageSize: 20, q: "", sort: "name", view: "grid" };

function parseBoundedInteger(value: string | undefined, fallback: number, maximum?: number): number {
  if (!value || !/^\d+$/.test(value)) return fallback;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) return fallback;
  return maximum === undefined || parsed <= maximum ? parsed : fallback;
}

export function parseCommunitiesFilters(searchParams: CommunitiesSearchParams): CommunitiesFilters {
  const sort = firstSearchParamValue(searchParams.sort);
  return {
    page: parseBoundedInteger(firstSearchParamValue(searchParams.page), 1),
    pageSize: parseBoundedInteger(firstSearchParamValue(searchParams.pageSize), 20, 50),
    q: (firstSearchParamValue(searchParams.q) ?? "").trim().slice(0, 80),
    sort: isAllowedValue(sort, communitySortValues) ? sort : "name",
    view: firstSearchParamValue(searchParams.view) === "list" ? "list" : "grid",
  };
}

export function hasCommunitiesFilters(filters: CommunitiesFilters): boolean {
  return Boolean(filters.q);
}

export function createCommunitiesHref(filters: CommunitiesFilters, updates: Partial<CommunitiesFilters>): string {
  const next = { ...filters, ...updates };
  const params = new URLSearchParams();
  if (next.q) params.set("q", next.q);
  if (next.sort !== "name") params.set("sort", next.sort);
  if (next.page !== 1) params.set("page", String(next.page));
  if (next.pageSize !== 20) params.set("pageSize", String(next.pageSize));
  if (next.view !== "grid") params.set("view", next.view);
  const query = params.toString();
  return query ? `/comunidades?${query}` : "/comunidades";
}
