// Import DTO structure directly (duplicating types here for clean boundary without importing api package directly if possible, or using Prisma types)
// Actually we can just define the expected JSON shape from the API here:

export interface ApiMangaDetailGenre {
  slug: string;
  name: string;
}

export interface ApiMangaDetailCreator {
  name: string;
  role: string;
}

export interface ApiMangaDetailStats {
  popularity: number;
  averageScore: number | null;
  reviewCount: number;
}

export interface ApiMangaDetailResponse {
  id: string;
  slug: string;
  title: string;
  originalTitle: string | null;
  description: string | null;
  type: string;
  demography?: import('@/types/manga-metadata').MangaDemography | null;
  status: string; // ONGOING, COMPLETED, PAUSED, CANCELLED
  publicationYear: number | null;
  contentRating: string;
  cover: { url: string; width: number | null; height: number | null } | null;
  aliases: string[];
  genres: ApiMangaDetailGenre[];
  creators: ApiMangaDetailCreator[];
  stats: ApiMangaDetailStats;
}

export interface ApiChapterReleaseGroup {
  slug: string;
  name: string;
}

export interface ApiChapterReleaseSummary {
  id: string;
  language: string;
  publishedAt: string;
  groups: ApiChapterReleaseGroup[];
}

export interface ApiChapterIndexItem {
  id: string;
  readerKey: string;
  kind: string;
  number: number | null;
  displayLabel: string;
  sortOrder: number;
  title: string | null;
  thumbnailUrl: string | null;
  publishedAt: string;
  releases: ApiChapterReleaseSummary[];
}

export interface ApiChapterIndexResponse {
  items: ApiChapterIndexItem[];
  groups: ApiChapterReleaseGroup[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    pageCount: number;
  };
}

export interface ApiReaderResponse {
  manga: { id: string; slug: string; title: string };
  chapter: {
    id: string;
    readerKey: string;
    kind: string;
    number: number | null;
    displayLabel: string;
    title: string | null;
    sortOrder: number;
  };
  release: {
    id: string;
    language: string;
    publishedAt: string;
    groups: ApiChapterReleaseGroup[];
  };
  availableReleases: {
    id: string;
    language: string;
    publishedAt: string;
    groups: ApiChapterReleaseGroup[];
  }[];
  pages: {
    index: number;
    url: string;
    width: number;
    height: number;
  }[];
  navigation: {
    previous: { readerKey: string; displayLabel: string } | null;
    next: { readerKey: string; displayLabel: string } | null;
  };
}

export async function fetchMangaDetail(slug: string): Promise<ApiMangaDetailResponse | null> {
  const baseUrl = process.env.INTERNAL_API_URL;
  if (!baseUrl) {
    throw new Error('INTERNAL_API_URL is not configured in environment.');
  }

  const response = await fetch(`${baseUrl}/manga/${slug}`, {
    next: { revalidate: 60 },
  });

  if (response.status === 404) return null;

  if (!response.ok) {
    throw new Error(`Failed to fetch manga detail: ${response.status}`);
  }

  return response.json();
}

export type ChapterIndexFilters = {
  q?: string;
  group?: string;
  sort?: 'asc' | 'desc';
  pageSize?: number;
};

export async function fetchChapterIndex(slug: string, page: number = 1, filters: ChapterIndexFilters = {}): Promise<ApiChapterIndexResponse | null> {
  const baseUrl = process.env.INTERNAL_API_URL;
  if (!baseUrl) {
    throw new Error('INTERNAL_API_URL is not configured in environment.');
  }

  const params = new URLSearchParams({ page: String(page), pageSize: String(filters.pageSize ?? 100) });
  if (filters.q) params.set('q', filters.q);
  if (filters.group && filters.group !== 'all') params.set('group', filters.group);
  if (filters.sort) params.set('sort', filters.sort);
  const response = await fetch(`${baseUrl}/manga/${encodeURIComponent(slug)}/chapters?${params}`, {
    next: { revalidate: 60 },
  });

  if (response.status === 404) return null;

  if (!response.ok) {
    throw new Error(`Failed to fetch chapter index: ${response.status}`);
  }

  return response.json();
}

export async function fetchReaderData(slug: string, chapterKey: string, release?: string): Promise<ApiReaderResponse | null> {
  const baseUrl = process.env.INTERNAL_API_URL;
  if (!baseUrl) {
    throw new Error('INTERNAL_API_URL is not configured in environment.');
  }

  const url = new URL(`${baseUrl}/manga/${slug}/chapters/${encodeURIComponent(chapterKey)}/reader`);
  if (release) {
    url.searchParams.set('release', release);
  }

  const response = await fetch(url.toString(), {
    next: { revalidate: 60 },
  });

  if (response.status === 404) return null;

  if (!response.ok) {
    throw new Error(`Failed to fetch reader data: ${response.status}`);
  }

  return response.json();
}
