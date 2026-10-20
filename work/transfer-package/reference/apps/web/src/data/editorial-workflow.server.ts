import { getPrivateHeaders } from "./auth.server";
import { EditorialReadError } from "./editorial.server";
import type {
  EditorialChapter,
  EditorialMembership,
  EditorialPages,
  EditorialProject,
  EditorialRelease,
  PageResult,
  ThumbnailState,
} from "./editorial-workflow";

async function privateRead<T>(path: string): Promise<T> {
  const headers = await getPrivateHeaders();
  if (!headers) throw new EditorialReadError(401);
  const base = process.env.INTERNAL_API_URL;
  if (!base) throw new EditorialReadError(0);
  const response = await fetch(`${base.replace(/\/+$/, "")}${path}`, { headers, cache: "no-store" });
  if (!response.ok) throw new EditorialReadError(response.status);
  return await response.json() as T;
}

const id = encodeURIComponent;
const chapterBase = (projectId: string) => `/editorial/projects/${id(projectId)}/chapters`;
const releaseBase = (projectId: string, chapterId: string) => `${chapterBase(projectId)}/${id(chapterId)}/releases`;

export function readProjects(page = 1) {
  return privateRead<PageResult<EditorialProject>>(`/editorial/projects?page=${page}`);
}
export function readProject(projectId: string) {
  return privateRead<{ project: EditorialProject }>(`/editorial/projects/${id(projectId)}`);
}
export function readChapters(projectId: string, page = 1) {
  return privateRead<PageResult<EditorialChapter>>(`${chapterBase(projectId)}?page=${page}`);
}
export function readReleases(projectId: string, chapterId: string, page = 1) {
  return privateRead<PageResult<EditorialRelease>>(`${releaseBase(projectId, chapterId)}?page=${page}`);
}
export function readChapter(projectId: string, chapterId: string) {
  return privateRead<{ chapter: EditorialChapter }>(`${chapterBase(projectId)}/${id(chapterId)}`);
}
export function readRelease(projectId: string, chapterId: string, releaseId: string) {
  return privateRead<{ release: EditorialRelease }>(`${releaseBase(projectId, chapterId)}/${id(releaseId)}`);
}
export function readPages(projectId: string, chapterId: string, releaseId: string) {
  return privateRead<EditorialPages>(`${releaseBase(projectId, chapterId)}/${id(releaseId)}/pages`);
}
export function readThumbnail(chapterId: string) {
  return privateRead<ThumbnailState>(`/editorial/chapters/${id(chapterId)}/thumbnail`);
}
export function readEditorialMemberships() {
  return privateRead<{ items: EditorialMembership[] }>("/me/scanlation-group-memberships");
}
