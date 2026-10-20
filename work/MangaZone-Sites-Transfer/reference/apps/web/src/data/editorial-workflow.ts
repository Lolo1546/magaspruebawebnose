export type Pagination = { page: number; pageSize: number; total: number; pageCount: number };
export type PageResult<T> = { items: T[]; pagination: Pagination };

export type EditorialProject = {
  id: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  manga: { id: string; title: string; slug: string; editorialStatus: string; contentRating: string };
  groups: Array<{ id: string; name: string; slug: string; status: string }>;
};

export type EditorialChapter = {
  id: string;
  mangaId: string;
  kind: "REGULAR" | "SPECIAL" | "ONE_SHOT" | "EXTRA";
  number: string | null;
  displayLabel: string;
  sortOrder: string;
  title: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export type EditorialRelease = {
  id: string;
  chapterId: string;
  projectId: string | null;
  publishingGroupId: string | null;
  language: string;
  status: "DRAFT" | "PENDING_REVIEW" | "PUBLISHED" | "HIDDEN" | "WITHDRAWN";
  version: number;
  supersedesReleaseId: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type EditorialPage = {
  id: string;
  pageNumber: number;
  width: number;
  height: number;
  mimeType: string;
  previewUrl: string;
};
export type EditorialPages = { releaseId: string; version: number; pages: EditorialPage[] };

export type ThumbnailState = {
  chapterId: string;
  fixed: boolean;
  fallbackRequired: boolean;
  thumbnail: { assetId: string; previewUrl: string; definedByUserId: string | null; groupId: string | null; definedAt: string } | null;
  priority: { groupId: string; currentlyEligible: boolean; startsAt: string; expiresAt: string } | null;
  canOverride: boolean;
  canSet: boolean;
  actorGroups: Array<{
    groupId: string;
    currentlyEligible: boolean;
    historicalStartsAt: string;
    historicalExpiresAt: string;
    hasPendingRequest: boolean;
    canRequestChange: boolean;
  }>;
};

export type EditorialMembership = { group: { id: string; name: string }; roles: string[]; status: string };

export const releaseLabel: Record<EditorialRelease["status"], string> = {
  DRAFT: "Borrador",
  PENDING_REVIEW: "En revisión",
  PUBLISHED: "Publicado",
  HIDDEN: "Oculto",
  WITHDRAWN: "Retirado",
};

export function projectHref(projectId: string): string {
  return `/editorial/proyectos/${encodeURIComponent(projectId)}`;
}

export function releaseHref(projectId: string, chapterId: string, releaseId: string): string {
  return `${projectHref(projectId)}/capitulos/${encodeURIComponent(chapterId)}/publicaciones/${encodeURIComponent(releaseId)}`;
}

export function privateMediaUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_API_URL;
  if (!base || !path.startsWith("/media/editorial/") && !path.startsWith("/media/mangas/")) return "";
  return `${base.replace(/\/+$/, "")}${path}`;
}

export function editorialUiAccess(isAdmin: boolean, memberships: EditorialMembership[], groupId: string | null) {
  const roles = memberships.find((entry) => entry.group.id === groupId && entry.status === "ACTIVE")?.roles ?? [];
  const operational = roles.some((role) => role === "FOUNDER" || role === "ADMIN" || role === "UPLOADER");
  const manager = roles.some((role) => role === "FOUNDER" || role === "ADMIN");
  return { canPrepare: isAdmin || operational, canPublish: isAdmin || manager };
}
