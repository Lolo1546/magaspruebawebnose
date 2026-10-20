import { READER_PAGE_COUNT } from "@/data/reader";

export const historyPeriods = ["today", "week", "month", "older"] as const;

export type HistoryPeriod = (typeof historyPeriods)[number];

export type HistoryEntry = {
  readonly chapter: number;
  readonly groupLabel: "Anterior" | "Ayer" | "Esta semana" | "Este mes" | "Hoy";
  readonly id: string;
  readonly mangaSlug: string;
  readonly page: number;
  readonly period: HistoryPeriod;
  readonly progressPercent: number;
  readonly readOrder: number;
  readonly timeLabel: string;
};

function progressForPage(page: number) {
  return Math.round((page / READER_PAGE_COUNT) * 100);
}

export const historyEntries: readonly HistoryEntry[] = [
  { id: "history-01", mangaSlug: "solo-leveling", chapter: 145, page: 6, progressPercent: progressForPage(6), timeLabel: "Hace 18 min", groupLabel: "Hoy", period: "today", readOrder: 9 },
  { id: "history-02", mangaSlug: "one-piece", chapter: 1090, page: 4, progressPercent: progressForPage(4), timeLabel: "Hace 2 h", groupLabel: "Hoy", period: "today", readOrder: 8 },
  { id: "history-03", mangaSlug: "dandadan", chapter: 118, page: 7, progressPercent: progressForPage(7), timeLabel: "Ayer, 22:14", groupLabel: "Ayer", period: "week", readOrder: 7 },
  { id: "history-04", mangaSlug: "blue-lock", chapter: 183, page: 2, progressPercent: progressForPage(2), timeLabel: "Ayer, 18:30", groupLabel: "Ayer", period: "week", readOrder: 6 },
  { id: "history-05", mangaSlug: "frieren", chapter: 80, page: 5, progressPercent: progressForPage(5), timeLabel: "Hace 3 días", groupLabel: "Esta semana", period: "week", readOrder: 5 },
  { id: "history-06", mangaSlug: "omniscient-reader", chapter: 170, page: 6, progressPercent: progressForPage(6), timeLabel: "Hace 5 días", groupLabel: "Esta semana", period: "week", readOrder: 4 },
  { id: "history-07", mangaSlug: "orange", chapter: 31, page: 8, progressPercent: progressForPage(8), timeLabel: "Hace 2 semanas", groupLabel: "Este mes", period: "month", readOrder: 3 },
  { id: "history-08", mangaSlug: "the-horizon", chapter: 21, page: 8, progressPercent: progressForPage(8), timeLabel: "Hace 3 semanas", groupLabel: "Este mes", period: "month", readOrder: 2 },
  { id: "history-09", mangaSlug: "bastard", chapter: 35, page: 3, progressPercent: progressForPage(3), timeLabel: "Hace 1 mes", groupLabel: "Anterior", period: "older", readOrder: 1 },
] as const;
