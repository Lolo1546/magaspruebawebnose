import { EditorialClientError, putCoverUpload, type CoverUploadIntent } from "./editorial.client";
import type {
  EditorialChapter,
  EditorialPages,
  EditorialProject,
  EditorialRelease,
  PageResult,
  ThumbnailState,
} from "./editorial-workflow";

const id = encodeURIComponent;
const chapterBase = (projectId: string) => `/editorial/projects/${id(projectId)}/chapters`;
const releaseBase = (projectId: string, chapterId: string) => `${chapterBase(projectId)}/${id(chapterId)}/releases`;
const releasePath = (projectId: string, chapterId: string, releaseId: string) => `${releaseBase(projectId, chapterId)}/${id(releaseId)}`;

async function request<T>(path: string, method = "GET", csrfToken?: string, body?: object): Promise<T> {
  const base = process.env.NEXT_PUBLIC_API_URL;
  if (!base) throw new EditorialClientError(0);
  const response = await fetch(`${base.replace(/\/+$/, "")}${path}`, {
    method,
    credentials: "include",
    cache: "no-store",
    ...(body === undefined ? {} : {
      headers: { "Content-Type": "application/json", "x-csrf-token": csrfToken ?? "" },
      body: JSON.stringify(body),
    }),
  });
  if (!response.ok) {
    let code: string | undefined;
    let missingRequirements: string[] | undefined;
    try {
      const value = await response.json() as { code?: unknown; missingRequirements?: unknown };
      code = typeof value.code === "string" ? value.code : undefined;
      missingRequirements = Array.isArray(value.missingRequirements)
        ? value.missingRequirements.filter((item): item is string => typeof item === "string") : undefined;
    } catch { /* Preserve the status without exposing raw response bodies. */ }
    throw new EditorialClientError(response.status, code, missingRequirements);
  }
  return await response.json() as T;
}

export function workflowError(error: unknown): string {
  if (!(error instanceof EditorialClientError)) return "No se pudo contactar con el servidor. Inténtalo de nuevo.";
  if (error.status === 401 || error.status === 403) return "Tu sesión ya no permite esta acción. Recarga la página.";
  if (error.status === 404) return "Este recurso no está disponible. Vuelve al proyecto y recarga.";
  if (error.status === 409) return "El estado cambió mientras trabajabas. Recarga los datos antes de continuar.";
  if (error.status === 400) return "Revisa los datos enviados e inténtalo de nuevo.";
  return "No se pudo completar la operación. Inténtalo de nuevo.";
}

export function getProject(projectId: string) {
  return request<{ project: EditorialProject }>(`/editorial/projects/${id(projectId)}`);
}
export function getChapters(projectId: string, page = 1) {
  return request<PageResult<EditorialChapter>>(`${chapterBase(projectId)}?page=${page}`);
}
export function getReleases(projectId: string, chapterId: string, page = 1) {
  return request<PageResult<EditorialRelease>>(`${releaseBase(projectId, chapterId)}?page=${page}`);
}
export function getRelease(projectId: string, chapterId: string, releaseId: string) {
  return request<{ release: EditorialRelease }>(releasePath(projectId, chapterId, releaseId));
}
export function getPages(projectId: string, chapterId: string, releaseId: string) {
  return request<EditorialPages>(`${releasePath(projectId, chapterId, releaseId)}/pages`);
}
export function getThumbnail(chapterId: string) {
  return request<ThumbnailState>(`/editorial/chapters/${id(chapterId)}/thumbnail`);
}
export function createChapter(projectId: string, data: {
  groupId: string; kind: EditorialChapter["kind"]; number?: string | null;
  displayLabel: string; sortOrder: string; title?: string | null;
}, csrfToken: string) {
  return request<{ chapter: EditorialChapter }>(chapterBase(projectId), "POST", csrfToken, data);
}
export function createRelease(projectId: string, chapterId: string, data: {
  publishingGroupId: string; language: string; supersedesReleaseId?: string;
}, csrfToken: string) {
  return request<{ release: EditorialRelease }>(releaseBase(projectId, chapterId), "POST", csrfToken, data);
}
export function createPageIntent(projectId: string, chapterId: string, releaseId: string, file: File, csrfToken: string) {
  return request<CoverUploadIntent>(`${releasePath(projectId, chapterId, releaseId)}/pages/upload-intents`, "POST", csrfToken, {
    contentType: file.type, expectedBytes: file.size,
  });
}
export function createThumbnailIntent(chapterId: string, file: File, csrfToken: string, groupId?: string) {
  return request<CoverUploadIntent>(`/editorial/chapters/${id(chapterId)}/thumbnail/upload-intents`, "POST", csrfToken, {
    contentType: file.type, expectedBytes: file.size, ...(groupId ? { groupId } : {}),
  });
}
export const putEditorialUpload = putCoverUpload;
export function finalizeEditorialIntent(intentId: string, csrfToken: string) {
  return request<{ assetId: string; pageId?: string; version?: number }>(`/editorial/uploads/intents/${id(intentId)}/finalize`, "POST", csrfToken, {});
}
export function reorderPages(projectId: string, chapterId: string, releaseId: string, expectedVersion: number, pageIds: string[], csrfToken: string) {
  return request<{ releaseId: string; version: number; pages: Array<{ id: string; pageNumber: number }> }>(
    `${releasePath(projectId, chapterId, releaseId)}/pages/order`, "PATCH", csrfToken, { expectedVersion, pageIds },
  );
}
export function transitionRelease(projectId: string, chapterId: string, releaseId: string, action: "publish" | "withdraw", expectedVersion: number, csrfToken: string) {
  return request<{ release: EditorialRelease }>(`${releasePath(projectId, chapterId, releaseId)}/${action}`, "POST", csrfToken, { expectedVersion });
}
export function setThumbnail(chapterId: string, assetId: string, csrfToken: string, options: { groupId?: string; override?: boolean } = {}) {
  return request<Omit<ThumbnailState, "actorGroups">>(`/editorial/chapters/${id(chapterId)}/thumbnail/${options.override ? "override" : "set"}`, "POST", csrfToken,
    options.override ? { assetId } : { assetId, ...(options.groupId ? { groupId: options.groupId } : {}) });
}
export function requestThumbnailChange(chapterId: string, groupId: string, assetId: string, csrfToken: string) {
  return request<{ request: { id: string } }>(`/editorial/chapters/${id(chapterId)}/thumbnail/requests`, "POST", csrfToken, { groupId, assetId });
}
export function addProjectGroup(projectId: string, groupId: string, csrfToken: string) {
  return request(`/editorial/projects/${id(projectId)}/groups`, "POST", csrfToken, { groupId });
}
export function removeProjectGroup(projectId: string, groupId: string, csrfToken: string) {
  return request(`/editorial/projects/${id(projectId)}/groups/${id(groupId)}/remove`, "POST", csrfToken, {});
}

export function searchVerifiedGroups(q: string) {
  const query = new URLSearchParams({ q: q.trim(), pageSize: "20" });
  return request<{ items: Array<{ id: string; name: string; status: string }> }>(`/scanlation-groups?${query}`);
}
