import { getPrivateHeaders } from './auth.server';
import type { HistoryFilters } from '@/app/historial/history-catalog';
import { fetchReleaseProgressBatches, type ReleaseProgress } from './release-progress';

export async function fetchReleaseProgress(releaseId: string): Promise<ReleaseProgress | null> {
  try {
    const headers = await getPrivateHeaders();
    const origin = process.env.INTERNAL_API_URL;
    if (!headers || !origin) return null;
    const items = await fetchReleaseProgressBatches(origin, [releaseId], { headers });
    return items.find((item) => item.chapterReleaseId === releaseId) ?? null;
  } catch {
    return null;
  }
}

export interface ReadingProgress {
  mangaId: string;
  chapterId: string;
  chapterReleaseId: string | null;
  pageNumber: number;
  progressPercent: number;
  completed?: boolean;
}

export interface HistoryManga {
  id: string;
  slug: string;
  title: string;
  coverUrl: string;
}

export interface HistoryChapter {
  id: string;
  readerKey: string;
  label: string;
}

export interface HistoryRelease {
  id: string;
}

export interface HistoryReading {
  lastPageNumber: number;
  progressPercent: number;
  firstReadAt: string; // ISO
  lastReadAt: string; // ISO
  completedAt: string | null; // ISO
}

export interface HistoryItem {
  manga: HistoryManga;
  chapter: HistoryChapter;
  release: HistoryRelease | null;
  reading: HistoryReading;
}

export interface HistoryResponse {
  items: HistoryItem[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export async function fetchReadingProgress(mangaId: string): Promise<ReadingProgress | null> {
  const headers = await getPrivateHeaders();
  if (!headers) return null;

  const baseUrl = process.env.INTERNAL_API_URL;
  if (!baseUrl) {
    throw new Error('INTERNAL_API_URL is not configured in environment.');
  }

  try {
    const response = await fetch(`${baseUrl}/me/mangas/${mangaId}/progress`, {
      headers,
      cache: 'no-store',
    });

    if (response.status === 401 || response.status === 403 || response.status === 404) {
      return null;
    }

    if (!response.ok) {
      return null; // degrade gracefully
    }

    const data = await response.json();
    return data.progress ?? null;
  } catch {
    return null; // degrade gracefully
  }
}

export async function fetchHistory(filters: HistoryFilters): Promise<HistoryResponse> {
  const headers = await getPrivateHeaders();
  if (!headers) {
    throw new Error('Unauthorized'); // Let Next.js error boundary handle it, or redirect
  }

  const baseUrl = process.env.INTERNAL_API_URL;
  if (!baseUrl) {
    throw new Error('INTERNAL_API_URL is not configured in environment.');
  }

  const url = new URL(`${baseUrl}/me/history`);
  if (filters.q) url.searchParams.set('q', filters.q);
  if (filters.sort) url.searchParams.set('sort', filters.sort);
  if (filters.page) url.searchParams.set('page', filters.page.toString());
  if (filters.from) url.searchParams.set('from', filters.from);
  if (filters.to) url.searchParams.set('to', filters.to);

  const response = await fetch(url.toString(), {
    headers,
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch history: ${response.status}`);
  }

  return response.json();
}
