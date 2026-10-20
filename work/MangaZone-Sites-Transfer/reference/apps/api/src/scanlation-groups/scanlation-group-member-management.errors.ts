import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

function conflict(code: string, message: string): ConflictException {
  return new ConflictException({ statusCode: 409, code, message });
}

export function scanlationGroupMemberNotFound(): NotFoundException {
  return new NotFoundException({
    statusCode: 404,
    code: 'SCANLATION_GROUP_MEMBER_NOT_FOUND',
    message: 'Miembro no encontrado.',
  });
}

export function scanlationGroupMemberTargetForbidden(): ForbiddenException {
  return new ForbiddenException({
    statusCode: 403,
    code: 'SCANLATION_GROUP_MEMBER_TARGET_FORBIDDEN',
    message: 'No se permite administrar este miembro.',
  });
}

export function scanlationGroupFounderProtected(): ConflictException {
  return conflict(
    'SCANLATION_GROUP_FOUNDER_PROTECTED',
    'El fundador del grupo no puede modificarse.',
  );
}

export function scanlationGroupMembershipInvalidState(): ConflictException {
  return conflict(
    'SCANLATION_GROUP_MEMBERSHIP_INVALID_STATE',
    'La membresía no admite esta transición en su estado actual.',
  );
}

export function scanlationGroupMembershipNoChanges(): ConflictException {
  return conflict(
    'SCANLATION_GROUP_MEMBERSHIP_NO_CHANGES',
    'La membresía ya tiene el estado o rol solicitado.',
  );
}

export function scanlationGroupMemberAccountIneligible(): ConflictException {
  return conflict(
    'SCANLATION_GROUP_MEMBER_ACCOUNT_INELIGIBLE',
    'La cuenta objetivo no es elegible para esta operación.',
  );
}

export function scanlationGroupOpenMembershipConflict(): ConflictException {
  return conflict(
    'SCANLATION_GROUP_OPEN_MEMBERSHIP_CONFLICT',
    'Ya existe una membresía abierta para esta cuenta.',
  );
}

export function scanlationGroupMemberRoleRequired(): ConflictException {
  return conflict(
    'SCANLATION_GROUP_MEMBER_ROLE_REQUIRED',
    'Una membresía abierta debe conservar al menos un rol.',
  );
}

export function scanlationGroupMembershipConflict(): ConflictException {
  return conflict(
    'SCANLATION_GROUP_MEMBERSHIP_CONFLICT',
    'La membresía cambió concurrentemente.',
  );
}
