export const rankingCategories = ["reads", "rating", "saved", "growth"] as const;
export const rankingPeriods = ["week", "month", "all"] as const;

export type RankingCategory = (typeof rankingCategories)[number];
export type RankingPeriod = (typeof rankingPeriods)[number];

export type RankingEntry = {
  readonly mangaSlug: string;
  readonly previousRank?: number;
  readonly rank: number;
  readonly score: number;
};

type RankingSnapshotSeed = {
  readonly current: readonly string[];
  readonly previous: readonly string[];
};

export const rankingCategoryLabels: Readonly<Record<RankingCategory, string>> = {
  growth: "Mayor crecimiento",
  rating: "Mejor valorados",
  reads: "Más leídos",
  saved: "Más guardados",
};

export const rankingPeriodLabels: Readonly<Record<RankingPeriod, string>> = {
  all: "Todo el tiempo",
  month: "Este mes",
  week: "Esta semana",
};

const snapshotSeeds = {
  reads: {
    week: {
      current: ["solo-leveling", "one-piece", "frieren", "omniscient-reader", "dandadan", "blue-lock", "witch-hat-atelier", "summer-time-rendering"],
      previous: ["one-piece", "solo-leveling", "omniscient-reader", "frieren", "blue-lock", "dandadan", "summer-time-rendering", "witch-hat-atelier"],
    },
    month: {
      current: ["one-piece", "solo-leveling", "omniscient-reader", "frieren", "blue-lock", "dandadan", "summer-time-rendering", "witch-hat-atelier"],
      previous: ["solo-leveling", "one-piece", "frieren", "omniscient-reader", "dandadan", "blue-lock", "witch-hat-atelier", "summer-time-rendering"],
    },
    all: {
      current: ["one-piece", "solo-leveling", "frieren", "dandadan", "omniscient-reader", "blue-lock", "the-horizon", "bastard"],
      previous: ["one-piece", "solo-leveling", "dandadan", "frieren", "blue-lock", "omniscient-reader", "bastard", "the-horizon"],
    },
  },
  rating: {
    week: {
      current: ["solo-leveling", "one-piece", "frieren", "omniscient-reader", "witch-hat-atelier", "the-horizon", "legend-of-the-northern-blade", "dandadan"],
      previous: ["frieren", "solo-leveling", "one-piece", "witch-hat-atelier", "omniscient-reader", "dandadan", "the-horizon", "legend-of-the-northern-blade"],
    },
    month: {
      current: ["frieren", "solo-leveling", "one-piece", "witch-hat-atelier", "omniscient-reader", "the-horizon", "legend-of-the-northern-blade", "dandadan"],
      previous: ["solo-leveling", "frieren", "one-piece", "omniscient-reader", "witch-hat-atelier", "legend-of-the-northern-blade", "dandadan", "the-horizon"],
    },
    all: {
      current: ["solo-leveling", "one-piece", "frieren", "omniscient-reader", "witch-hat-atelier", "the-horizon", "legend-of-the-northern-blade", "dandadan"],
      previous: ["solo-leveling", "one-piece", "frieren", "witch-hat-atelier", "omniscient-reader", "the-horizon", "dandadan", "legend-of-the-northern-blade"],
    },
  },
  saved: {
    week: {
      current: ["frieren", "solo-leveling", "witch-hat-atelier", "one-piece", "dandadan", "seasons-of-blossom", "blue-lock", "omniscient-reader"],
      previous: ["solo-leveling", "frieren", "one-piece", "witch-hat-atelier", "blue-lock", "dandadan", "omniscient-reader", "seasons-of-blossom"],
    },
    month: {
      current: ["solo-leveling", "frieren", "one-piece", "witch-hat-atelier", "omniscient-reader", "dandadan", "blue-lock", "seasons-of-blossom"],
      previous: ["frieren", "solo-leveling", "witch-hat-atelier", "one-piece", "dandadan", "omniscient-reader", "seasons-of-blossom", "blue-lock"],
    },
    all: {
      current: ["one-piece", "solo-leveling", "frieren", "witch-hat-atelier", "dandadan", "omniscient-reader", "blue-lock", "seasons-of-blossom"],
      previous: ["one-piece", "frieren", "solo-leveling", "dandadan", "witch-hat-atelier", "blue-lock", "omniscient-reader", "seasons-of-blossom"],
    },
  },
  growth: {
    week: {
      current: ["the-gods-game", "spirit-fingers", "nan-hao-and-shang-feng", "summer-time-rendering", "dandadan", "blue-lock", "orange", "song-of-the-long-march"],
      previous: ["dandadan", "the-gods-game", "blue-lock", "summer-time-rendering", "nan-hao-and-shang-feng", "song-of-the-long-march", "spirit-fingers", "the-horizon"],
    },
    month: {
      current: ["spirit-fingers", "the-gods-game", "dandadan", "nan-hao-and-shang-feng", "blue-lock", "summer-time-rendering", "song-of-the-long-march", "orange"],
      previous: ["the-gods-game", "dandadan", "spirit-fingers", "blue-lock", "summer-time-rendering", "nan-hao-and-shang-feng", "orange", "song-of-the-long-march"],
    },
    all: {
      current: ["solo-leveling", "omniscient-reader", "dandadan", "blue-lock", "witch-hat-atelier", "spirit-fingers", "the-gods-game", "nan-hao-and-shang-feng"],
      previous: ["solo-leveling", "dandadan", "omniscient-reader", "witch-hat-atelier", "blue-lock", "the-gods-game", "nan-hao-and-shang-feng", "spirit-fingers"],
    },
  },
} as const satisfies Readonly<
  Record<RankingCategory, Readonly<Record<RankingPeriod, RankingSnapshotSeed>>>
>;

export function getRankingEntries(
  category: RankingCategory,
  period: RankingPeriod,
): readonly RankingEntry[] {
  const seed: RankingSnapshotSeed = snapshotSeeds[category][period];
  const periodAdjustment = period === "week" ? 0 : period === "month" ? 1 : 2;

  return seed.current.map((mangaSlug, index) => {
    const previousIndex = seed.previous.indexOf(mangaSlug);

    return {
      mangaSlug,
      previousRank: previousIndex === -1 ? undefined : previousIndex + 1,
      rank: index + 1,
      score: 98 - index * 3 - periodAdjustment,
    };
  });
}
