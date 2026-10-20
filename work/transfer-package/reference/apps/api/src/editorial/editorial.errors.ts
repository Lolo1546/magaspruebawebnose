import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';

export function editorialConflict(
  code = 'EDITORIAL_CONFLICT',
): ConflictException {
  return new ConflictException({
    statusCode: 409,
    code,
    message: 'Editorial operation conflicts with current state.',
  });
}

export function editorialMangaNotFound(): NotFoundException {
  return new NotFoundException({
    statusCode: 404,
    code: 'EDITORIAL_MANGA_NOT_FOUND',
    message: 'Editorial manga not found.',
  });
}

export function editorialMangaDuplicate(): ConflictException {
  return editorialConflict('EDITORIAL_MANGA_DUPLICATE');
}

export function editorialMangaStale(): ConflictException {
  return editorialConflict('EDITORIAL_MANGA_STALE_VERSION');
}

export function editorialMangaNotReady(
  missingRequirements: readonly string[],
): ConflictException {
  return new ConflictException({
    statusCode: 409,
    code: 'EDITORIAL_MANGA_NOT_READY',
    message: 'Editorial manga publication requirements are incomplete.',
    missingRequirements,
  });
}

export function editorialMangaTransition(): ConflictException {
  return editorialConflict('EDITORIAL_MANGA_INVALID_TRANSITION');
}

export function editorialMangaAdultUnsupported(): ConflictException {
  return editorialConflict('EDITORIAL_MANGA_ADULT_UNSUPPORTED');
}

export function editorialMangaSlugConflict(): ConflictException {
  return editorialConflict('EDITORIAL_MANGA_SLUG_CONFLICT');
}

export function editorialMangaInvalidMetadata(): BadRequestException {
  return new BadRequestException({
    statusCode: 400,
    code: 'EDITORIAL_MANGA_INVALID_METADATA',
    message: 'Editorial manga metadata is invalid.',
  });
}

export function editorialNotFound(): NotFoundException {
  return new NotFoundException({
    statusCode: 404,
    code: 'EDITORIAL_RESOURCE_NOT_FOUND',
    message: 'Editorial resource not found.',
  });
}

export function editorialProjectNotFound(): NotFoundException {
  return new NotFoundException({
    statusCode: 404,
    code: 'EDITORIAL_PROJECT_NOT_FOUND',
    message: 'Editorial project not found.',
  });
}

export function editorialGroupNotFound(): NotFoundException {
  return new NotFoundException({
    statusCode: 404,
    code: 'EDITORIAL_GROUP_NOT_FOUND',
    message: 'Editorial group not found.',
  });
}
