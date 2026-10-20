export const libraryStatuses = [
  "reading",
  "planned",
  "completed",
  "paused",
  "dropped",
] as const;

export type LibraryStatus = (typeof libraryStatuses)[number];

export type LibraryEntry = {
  readonly addedOrder: number;
  readonly currentChapter: number;
  readonly mangaSlug: string;
  readonly status: LibraryStatus;
  readonly updatedOrder: number;
};

export const libraryEntries: readonly LibraryEntry[] = [
  { mangaSlug: "solo-leveling", status: "reading", currentChapter: 145, addedOrder: 9, updatedOrder: 9 },
  { mangaSlug: "one-piece", status: "reading", currentChapter: 1090, addedOrder: 8, updatedOrder: 8 },
  { mangaSlug: "dandadan", status: "reading", currentChapter: 118, addedOrder: 7, updatedOrder: 7 },
  { mangaSlug: "frieren", status: "planned", currentChapter: 0, addedOrder: 6, updatedOrder: 4 },
  { mangaSlug: "witch-hat-atelier", status: "planned", currentChapter: 0, addedOrder: 5, updatedOrder: 6 },
  { mangaSlug: "blue-lock", status: "paused", currentChapter: 183, addedOrder: 4, updatedOrder: 5 },
  { mangaSlug: "the-horizon", status: "completed", currentChapter: 21, addedOrder: 3, updatedOrder: 3 },
  { mangaSlug: "orange", status: "completed", currentChapter: 31, addedOrder: 2, updatedOrder: 2 },
  { mangaSlug: "bastard", status: "dropped", currentChapter: 35, addedOrder: 1, updatedOrder: 1 },
] as const;

export const libraryStatusLabels: Readonly<Record<LibraryStatus, string>> = {
  completed: "Completado",
  dropped: "Abandonado",
  paused: "Pausado",
  planned: "Pendiente",
  reading: "Leyendo",
};
