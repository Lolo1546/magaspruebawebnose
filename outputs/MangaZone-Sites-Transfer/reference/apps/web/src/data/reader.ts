import { getMangaDetail } from "@/data/manga-detail";

export type ReaderPageData = {
  readonly alt: string;
  readonly height: number;
  readonly id: string;
  readonly number: number;
  readonly src: string;
  readonly width: number;
};

export type ReaderChapterLink = {
  readonly displayLabel: string;
  readonly href: string;
  readonly isCurrent: boolean;
  readonly number: number | null;
  readonly readerKey: string;
  readonly title?: string | null;
};

export type ReaderChapterData = {
  readonly chapter: {
    readonly id: string;
    readonly releaseId: string | null;
    readonly displayLabel: string;
    readonly readerKey: string;
    readonly group: string;
    readonly language: string;
    readonly number: number | null;
    readonly publishedAtLabel: string;
    readonly title: string | null;
  };
  readonly chapterLinks: readonly ReaderChapterLink[];
  readonly manga: {
    readonly id: string;
    readonly slug: string;
    readonly title: string;
  };
  readonly nextHref?: string;
  readonly nextLabel?: string;
  readonly pages: readonly ReaderPageData[];
  readonly previousHref?: string;
  readonly previousLabel?: string;
  readonly totalChapters: number;
};

export const READER_PAGE_COUNT = 8;
const readerPageSource = "/demo/reader-page-placeholder.svg";

export function parseChapterNumber(value: string) {
  if (!/^[1-9]\d*$/.test(value)) return undefined;

  const number = Number(value);
  return Number.isSafeInteger(number) ? number : undefined;
}

function createReaderPages(
  mangaTitle: string,
  chapterNumber: number,
): readonly ReaderPageData[] {
  return Array.from({ length: READER_PAGE_COUNT }, (_, index) => {
    const number = index + 1;

    return {
      alt: `Página ${number} del capítulo ${chapterNumber} de ${mangaTitle}`,
      height: 1300,
      id: `reader-page-${number}`,
      number,
      src: readerPageSource,
      width: 900,
    };
  });
}

function createChapterLinks(
  slug: string,
  currentChapter: number,
  totalChapters: number,
  knownChapters: readonly { readonly number: number | null; readonly title: string; readonly readerKey: string }[],
): readonly ReaderChapterLink[] {
  const knownTitles = new Map(
    knownChapters.map((chapter) => [chapter.number, chapter.title]),
  );
  return Array.from({ length: totalChapters }, (_, index) => {
    const number = index + 1;

    return {
      displayLabel: `Capítulo ${number}`,
      href: `/manga/${slug}/capitulo/${number}`,
      isCurrent: number === currentChapter,
      number,
      readerKey: String(number),
      title: knownTitles.get(number),
    };
  });
}

export function getReaderChapter(
  slug: string,
  chapterValue: string,
): ReaderChapterData | undefined {
  const chapterNumber = parseChapterNumber(chapterValue);
  const manga = getMangaDetail(slug);
  if (!manga || chapterNumber === undefined) return undefined;

  const totalChapters = manga.latestChapter ?? manga.chapters[0]?.number ?? 1;
  if (chapterNumber > totalChapters) return undefined;

  const knownChapter = manga.chapters.find(
    (chapter) => chapter.number === chapterNumber,
  );
  const previousNumber = chapterNumber > 1 ? chapterNumber - 1 : undefined;
  const nextNumber =
    chapterNumber < totalChapters ? chapterNumber + 1 : undefined;

  return {
    chapter: {
      id: "mock-chapter-id", // fixture
      releaseId: null, // fixture
      displayLabel: `Capítulo ${chapterNumber}`,
      readerKey: `${chapterNumber}`,
      group: knownChapter?.group ?? manga.groups[0]?.name ?? "Grupo local",
      language: knownChapter?.language ?? "Español",
      number: chapterNumber,
      publishedAtLabel: knownChapter?.publishedAtLabel ?? "Disponible en el fixture local",
      title: knownChapter?.title ?? `Capítulo ${chapterNumber}`,
    },
    chapterLinks: createChapterLinks(
      manga.slug,
      chapterNumber,
      totalChapters,
      manga.chapters,
    ),
    manga: {
      id: "mock-manga-id", // fixture
      slug: manga.slug,
      title: manga.title,
    },
    nextHref:
      nextNumber === undefined
        ? undefined
        : `/manga/${manga.slug}/capitulo/${nextNumber}`,
    nextLabel: nextNumber === undefined ? undefined : `Capítulo ${nextNumber}`,
    pages: createReaderPages(manga.title, chapterNumber),
    previousHref:
      previousNumber === undefined
        ? undefined
        : `/manga/${manga.slug}/capitulo/${previousNumber}`,
    previousLabel:
      previousNumber === undefined ? undefined : `Capítulo ${previousNumber}`,
    totalChapters,
  };
}
