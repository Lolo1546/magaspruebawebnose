import type { Prisma } from '../../../generated/prisma/client.js';

export const publicMangaWhere = {
  editorialStatus: 'PUBLIC',
  contentRating: { not: 'ADULT' },
} satisfies Prisma.MangaWhereInput;
