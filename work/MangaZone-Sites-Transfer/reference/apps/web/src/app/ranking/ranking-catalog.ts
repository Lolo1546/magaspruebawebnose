import { getExploreManga, type ExploreManga } from "@/data/explore";
import {
  getRankingEntries,
  rankingCategories,
  rankingPeriods,
  type RankingCategory,
  type RankingEntry,
  type RankingPeriod,
} from "@/data/ranking";
import {
  createUpdatedSearchHref,
  firstSearchParamValue,
  isAllowedValue,
  type AppSearchParams,
} from "@/utils/search-params";

export type RankingSearchParams = AppSearchParams;

export type RankingFilters = {
  readonly category: RankingCategory;
  readonly period: RankingPeriod;
};

export type RankMovement = {
  readonly amount: number;
  readonly kind: "down" | "new" | "same" | "up";
  readonly label: string;
};

export type RankingItem = {
  readonly entry: RankingEntry;
  readonly manga: ExploreManga;
};

export const defaultRankingFilters: RankingFilters = {
  category: "reads",
  period: "week",
};

export function parseRankingFilters(
  searchParams: RankingSearchParams,
): RankingFilters {
  const category = firstSearchParamValue(searchParams.category);
  const period = firstSearchParamValue(searchParams.period);

  return {
    category: isAllowedValue(category, rankingCategories) ? category : "reads",
    period: isAllowedValue(period, rankingPeriods) ? period : "week",
  };
}

export function getRankMovement(
  rank: number,
  previousRank?: number,
): RankMovement {
  if (previousRank === undefined) {
    return { amount: 0, kind: "new", label: "Nueva entrada" };
  }

  if (previousRank > rank) {
    const amount = previousRank - rank;
    return {
      amount,
      kind: "up",
      label: `Subió ${amount} ${amount === 1 ? "posición" : "posiciones"}`,
    };
  }

  if (previousRank < rank) {
    const amount = rank - previousRank;
    return {
      amount,
      kind: "down",
      label: `Bajó ${amount} ${amount === 1 ? "posición" : "posiciones"}`,
    };
  }

  return { amount: 0, kind: "same", label: "Sin cambios" };
}

export function getRankingItems(filters: RankingFilters): readonly RankingItem[] {
  return getRankingEntries(filters.category, filters.period).flatMap((entry) => {
    const manga = getExploreManga(entry.mangaSlug);
    return manga ? [{ entry, manga }] : [];
  });
}

export function getRankingHref(
  filters: RankingFilters,
  updates: Partial<RankingFilters>,
) {
  const current = new URLSearchParams();
  if (filters.category !== "reads") current.set("category", filters.category);
  if (filters.period !== "week") current.set("period", filters.period);

  return createUpdatedSearchHref(
    "/ranking",
    current.toString(),
    {
      category: updates.category ?? filters.category,
      period: updates.period ?? filters.period,
    },
    defaultRankingFilters,
  );
}
