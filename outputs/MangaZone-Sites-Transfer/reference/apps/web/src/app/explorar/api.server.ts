import { ExploreFilters } from './explore-catalog';

export interface ApiMangaCatalogAsset {
  url: string;
  width: number | null;
  height: number | null;
}

export interface ApiMangaCatalogItem {
  slug: string;
  title: string;
  type: string;
  demography?: import('@/types/manga-metadata').MangaDemography | null;
  status: string;
  publicationYear: number | null;
  cover: ApiMangaCatalogAsset | null;
  genres: string[];
  popularity: number;
  averageScore: number | null;
  latestChapter: number | null;
}

export interface ApiMangaCatalogPagination {
  page: number;
  pageSize: number;
  total: number;
  pageCount: number;
}

export interface ApiMangaCatalogResponse {
  items: ApiMangaCatalogItem[];
  pagination: ApiMangaCatalogPagination;
}

export async function fetchExploreCatalog(filters: ExploreFilters): Promise<ApiMangaCatalogResponse> {
  const baseUrl = process.env.INTERNAL_API_URL;
  if (!baseUrl) {
    throw new Error('INTERNAL_API_URL is not configured in environment.');
  }

  const searchParams = new URLSearchParams();
  
  if (filters.q) searchParams.set('q', filters.q);
  // Transform frontend 'genre' string back to slug representation safely if needed.
  // Actually, UI handles 'Acción' but the backend now expects slug 'accion'.
  // We can just lower case it and normalize for now to match our mock backend slugs:
  if (filters.genre && filters.genre !== 'all') {
    const slug = filters.genre.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    searchParams.set('genre', slug);
  }
  
  if (filters.status && filters.status !== 'all') {
    const statusMap: Record<string, string> = {
      'En curso': 'ONGOING',
      'Completado': 'COMPLETED',
      'Pausado': 'PAUSED',
    };
    if (statusMap[filters.status]) {
      searchParams.set('status', statusMap[filters.status]);
    }
  }

  if (filters.type && filters.type !== 'all') {
    const typeMap: Record<string, string> = {
      'Manga': 'MANGA',
      'Manhwa': 'MANHWA',
      'Manhua': 'MANHUA',
      'Webtoon': 'WEBTOON',
      'Novela': 'NOVEL',
      'Comic': 'COMIC',
      'One shot': 'ONE_SHOT',
      'Doujinshi': 'DOUJINSHI',
      'OEL': 'OEL',
    };
    if (typeMap[filters.type]) {
      searchParams.set('type', typeMap[filters.type]);
    }
  }

  if (filters.sort) {
    searchParams.set('sort', filters.sort);
  }

  if (filters.page) searchParams.set('page', filters.page.toString());
  // pageSize defaults to 12 in the backend, no need to send it unless it's dynamic.

  const url = `${baseUrl}/manga?${searchParams.toString()}`;
  
  // We use standard next fetch configuration. Catalog is mostly public.
  // The prompt asks for strategy minimum: revalidate or dynamic runtime.
  const response = await fetch(url, {
    next: { revalidate: 60 }, // Cache for 1 minute for explore catalog
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Failed to fetch catalog: ${response.status} ${errText}`);
  }

  return response.json();
}
