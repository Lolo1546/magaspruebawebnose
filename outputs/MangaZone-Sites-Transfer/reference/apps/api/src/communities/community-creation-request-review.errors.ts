import { ConflictException, NotFoundException } from '@nestjs/common';

export function communityCreationRequestNotFound(): NotFoundException {
  return new NotFoundException({
    statusCode: 404,
    code: 'COMMUNITY_CREATION_REQUEST_NOT_FOUND',
    message: 'Solicitud no encontrada.',
  });
}

export function communityCreationRequestNotReviewable(): ConflictException {
  return new ConflictException({
    statusCode: 409,
    code: 'CREATION_REQUEST_NOT_REVIEWABLE',
    message: 'La solicitud no se puede revisar en su estado actual.',
  });
}

export function communityAlreadyExists(): ConflictException {
  return new ConflictException({
    statusCode: 409,
    code: 'COMMUNITY_ALREADY_EXISTS',
    message: 'Ya existe una comunidad con ese nombre.',
  });
}

export function communitySlugConflict(): ConflictException {
  return new ConflictException({
    statusCode: 409,
    code: 'COMMUNITY_SLUG_CONFLICT',
    message: 'No se pudo reservar una ruta para la comunidad.',
  });
}
