import { maxLength } from 'class-validator';
import {
  ContentRating,
  MangaDemography,
  MangaStatus,
  MangaType,
} from '../../generated/prisma/client.js';

export function missingPublicationRequirements(manga: {
  title: string;
  description: string | null;
  type: MangaType;
  demography: MangaDemography | null;
  status: MangaStatus;
  contentRating: ContentRating;
  genres: readonly unknown[];
  creators: readonly unknown[];
}): string[] {
  const missing: string[] = [];
  if (!manga.title.trim() || !maxLength(manga.title.trim(), 200))
    missing.push('title');
  if (!manga.description?.trim() || !maxLength(manga.description, 10000))
    missing.push('description');
  if (!Object.values(MangaType).includes(manga.type)) missing.push('type');
  if (!manga.demography) missing.push('demography');
  if (manga.contentRating === ContentRating.ADULT)
    missing.push('contentRating');
  if (!Object.values(MangaStatus).includes(manga.status))
    missing.push('status');
  if (!manga.genres.length) missing.push('genres');
  if (!manga.creators.length) missing.push('creators');
  return missing;
}
