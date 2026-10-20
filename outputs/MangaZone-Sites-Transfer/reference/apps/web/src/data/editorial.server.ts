import { getPrivateHeaders } from "./auth.server";
import type { EditorialManga, EditorialMangaList } from "./editorial";

export class EditorialReadError extends Error {
  constructor(readonly status: number) {
    super("No se pudo cargar el catálogo editorial.");
    this.name = "EditorialReadError";
  }
}

function baseUrl(): string {
  const value = process.env.INTERNAL_API_URL;
  if (!value) throw new EditorialReadError(0);
  return value.replace(/\/+$/, "");
}

async function privateJson<T>(path: string): Promise<T> {
  const headers = await getPrivateHeaders();
  if (!headers) throw new EditorialReadError(401);
  const response = await fetch(`${baseUrl()}${path}`, { cache: "no-store", headers });
  if (!response.ok) throw new EditorialReadError(response.status);
  return (await response.json()) as T;
}

export function fetchEditorialMangas(filters: { q?: string; editorialStatus?: string; page?: number } = {}): Promise<EditorialMangaList> {
  const query = new URLSearchParams();
  if (filters.q) query.set("q", filters.q);
  if (filters.editorialStatus) query.set("editorialStatus", filters.editorialStatus);
  if (filters.page && filters.page > 1) query.set("page", String(filters.page));
  const suffix = query.size ? `?${query.toString()}` : "";
  return privateJson(`/editorial/mangas${suffix}`);
}

export function fetchEditorialManga(id: string): Promise<{ manga: EditorialManga }> {
  return privateJson(`/editorial/mangas/${encodeURIComponent(id)}`);
}

export async function assertEditorialAccess(): Promise<void> {
  await privateJson("/editorial/genres?pageSize=1");
}

export async function hasGlobalAdminAccess(): Promise<boolean> {
  try {
    await privateJson<{ admin: true }>("/admin/access");
    return true;
  } catch (error) {
    if (error instanceof EditorialReadError && error.status === 403) return false;
    throw error;
  }
}
