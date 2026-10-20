import type { AdminDirectoryFilters } from "@/data/admin";

export type AdminSearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function parseAdminFilters(
  params: AdminSearchParams,
  options: {
    readonly statuses: readonly string[];
    readonly roles?: readonly string[];
  },
): AdminDirectoryFilters {
  const search = first(params.search)?.trim() || undefined;
  const rawStatus = first(params.status)?.trim();
  const status =
    rawStatus && options.statuses.includes(rawStatus) ? rawStatus : undefined;
  const rawRole = first(params.hasRole)?.trim();
  const hasRole =
    rawRole && options.roles?.includes(rawRole) ? rawRole : undefined;
  const rawPage = Number(first(params.page) ?? "1");
  return {
    search,
    status,
    hasRole,
    page: Number.isSafeInteger(rawPage) && rawPage > 0 ? rawPage : 1,
  };
}
