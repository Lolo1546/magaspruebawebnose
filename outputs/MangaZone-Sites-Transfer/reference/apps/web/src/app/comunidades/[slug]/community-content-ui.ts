import { CommunityContentError } from "@/data/community-content.client";

export function communityContentErrorMessage(
  error: unknown,
  fallback: string,
): string {
  if (!(error instanceof CommunityContentError)) return fallback;
  if (error.status === 401)
    return "Tu sesión expiró. Inicia sesión y vuelve a intentarlo.";
  if (error.code === "CSRF_VALIDATION_FAILED")
    return "No pudimos validar la solicitud. Actualiza la página antes de reintentar.";
  if (error.code === "COMMUNITY_MEMBERSHIP_REQUIRED" || error.status === 403)
    return "Ya no tienes una membresía activa para realizar esta acción.";
  if (error.code === "COMMUNITY_CONTENT_NO_CHANGES")
    return "No hay cambios para guardar.";
  if (error.code === "CONTENT_DELETION_REQUEST_ALREADY_OPEN")
    return "Ya existe una solicitud de eliminación pendiente.";
  if (error.code === "COMMUNITY_POST_SPOILER_INVALID")
    return "Revisa la configuración del spoiler.";
  if (error.code === "COMMUNITY_COMMENT_PARENT_INVALID")
    return "La conversación cambió y ya no es posible responder a ese comentario.";
  if (error.status === 400 || error.status === 422)
    return "Revisa los campos e inténtalo de nuevo.";
  if (
    error.status === 404 ||
    error.code === "COMMUNITY_CONTENT_INVALID_STATE" ||
    error.code === "COMMUNITY_CONTENT_CONFLICT"
  )
    return "El contenido cambió. Actualiza la página antes de reintentar.";
  return fallback;
}
