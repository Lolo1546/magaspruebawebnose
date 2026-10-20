import type { ApiLibraryItem } from './api.server';
import type { LibraryItem, LibraryStatus } from './library-catalog';
import { mangaTypeLabel } from '@/types/manga-metadata';

function mapStatusFromApi(apiStatus: string): LibraryStatus {
  switch (apiStatus) {
    case 'READING':
      return 'reading';
    case 'PLAN_TO_READ':
      return 'planned';
    case 'ON_HOLD':
      return 'paused';
    case 'COMPLETED':
      return 'completed';
    case 'DROPPED':
      return 'dropped';
    default:
      return 'planned';
  }
}

function mapWorkTypeFromApi(apiType: string): import('@/types/home').WorkType {
  return mangaTypeLabel(apiType);
}

export function mapLibraryStatusToApi(uiStatus: LibraryStatus | 'all'): string | undefined {
  if (uiStatus === 'all') return undefined;
  switch (uiStatus) {
    case 'reading':
      return 'READING';
    case 'planned':
      return 'PLAN_TO_READ';
    case 'paused':
      return 'ON_HOLD';
    case 'completed':
      return 'COMPLETED';
    case 'dropped':
      return 'DROPPED';
    default:
      return undefined;
  }
}

export function mapLibraryItem(apiItem: ApiLibraryItem): LibraryItem {
  return {
    manga: {
      id: apiItem.manga.slug,
      slug: apiItem.manga.slug,
      title: apiItem.manga.title,
      type: mapWorkTypeFromApi(apiItem.manga.type),
      status: 'En curso', // Safe fallback that matches allowed strings
      genre: apiItem.manga.genres[0] || 'Acción', // The UI only displays the first genre
      genres: [apiItem.manga.genres[0] || 'Acción'],
      cover: apiItem.manga.cover?.url || '/images/placeholders/manga-cover.webp',
      coverTone: 'violet',
    },
    entry: {
      mangaSlug: apiItem.manga.slug,
      status: mapStatusFromApi(apiItem.library.status),
    },
  };
}
