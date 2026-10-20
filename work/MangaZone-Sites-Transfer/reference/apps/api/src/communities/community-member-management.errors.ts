import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

function conflict(code: string, message: string): ConflictException {
  return new ConflictException({ statusCode: 409, code, message });
}

export function communityMemberNotFound(): NotFoundException {
  return new NotFoundException({
    statusCode: 404,
    code: 'COMMUNITY_MEMBER_NOT_FOUND',
    message: 'Miembro no encontrado.',
  });
}

export function communityOwnerProtected(): ConflictException {
  return conflict(
    'COMMUNITY_OWNER_PROTECTED',
    'El propietario de la comunidad no puede modificarse.',
  );
}

export function communityMemberTargetForbidden(): ForbiddenException {
  return new ForbiddenException({
    statusCode: 403,
    code: 'COMMUNITY_MEMBER_TARGET_FORBIDDEN',
    message: 'No se permite administrar este miembro.',
  });
}

export function communityMembershipInvalidState(): ConflictException {
  return conflict(
    'COMMUNITY_MEMBERSHIP_INVALID_STATE',
    'La membresía no admite esta transición en su estado actual.',
  );
}

export function communityMembershipNoChanges(): ConflictException {
  return conflict(
    'COMMUNITY_MEMBERSHIP_NO_CHANGES',
    'La membresía ya tiene el rol solicitado.',
  );
}

export function communityMemberAccountIneligible(): ConflictException {
  return conflict(
    'COMMUNITY_MEMBER_ACCOUNT_INELIGIBLE',
    'La cuenta del miembro no es elegible para esta operación.',
  );
}

export function communityMembershipConflict(): ConflictException {
  return conflict(
    'COMMUNITY_MEMBERSHIP_CONFLICT',
    'La membresía cambió concurrentemente.',
  );
}
