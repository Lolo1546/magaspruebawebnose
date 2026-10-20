import type { EditorialLookupResponse, EditorialManga } from "./editorial";

export class EditorialClientError extends Error {
  constructor(readonly status: number, readonly code?: string, readonly missingRequirements?: string[]) {
    super("No se pudo completar la operación editorial.");
    this.name = "EditorialClientError";
  }
}

function apiBase(): string {
  const value = process.env.NEXT_PUBLIC_API_URL;
  if (!value) throw new EditorialClientError(0);
  return value.replace(/\/+$/, "");
}

async function clientError(response: Response): Promise<EditorialClientError> {
  try {
    const body = (await response.json()) as { code?: unknown; missingRequirements?: unknown };
    return new EditorialClientError(response.status, typeof body.code === "string" ? body.code : undefined, Array.isArray(body.missingRequirements) ? body.missingRequirements.filter((item): item is string => typeof item === "string") : undefined);
  } catch {
    return new EditorialClientError(response.status);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBase()}${path}`, { credentials: "include", ...init });
  if (!response.ok) throw await clientError(response);
  return (await response.json()) as T;
}

export function lookupEditorial(kind: "genres" | "creators", q: string): Promise<EditorialLookupResponse> {
  const query = new URLSearchParams({ q, pageSize: "20" });
  return request(`/editorial/${kind}?${query.toString()}`);
}

export function fetchEditorialMangaClient(id: string): Promise<{ manga: EditorialManga }> {
  return request(`/editorial/mangas/${encodeURIComponent(id)}`, { cache: "no-store" });
}

export const COVER_MAX_BYTES = 10_485_760;
export const COVER_CONTENT_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export function coverFileError(file: Pick<File, "type" | "size">): string | null {
  if (!COVER_CONTENT_TYPES.some((type) => type === file.type)) return "Elige una imagen JPEG, PNG o WebP estática.";
  if (file.size === 0) return "El archivo está vacío.";
  if (file.size > COVER_MAX_BYTES) return "La portada no puede superar 10 MiB.";
  return null;
}

export type CoverUploadIntent = {
  intentId: string;
  method: "PUT";
  signedUploadUrl: string;
  headers: Record<string, string>;
  expiresAt: string;
};

export function createCoverUploadIntent(mangaId: string, file: File, csrfToken: string): Promise<CoverUploadIntent> {
  if (coverFileError(file)) return Promise.reject(new EditorialClientError(400, "UPLOAD_INVALID_FILE"));
  return request("/editorial/uploads/intents", mutation("POST", {
    purpose: "MANGA_COVER", mangaId, expectedBytes: file.size, contentType: file.type,
  }, csrfToken));
}

export async function putCoverUpload(intent: CoverUploadIntent, file: File): Promise<void> {
  // Blob/File bodies have a known length. The browser owns Content-Length;
  // never forward API credentials, CSRF or provider response bodies.
  const headers = new Headers(intent.headers);
  if (intent.method !== "PUT" || headers.get("content-type") !== file.type || headers.get("content-length") !== String(file.size)) {
    throw new EditorialClientError(400, "UPLOAD_INVALID_FILE");
  }
  headers.delete("content-length");
  try {
    const response = await fetch(intent.signedUploadUrl, {
      method: intent.method, headers, body: file, credentials: "omit", redirect: "error", referrerPolicy: "no-referrer",
    });
    if (!response.ok) throw new Error();
  } catch {
    throw new EditorialClientError(0, "UPLOAD_TRANSFER_FAILED");
  }
}

export function finalizeCoverUpload(intentId: string, csrfToken: string): Promise<{ intentId: string; assetId: string; mangaId: string; finalizedAt: string }> {
  return request(`/editorial/uploads/intents/${encodeURIComponent(intentId)}/finalize`, mutation("POST", {}, csrfToken));
}

export function coverUploadError(error: unknown): string {
  if (!(error instanceof EditorialClientError)) return "No se pudo contactar con el servidor. Selecciona la portada y vuelve a intentarlo.";
  if (error.status === 401 || error.status === 403) return "Tu sesión no permite actualizar la portada. Revisa tu acceso y vuelve a entrar.";
  const messages: Record<string, string> = {
    UPLOAD_TRANSFER_FAILED: "No se pudo enviar la portada al almacenamiento. Revisa la conexión e inténtalo de nuevo.",
    UPLOAD_INVALID_IMAGE: "La portada debe ser una imagen JPEG, PNG o WebP estática y válida.",
    UPLOAD_UNSUPPORTED_FORMAT: "La portada debe ser una imagen JPEG, PNG o WebP estática y válida.",
    UPLOAD_TOO_LARGE: "La portada supera el máximo de 10 MiB.",
    UPLOAD_SIZE_MISMATCH: "El tamaño recibido no coincide. Selecciona de nuevo el archivo.",
    UPLOAD_MIME_MISMATCH: "El formato real no coincide con el tipo declarado. Elige otra imagen.",
    UPLOAD_FINAL_KEY_CONFLICT: "No se pudo reservar la portada. Inicia una nueva subida.",
  };
  if (error.code && messages[error.code]) return messages[error.code];
  if (error.status === 409) return "La solicitud caducó, ya fue utilizada o cambió de estado. Recarga la ficha antes de iniciar otra subida.";
  if (error.status === 404) return "La ficha o la solicitud ya no está disponible. Recarga la página.";
  if (error.status === 503) return "El servicio no está disponible o está ocupado. Inténtalo más tarde.";
  return "No se pudo actualizar la portada. Revisa el archivo y vuelve a intentarlo.";
}

export function createEditorialManga(payload: object, csrfToken: string): Promise<{ manga: EditorialManga }> {
  return request("/editorial/mangas", mutation("POST", payload, csrfToken));
}

export function updateEditorialManga(id: string, payload: object, csrfToken: string): Promise<{ manga: EditorialManga }> {
  return request(`/editorial/mangas/${encodeURIComponent(id)}`, mutation("PATCH", payload, csrfToken));
}

export function publishEditorialManga(id: string, expectedVersion: number, csrfToken: string, duplicateOverrideReason?: string): Promise<{ manga: EditorialManga }> {
  return request(`/editorial/mangas/${encodeURIComponent(id)}/publish`, mutation("POST", { expectedVersion, ...(duplicateOverrideReason ? { duplicateOverrideReason } : {}) }, csrfToken));
}

export function hideEditorialManga(id: string, expectedVersion: number, reason: string, csrfToken: string): Promise<{ manga: EditorialManga }> {
  return request(`/editorial/mangas/${encodeURIComponent(id)}/hide`, mutation("POST", { expectedVersion, reason }, csrfToken));
}

function mutation(method: "POST" | "PATCH", body: object, csrfToken: string): RequestInit {
  return { method, headers: { "Content-Type": "application/json", "x-csrf-token": csrfToken }, body: JSON.stringify(body) };
}
