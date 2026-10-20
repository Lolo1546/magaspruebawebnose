import { ConflictException, NotFoundException } from '@nestjs/common';

export function scanlationGroupCreationRequestNotFound(): NotFoundException {
  return new NotFoundException({
    statusCode: 404,
    code: 'SCANLATION_GROUP_CREATION_REQUEST_NOT_FOUND',
    message: 'Solicitud no encontrada.',
  });
}

export function scanlationGroupCreationRequestNotReviewable(): ConflictException {
  return new ConflictException({
    statusCode: 409,
    code: 'CREATION_REQUEST_NOT_REVIEWABLE',
    message: 'La solicitud no se puede revisar en su estado actual.',
  });
}

export function scanlationGroupAlreadyExists(): ConflictException {
  return new ConflictException({
    statusCode: 409,
    code: 'SCANLATION_GROUP_ALREADY_EXISTS',
    message: 'Ya existe un grupo de scanlation con ese nombre.',
  });
}

export function scanlationGroupSlugConflict(): ConflictException {
  return new ConflictException({
    statusCode: 409,
    code: 'SCANLATION_GROUP_SLUG_CONFLICT',
    message: 'No se pudo reservar una ruta para el grupo de scanlation.',
  });
}

export function scanlationGroupCreationRequestConflict(): ConflictException {
  return new ConflictException({
    statusCode: 409,
    code: 'CREATION_REQUEST_CONFLICT',
    message: 'La solicitud no pudo procesarse por un conflicto concurrente.',
  });
}
