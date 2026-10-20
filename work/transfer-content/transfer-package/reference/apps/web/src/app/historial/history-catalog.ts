import {
  firstSearchParamValue,
  isAllowedValue,
  type AppSearchParams,
} from "@/utils/search-params";

export const historySortOptions = [
  { label: "Más reciente", value: "recent" },
  { label: "Más antiguo", value: "oldest" },
] as const;

export const historyPeriodOptions = [
  { label: "Todo el historial", value: "all" },
  { label: "Hoy", value: "today" },
  { label: "Últimos 7 días", value: "week" },
  { label: "Este mes", value: "month" },
] as const;

export type HistorySort = (typeof historySortOptions)[number]["value"];
export type HistoryPeriodFilter = (typeof historyPeriodOptions)[number]["value"];
export type HistorySearchParams = AppSearchParams;

export type HistoryFilters = {
  readonly period: HistoryPeriodFilter;
  readonly q: string;
  readonly sort: HistorySort;
  readonly page: number;
  readonly from?: string;
  readonly to?: string;
};

export const defaultHistoryFilters: HistoryFilters = {
  period: "all",
  q: "",
  sort: "recent",
  page: 1,
};

export function parseHistoryFilters(
  searchParams: HistorySearchParams,
): HistoryFilters {
  const rawPeriod = firstSearchParamValue(searchParams.period);
  const rawSort = firstSearchParamValue(searchParams.sort);

  const rawPage = firstSearchParamValue(searchParams.page);
  const page = rawPage && !isNaN(parseInt(rawPage, 10)) ? Math.max(1, parseInt(rawPage, 10)) : 1;

  const from = firstSearchParamValue(searchParams.from);
  const to = firstSearchParamValue(searchParams.to);

  return {
    period: isAllowedValue(
      rawPeriod,
      historyPeriodOptions.map((option) => option.value),
    )
      ? rawPeriod
      : "all",
    q: (firstSearchParamValue(searchParams.q) ?? "").trim().slice(0, 80),
    sort: isAllowedValue(
      rawSort,
      historySortOptions.map((option) => option.value),
    )
      ? rawSort
      : "recent",
    page,
    from: from || undefined,
    to: to || undefined,
  };
}

// getHistoryItems and groupHistoryItems removed as part of Phase 3B.4.3B.2
