import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

export const commentNotFound = () =>
  new NotFoundException({
    code: 'MANGA_COMMENT_NOT_FOUND',
    message: 'Comentario no disponible.',
  });
export const commentParentInvalid = () =>
  new NotFoundException({
    code: 'MANGA_COMMENT_PARENT_INVALID',
    message: 'Comentario padre no disponible.',
  });
export const commentAuthorForbidden = () =>
  new ForbiddenException({
    code: 'MANGA_COMMENT_AUTHOR_FORBIDDEN',
    message: 'No puedes modificar este comentario.',
  });
export const commentStateConflict = () =>
  new ConflictException({
    code: 'MANGA_COMMENT_INVALID_STATE',
    message: 'El estado del comentario ya no permite esta acción.',
  });
export const commentNoChanges = () =>
  new ConflictException({
    code: 'MANGA_COMMENT_NO_CHANGES',
    message: 'No hay cambios para guardar.',
  });
export const commentConflict = () =>
  new ConflictException({
    code: 'MANGA_COMMENT_CONFLICT',
    message: 'El comentario cambió. Actualiza la discusión.',
  });
export const invalidCommentCursor = () =>
  new BadRequestException({
    code: 'MANGA_COMMENT_INVALID_CURSOR',
    message: 'Cursor de comentarios inválido.',
  });
