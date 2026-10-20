export const mangaTypeLabels = {
  MANGA: "Manga",
  MANHUA: "Manhua",
  MANHWA: "Manhwa",
  WEBTOON: "Webtoon",
  NOVEL: "Novela",
  COMIC: "Comic",
  ONE_SHOT: "One shot",
  DOUJINSHI: "Doujinshi",
  OEL: "OEL",
} as const;

export type MangaDemography = "SEINEN" | "SHOUJO" | "SHOUNEN" | "JOSEI" | "KODOMO";

export const contributionTypeLabels = {
  AUTHOR: "Autor",
  ARTIST: "Artista",
  STORY: "Historia",
  ILLUSTRATION: "Ilustración",
} as const;

export function mangaTypeLabel(value: string): (typeof mangaTypeLabels)[keyof typeof mangaTypeLabels] {
  if (!Object.hasOwn(mangaTypeLabels, value)) throw new Error("Unsupported manga type");
  return mangaTypeLabels[value as keyof typeof mangaTypeLabels];
}
