import { BadRequestException, ConflictException } from '@nestjs/common';

export function creationRequestNotResubmittable(): ConflictException {
  return new ConflictException({
    statusCode: 409,
    code: 'CREATION_REQUEST_NOT_RESUBMITTABLE',
    message: 'La solicitud no se puede reenviar en su estado actual.',
  });
}

export function creationRequestResubmitNoChanges(): BadRequestException {
  return new BadRequestException({
    statusCode: 400,
    code: 'CREATION_REQUEST_RESUBMIT_NO_CHANGES',
    message: 'El reenvío requiere un cambio o una respuesta.',
  });
}
