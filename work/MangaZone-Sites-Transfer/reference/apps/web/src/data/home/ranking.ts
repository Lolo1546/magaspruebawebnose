import type {
  RankingItem,
  RankingPeriod,
  VisualTone,
  WorkType,
} from "@/types/home";

const cover = "/demo/cover-placeholder.svg";

type CatalogEntry = {
  slug: string;
  title: string;
  type: WorkType;
  coverTone: VisualTone;
};

const rankingCatalog = {
  solo: { slug: "solo-leveling", title: "Solo Leveling", type: "Manhwa", coverTone: "blue" },
  onePiece: { slug: "one-piece", title: "One Piece", type: "Manga", coverTone: "crimson" },
  jujutsu: { slug: "jujutsu-kaisen", title: "Jujutsu Kaisen", type: "Manga", coverTone: "violet" },
  chainsaw: { slug: "chainsaw-man", title: "Chainsaw Man", type: "Manga", coverTone: "gold" },
  dandadan: { slug: "dandadan", title: "Dandadan", type: "Manga", coverTone: "violet" },
  blueLock: { slug: "blue-lock", title: "Blue Lock", type: "Manga", coverTone: "blue" },
  omniscient: { slug: "omniscient-readers-viewpoint", title: "Omniscient Reader", type: "Manhwa", coverTone: "crimson" },
  tower: { slug: "tower-of-god", title: "Tower of God", type: "Manhwa", coverTone: "green" },
  spyFamily: { slug: "spy-x-family", title: "Spy × Family", type: "Manga", coverTone: "gold" },
  vinland: { slug: "vinland-saga", title: "Vinland Saga", type: "Manga", coverTone: "green" },
} satisfies Record<string, CatalogEntry>;

type RankingKey = keyof typeof rankingCatalog;

type RankingMetric = {
  key: RankingKey;
  chapter: number;
  readersLabel: string;
  score: number;
  trendChange: number;
};

function buildRanking(
  period: RankingPeriod,
  metrics: readonly RankingMetric[],
): readonly RankingItem[] {
  return metrics.map(({ key, ...metric }) => ({
    ...rankingCatalog[key],
    ...metric,
    id: `ranking-${period}-${key}`,
    cover,
  }));
}

export const rankingPeriodLabels: Record<RankingPeriod, string> = {
  week: "Semana",
  month: "Mes",
  all: "Total",
};

export const rankingByPeriod: Record<
  RankingPeriod,
  readonly RankingItem[]
> = {
  week: buildRanking("week", [
    { key: "solo", chapter: 200, readersLabel: "214 mil", score: 9.4, trendChange: 4 },
    { key: "onePiece", chapter: 1113, readersLabel: "198 mil", score: 9.3, trendChange: 2 },
    { key: "jujutsu", chapter: 271, readersLabel: "156 mil", score: 9.0, trendChange: 1 },
    { key: "dandadan", chapter: 205, readersLabel: "142 mil", score: 8.9, trendChange: 3 },
    { key: "chainsaw", chapter: 211, readersLabel: "139 mil", score: 8.8, trendChange: -1 },
    { key: "blueLock", chapter: 311, readersLabel: "121 mil", score: 8.7, trendChange: 0 },
    { key: "omniscient", chapter: 268, readersLabel: "118 mil", score: 9.1, trendChange: 2 },
    { key: "tower", chapter: 652, readersLabel: "103 mil", score: 8.8, trendChange: -2 },
    { key: "spyFamily", chapter: 118, readersLabel: "97 mil", score: 8.9, trendChange: 1 },
    { key: "vinland", chapter: 220, readersLabel: "92 mil", score: 9.1, trendChange: 0 },
  ]),
  month: buildRanking("month", [
    { key: "onePiece", chapter: 1113, readersLabel: "740 mil", score: 9.3, trendChange: 1 },
    { key: "solo", chapter: 200, readersLabel: "702 mil", score: 9.4, trendChange: -1 },
    { key: "omniscient", chapter: 268, readersLabel: "589 mil", score: 9.1, trendChange: 4 },
    { key: "jujutsu", chapter: 271, readersLabel: "551 mil", score: 9.0, trendChange: 0 },
    { key: "blueLock", chapter: 311, readersLabel: "486 mil", score: 8.7, trendChange: 2 },
    { key: "chainsaw", chapter: 211, readersLabel: "452 mil", score: 8.8, trendChange: -2 },
    { key: "dandadan", chapter: 205, readersLabel: "430 mil", score: 8.9, trendChange: 1 },
    { key: "tower", chapter: 652, readersLabel: "398 mil", score: 8.8, trendChange: 0 },
    { key: "vinland", chapter: 220, readersLabel: "352 mil", score: 9.1, trendChange: 2 },
    { key: "spyFamily", chapter: 118, readersLabel: "318 mil", score: 8.9, trendChange: -1 },
  ]),
  all: buildRanking("all", [
    { key: "onePiece", chapter: 1113, readersLabel: "4,8 M", score: 9.3, trendChange: 0 },
    { key: "jujutsu", chapter: 271, readersLabel: "3,9 M", score: 9.0, trendChange: 1 },
    { key: "solo", chapter: 200, readersLabel: "3,7 M", score: 9.4, trendChange: 1 },
    { key: "chainsaw", chapter: 211, readersLabel: "3,1 M", score: 8.8, trendChange: 0 },
    { key: "spyFamily", chapter: 118, readersLabel: "2,8 M", score: 8.9, trendChange: 2 },
    { key: "vinland", chapter: 220, readersLabel: "2,5 M", score: 9.1, trendChange: -1 },
    { key: "tower", chapter: 652, readersLabel: "2,3 M", score: 8.8, trendChange: 0 },
    { key: "omniscient", chapter: 268, readersLabel: "2,1 M", score: 9.1, trendChange: 3 },
    { key: "blueLock", chapter: 311, readersLabel: "1,9 M", score: 8.7, trendChange: 1 },
    { key: "dandadan", chapter: 205, readersLabel: "1,7 M", score: 8.9, trendChange: 2 },
  ]),
};
