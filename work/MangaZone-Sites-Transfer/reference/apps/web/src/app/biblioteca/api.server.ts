import { getPrivateHeaders } from '@/data/auth.server';
import { mapLibraryStatusToApi } from './adapter';
import type { LibraryStatus } from '@/data/library';

export interface ApiLibraryManga {
  id: string;
  slug: string;
  title: string;
  type: string;
  cover: { url: string; width: number | null; height: number | null } | null;
  genres: string[];
}

export interface ApiLibraryEntry {
  status: string;
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ApiLibraryItem {
  manga: ApiLibraryManga;
  library: ApiLibraryEntry;
}

export interface ApiLibraryStats {
  total: number;
  reading: number;
  planned: number;
  completed: number;
  paused: number;
  dropped: number;
}

export interface ApiLibraryListResponse {
  items: ApiLibraryItem[];
  stats: ApiLibraryStats;
  totalItems: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export async function fetchLibrary(query: {
  q?: string;
  status?: LibraryStatus | 'all';
  page?: number;
  pageSize?: number;
}): Promise<ApiLibraryListResponse> {
  const headers = await getPrivateHeaders();
  if (!headers) {
    throw new Error('Unauthorized');
  }

  const baseUrl = process.env.INTERNAL_API_URL;
  if (!baseUrl) {
    throw new Error('INTERNAL_API_URL is not configured in environment.');
  }

  const url = new URL(`${baseUrl}/me/library`);
  if (query.q) url.searchParams.set('q', query.q);
  if (query.status) {
    const apiStatus = mapLibraryStatusToApi(query.status);
    if (apiStatus) url.searchParams.set('status', apiStatus);
  }
  if (query.page) url.searchParams.set('page', query.page.toString());
  if (query.pageSize) url.searchParams.set('pageSize', query.pageSize.toString());

  const response = await fetch(url.toString(), {
    headers,
    cache: 'no-store',
  });

  if (response.status === 401) {
    throw new Error('Unauthorized'); // Can be caught if we needed to, but redirect happens on page
  }

  if (response.status === 403) {
    throw new Error('Forbidden');
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch library: ${response.status}`);
  }

  return response.json() as Promise<ApiLibraryListResponse>;
}
