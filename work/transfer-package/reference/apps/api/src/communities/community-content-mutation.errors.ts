import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';

function conflict(code: string, message: string): ConflictException {
  return new ConflictException({ statusCode: 409, code, message });
}

export function communityContentMembershipRequired(): ForbiddenException {
  return new ForbiddenException({
    statusCode: 403,
    code: 'COMMUNITY_MEMBERSHIP_REQUIRED',
    message: 'Se requiere una membresia activa en la comunidad.',
  });
}

export function activeCommunityNotFound(): NotFoundException {
  return new NotFoundException({
    statusCode: 404,
    code: 'COMMUNITY_NOT_FOUND',
    message: 'Comunidad no encontrada.',
  });
}

export function communityContentAuthorForbidden(): ForbiddenException {
  return new ForbiddenException({
    statusCode: 403,
    code: 'COMMUNITY_CONTENT_AUTHOR_FORBIDDEN',
    message: 'No se permite modificar contenido de otro autor.',
  });
}

export function communityPostNotFound(): NotFoundException {
  return new NotFoundException({
    statusCode: 404,
    code: 'COMMUNITY_POST_NOT_FOUND',
    message: 'Publicacion no encontrada.',
  });
}

export function communityCommentNotFound(): NotFoundException {
  return new NotFoundException({
    statusCode: 404,
    code: 'COMMUNITY_POST_COMMENT_NOT_FOUND',
    message: 'Comentario no encontrado.',
  });
}

export function communityCommentParentInvalid(): NotFoundException {
  return new NotFoundException({
    statusCode: 404,
    code: 'COMMUNITY_COMMENT_PARENT_INVALID',
    message: 'El comentario padre no esta disponible.',
  });
}

export function communitySpoilerInvalid(): UnprocessableEntityException {
  return new UnprocessableEntityException({
    statusCode: 422,
    code: 'COMMUNITY_POST_SPOILER_INVALID',
    message: 'La configuracion de spoiler no es valida.',
  });
}

export function communityContentInvalidState(): ConflictException {
  return conflict(
    'COMMUNITY_CONTENT_INVALID_STATE',
    'El contenido no admite esta operacion en su estado actual.',
  );
}

export function communityContentNoChanges(): ConflictException {
  return conflict(
    'COMMUNITY_CONTENT_NO_CHANGES',
    'La operacion no produce cambios.',
  );
}

export function contentDeletionRequestAlreadyOpen(): ConflictException {
  return conflict(
    'CONTENT_DELETION_REQUEST_ALREADY_OPEN',
    'Ya existe una solicitud de eliminacion pendiente.',
  );
}

export function communityContentConflict(): ConflictException {
  return conflict(
    'COMMUNITY_CONTENT_CONFLICT',
    'El contenido cambio concurrentemente.',
  );
}
