import type { MangaComment, MangaCommentCommand, MangaCommentInput, MangaCommentsAccess, MangaCommentsPage, MangaRepliesPage } from "./manga-comments";

export class MangaCommentsError extends Error {
  constructor(readonly status: number, readonly retryAfter: string | null = null) {
    super("No se pudo completar la acción en los comentarios.");
    this.name = "MangaCommentsError";
  }
}

async function request<T>(path: string, options: RequestInit): Promise<T> {
  const base = process.env.NEXT_PUBLIC_API_URL;
  if (!base) throw new MangaCommentsError(0);
  const response = await fetch(`${base.replace(/\/+$/, "")}${path}`, { ...options, cache: "no-store" });
  if (!response.ok) throw new MangaCommentsError(response.status, response.headers.get("Retry-After"));
  return response.json();
}

function query(cursor?: string | null): string {
  return cursor ? `?cursor=${encodeURIComponent(cursor)}` : "";
}

export function fetchMangaComments(slug: string, cursor?: string | null, signal?: AbortSignal): Promise<MangaCommentsPage> {
  return request(`/manga/${encodeURIComponent(slug)}/comments${query(cursor)}`, { credentials: "omit", signal });
}

export function fetchMangaReplies(id: string, cursor?: string | null, signal?: AbortSignal): Promise<MangaRepliesPage> {
  return request(`/manga-comments/${encodeURIComponent(id)}/replies${query(cursor)}`, { credentials: "omit", signal });
}

export function fetchMangaCommentsAccess(signal?: AbortSignal): Promise<MangaCommentsAccess> {
  return request("/me/manga-comments/access", { credentials: "include", signal });
}

function mutationOptions(method: "POST" | "PATCH", input: object, csrfToken: string, signal?: AbortSignal): RequestInit {
  return { method, credentials: "include", headers: { "Content-Type": "application/json", "x-csrf-token": csrfToken }, body: JSON.stringify(input), signal };
}

export function fetchMangaCommentOwnership(slug: string, commentIds: string[], csrfToken: string, signal?: AbortSignal): Promise<{ ownedCommentIds: string[] }> {
  return request(`/me/manga/${encodeURIComponent(slug)}/comment-ownership`, mutationOptions("POST", { commentIds }, csrfToken, signal));
}

export function createMangaComment(slug: string, input: MangaCommentInput, csrfToken: string): Promise<{ comment: MangaComment }> {
  return request(`/manga/${encodeURIComponent(slug)}/comments`, mutationOptions("POST", input, csrfToken));
}

export function mutateMangaComment(id: string, command: MangaCommentCommand, input: { body?: string; isSpoiler?: boolean; reason?: string }, csrfToken: string): Promise<{ comment: MangaComment }> {
  return request(`/manga-comments/${encodeURIComponent(id)}${command === "edit" ? "" : `/${command}`}`, mutationOptions(command === "edit" ? "PATCH" : "POST", input, csrfToken));
}

export function mangaCommentsErrorMessage(error: unknown): string {
  if (!(error instanceof MangaCommentsError)) return "No pudimos confirmar la acción. Conservamos tu texto; actualiza la discusión antes de volver a intentarlo.";
  if (error.status === 429) return "Has enviado demasiados comentarios. Espera antes de intentarlo de nuevo.";
  if (error.status === 401) return "Tu sesión venció. Inicia sesión nuevamente.";
  if (error.status === 403) return "Tu cuenta no puede realizar esta acción.";
  if (error.status === 409 || error.status === 404) return "El comentario ya no permite esta acción. Actualiza la discusión.";
  if (error.status === 400) return "Revisa el texto y los campos del comentario.";
  return "No pudimos confirmar la acción. Conservamos tu texto; actualiza la discusión antes de volver a intentarlo.";
}
