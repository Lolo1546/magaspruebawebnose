import type {
  MangaDetail,
  MangaChapter,
  MangaReleaseGroup,
} from "@/data/manga-detail";
import type { ExploreGenre } from "@/data/explore";
import type { ReaderChapterData } from "@/data/reader";
import { mangaTypeLabel } from "@/types/manga-metadata";
import type {
  ApiMangaDetailResponse,
  ApiChapterIndexItem,
  ApiChapterReleaseSummary,
  ApiReaderResponse,
} from "./api.server";

const publicationMonths = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sep",
  "oct",
  "nov",
  "dic",
] as const;

function formatPublicationDate(value: string): string {
  const date = new Date(value);
  const month = publicationMonths[date.getUTCMonth()];
  if (Number.isNaN(date.getTime()) || !month) return "Fecha no disponible";

  return `${date.getUTCDate()} ${month} ${date.getUTCFullYear()}`;
}

export function adaptMangaDetail(
  apiManga: ApiMangaDetailResponse,
  apiChapters: ApiChapterIndexItem[],
  options: {
    groups?: MangaReleaseGroup[];
    firstChapter?: ApiChapterIndexItem | null;
    totalChapters?: number;
  } = {},
): MangaDetail {
  const statusMap: Record<string, "En curso" | "Completado" | "Pausado"> = {
    ONGOING: "En curso",
    COMPLETED: "Completado",
    PAUSED: "Pausado",
    CANCELLED: "Pausado",
    UNKNOWN: "Pausado",
  };

  const contentRatingMap: Record<string, string> = {
    GENERAL: "Para todo público",
    TEEN: "Adolescentes",
    MATURE: "Adultos (+18)",
    ADULT: "Explícito",
  };

  const author =
    apiManga.creators.find((c) => c.role === "AUTHOR")?.name || "Desconocido";
  const artist =
    apiManga.creators.find((c) => c.role === "ARTIST")?.name || author;

  const genres = apiManga.genres.map((g) => g.name);
  const mainGenre = genres[0] || "Drama"; // fallback as required by ExploreManga

  // Derive unique groups from chapters for the "Grupos" tab
  const uniqueGroupsMap = new Map<string, MangaReleaseGroup>();
  apiChapters.forEach((chapter) => {
    chapter.releases.forEach((release) => {
      release.groups.forEach((group) => {
        uniqueGroupsMap.set(group.slug, { slug: group.slug, name: group.name });
      });
    });
  });

  const groups: MangaReleaseGroup[] =
    options.groups ?? Array.from(uniqueGroupsMap.values());

  const chapters: MangaChapter[] = apiChapters.map((ch) => {
    const primaryRelease: ApiChapterReleaseSummary | null =
      ch.releases[0] ?? null;

    const publishedAtLabel = formatPublicationDate(ch.publishedAt);

    const groupNames =
      primaryRelease?.groups.map((g) => g.name).join(" & ") ||
      "Grupo Desconocido";

    return {
      readerKey: ch.readerKey,
      group: groupNames,
      language: primaryRelease?.language ?? "No disponible",
      number: ch.number,
      publishedAtLabel,
      sortOrder: ch.sortOrder,
      title: ch.title || ch.displayLabel,
    };
  });

  return {
    id: apiManga.id,
    slug: apiManga.slug,
    title: apiManga.title,
    cover: apiManga.cover?.url || "/demo/cover-placeholder.svg",
    coverTone: "blue", // Static fallback to prevent runtime error in UI
    type: mangaTypeLabel(apiManga.type),
    demography: apiManga.demography ?? null,
    score: apiManga.stats.averageScore || 0,
    latestChapter: options.totalChapters ?? chapters.length,
    status: statusMap[apiManga.status] || "Pausado",
    genre: mainGenre as ExploreGenre,
    genres: genres as ExploreGenre[],
    popularity: apiManga.stats.popularity,
    updatedOrder: 0,
    year: apiManga.publicationYear ?? 0,
    aliases: apiManga.aliases,
    creatorContributions: apiManga.creators.map(({ name, role }) => ({
      name,
      role,
    })),
    artist,
    author,
    chapters,
    classification: contentRatingMap[apiManga.contentRating] || "General",
    firstChapter:
      options.firstChapter?.readerKey ??
      chapters[chapters.length - 1]?.readerKey ??
      "",
    firstChapterHref: options.firstChapter?.releases[0]
      ? `/manga/${encodeURIComponent(apiManga.slug)}/capitulo/${encodeURIComponent(options.firstChapter.readerKey)}?release=${encodeURIComponent(options.firstChapter.releases[0].id)}`
      : null,
    groups,
    language:
      apiManga.type === "MANHWA"
        ? "Coreano"
        : apiManga.type === "MANHUA"
          ? "Chino"
          : apiManga.type === "MANGA"
            ? "Japonés"
            : "No disponible",
    originalTitle: apiManga.originalTitle || apiManga.title,
    rankLabel: "", // Hidden/Deferred as per requirements
    readersLabel: `${apiManga.stats.popularity} En bibliotecas`,
    related: [], // Hidden/Deferred as per requirements
    reviews: [], // Hidden/Deferred as per requirements
    romanizedTitle: apiManga.title, // Assume title is romanized if original is different
    summary: apiManga.description || "Sin sinopsis disponible.",
    votesLabel:
      apiManga.stats.reviewCount === 1
        ? "1 valoración"
        : `${apiManga.stats.reviewCount} valoraciones`,
  };
}

export function adaptReaderData(
  apiData: ApiReaderResponse,
  apiChapters: ApiChapterIndexItem[],
): ReaderChapterData {
  const publishedAtLabel = formatPublicationDate(apiData.release.publishedAt);

  const groupNames =
    apiData.release.groups.map((g) => g.name).join(" & ") ||
    "Grupo Desconocido";

  return {
    chapter: {
      id: apiData.chapter.id,
      releaseId: apiData.release.id,
      displayLabel: apiData.chapter.displayLabel,
      readerKey: apiData.chapter.readerKey,
      group: groupNames,
      language:
        apiData.release.language === "es-LA" ||
        apiData.release.language === "es"
          ? "Español"
          : apiData.release.language,
      number: apiData.chapter.number,
      publishedAtLabel,
      title: apiData.chapter.title,
    },
    chapterLinks: apiChapters.map((ch) => ({
      displayLabel: ch.displayLabel,
      href: `/manga/${apiData.manga.slug}/capitulo/${encodeURIComponent(ch.readerKey)}`,
      isCurrent: ch.readerKey === apiData.chapter.readerKey,
      number: ch.number,
      readerKey: ch.readerKey,
      title: ch.title || ch.displayLabel,
    })),
    manga: {
      id: apiData.manga.id,
      slug: apiData.manga.slug,
      title: apiData.manga.title,
    },
    nextHref: apiData.navigation.next
      ? `/manga/${apiData.manga.slug}/capitulo/${encodeURIComponent(apiData.navigation.next.readerKey)}`
      : undefined,
    nextLabel: apiData.navigation.next?.displayLabel,
    pages: apiData.pages.map((p) => ({
      alt: `Página ${p.index} de ${apiData.chapter.displayLabel} de ${apiData.manga.title}`,
      height: p.height,
      id: `reader-page-${p.index}`,
      number: p.index,
      src: p.url,
      width: p.width,
    })),
    previousHref: apiData.navigation.previous
      ? `/manga/${apiData.manga.slug}/capitulo/${encodeURIComponent(apiData.navigation.previous.readerKey)}`
      : undefined,
    previousLabel: apiData.navigation.previous?.displayLabel,
    totalChapters: apiChapters.length,
  };
}
