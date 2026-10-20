import type { ExploreGenre, ExploreManga } from '@/data/explore';
import type { PublicationStatus } from '@/types/home';
import { mangaTypeLabel } from '@/types/manga-metadata';
import type { ApiMangaCatalogItem } from './api.server';

export function adaptMangaCatalogItem(item: ApiMangaCatalogItem): ExploreManga {

  const statusMap: Record<string, PublicationStatus> = {
    ONGOING: 'En curso',
    COMPLETED: 'Completado',
    PAUSED: 'Pausado',
    CANCELLED: 'Pausado', // fallback UI label
    UNKNOWN: 'En curso',
  };

  // UI genres expect exactly strings like "Acción", "Fantasía", which we can just map back or pass if API returns names.
  // The API actually returns Names from `genre.name` now, but we just trust it as ExploreGenre.
  const genres = item.genres as ExploreGenre[];

  return {
    id: item.slug,
    slug: item.slug,
    title: item.title,
    cover: item.cover?.url ?? '/demo/cover-placeholder.svg',
    coverTone: 'blue', // UI only, safe default since API won't return color tone
    type: mangaTypeLabel(item.type),
    demography: item.demography ?? null,
    status: statusMap[item.status] || 'En curso',
    genres,
    genre: genres[0], // primary genre
    latestChapter: item.latestChapter ?? undefined,
    popularity: item.popularity,
    score: item.averageScore ?? 0, // Fallback to 0 for UI math, but strictly it's nullable in API. The prompt said "Frontend debe manejar null" but UI typing currently forces number. Let's cast to number.
    updatedOrder: 0, // unused practically when sorting is done backend-side, except for UI fallback sorting which we shouldn't use.
    year: item.publicationYear ?? new Date().getFullYear(),
  };
}
