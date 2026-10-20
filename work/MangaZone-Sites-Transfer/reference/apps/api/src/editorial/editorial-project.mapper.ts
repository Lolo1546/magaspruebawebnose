import type { Prisma } from '../../generated/prisma/client.js';
import type { EditorialProjectDto } from './dto/editorial-project-response.dto.js';

export const editorialProjectReadSelect = {
  id: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  manga: {
    select: {
      id: true,
      title: true,
      slug: true,
      editorialStatus: true,
      contentRating: true,
    },
  },
  groups: {
    where: { status: 'ACTIVE', leftAt: null },
    orderBy: { groupId: 'asc' },
    select: {
      group: { select: { id: true, name: true, slug: true, status: true } },
    },
  },
} satisfies Prisma.ScanlationProjectSelect;

export function mapEditorialProject(
  row: Prisma.ScanlationProjectGetPayload<{
    select: typeof editorialProjectReadSelect;
  }>,
): EditorialProjectDto {
  return {
    id: row.id,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    manga: {
      id: row.manga.id,
      title: row.manga.title,
      slug: row.manga.slug,
      editorialStatus: row.manga.editorialStatus,
      contentRating: row.manga.contentRating,
    },
    groups: row.groups.map(({ group }) => ({
      id: group.id,
      name: group.name,
      slug: group.slug,
      status: group.status,
    })),
  };
}
