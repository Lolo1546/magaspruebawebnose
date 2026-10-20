import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

export function adminUserNotFound(): NotFoundException {
  return new NotFoundException({
    statusCode: 404,
    code: 'ADMIN_USER_NOT_FOUND',
    message: 'Usuario no encontrado.',
  });
}

export function adminCommunityNotFound(): NotFoundException {
  return new NotFoundException({
    statusCode: 404,
    code: 'ADMIN_COMMUNITY_NOT_FOUND',
    message: 'Community no encontrada.',
  });
}

export function adminScanlationGroupNotFound(): NotFoundException {
  return new NotFoundException({
    statusCode: 404,
    code: 'ADMIN_SCANLATION_GROUP_NOT_FOUND',
    message: 'Grupo de scanlation no encontrado.',
  });
}

export function adminUnknownRole(): BadRequestException {
  return new BadRequestException({
    statusCode: 400,
    code: 'ADMIN_ROLE_UNKNOWN',
    message: 'El rol global no es válido.',
  });
}

export function adminUnknownPermission(): BadRequestException {
  return new BadRequestException({
    statusCode: 400,
    code: 'ADMIN_PERMISSION_UNKNOWN',
    message: 'El permiso global no es válido.',
  });
}

export function adminSelfTargetForbidden(): ForbiddenException {
  return new ForbiddenException({
    statusCode: 403,
    code: 'ADMIN_SELF_TARGET_FORBIDDEN',
    message: 'No puedes aplicar esta operación sobre tu propia cuenta.',
  });
}

export function adminTargetInvalidStatus(): ConflictException {
  return new ConflictException({
    statusCode: 409,
    code: 'ADMIN_TARGET_INVALID_STATUS',
    message: 'El estado actual de la cuenta no permite esta operación.',
  });
}

export function adminRoleAlreadyAssigned(): ConflictException {
  return new ConflictException({
    statusCode: 409,
    code: 'ADMIN_ROLE_ALREADY_ASSIGNED',
    message: 'La cuenta ya tiene asignado ese rol global.',
  });
}

export function adminRoleNotAssigned(): ConflictException {
  return new ConflictException({
    statusCode: 409,
    code: 'ADMIN_ROLE_NOT_ASSIGNED',
    message: 'La cuenta no tiene asignado ese rol global.',
  });
}

export function adminPermissionAlreadyGranted(): ConflictException {
  return new ConflictException({
    statusCode: 409,
    code: 'ADMIN_PERMISSION_ALREADY_GRANTED',
    message: 'La cuenta ya tiene concedido directamente ese permiso.',
  });
}

export function adminPermissionNotGranted(): ConflictException {
  return new ConflictException({
    statusCode: 409,
    code: 'ADMIN_PERMISSION_NOT_GRANTED',
    message: 'La cuenta no tiene una concesión directa de ese permiso.',
  });
}

export function adminPermissionGrantToAdminForbidden(): ConflictException {
  return new ConflictException({
    statusCode: 409,
    code: 'ADMIN_DIRECT_PERMISSION_FOR_ADMIN_FORBIDDEN',
    message: 'No se conceden permisos directos a una cuenta ADMIN.',
  });
}

export function lastActiveAdminRequired(): ConflictException {
  return new ConflictException({
    statusCode: 409,
    code: 'LAST_ACTIVE_ADMIN_REQUIRED',
    message: 'Debe permanecer al menos una cuenta ADMIN activa.',
  });
}

export function adminMutationConflict(): ConflictException {
  return new ConflictException({
    statusCode: 409,
    code: 'ADMIN_MUTATION_CONFLICT',
    message: 'La operación entró en conflicto con otro cambio administrativo.',
  });
}

export function adminSuspensionSanctionConflict(): ConflictException {
  return new ConflictException({
    statusCode: 409,
    code: 'ADMIN_SUSPENSION_SANCTION_CONFLICT',
    message: 'El estado de la sanción no permite esta operación.',
  });
}
