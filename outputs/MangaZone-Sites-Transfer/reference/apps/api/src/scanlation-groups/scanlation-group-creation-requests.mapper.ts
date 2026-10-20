import { Injectable } from '@nestjs/common';
import {
  CreationRequestActionType,
  Prisma,
  ScanlationGroupRequestStatus,
} from '../../generated/prisma/client.js';
import type { SelfScanlationGroupCreationRequestDto } from './dto/scanlation-group-creation-request-response.dto.js';

export const scanlationGroupCreationRequestSelect = {
  id: true,
  proposedName: true,
  description: true,
  language: true,
  website: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  reviewedAt: true,
  createdGroup: { select: { id: true, slug: true, name: true } },
} satisfies Prisma.ScanlationGroupRequestSelect;

export const selfScanlationGroupCreationRequestHistorySelect = {
  ...scanlationGroupCreationRequestSelect,
  actions: {
    where: { type: CreationRequestActionType.INFO_REQUESTED },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: 1,
    select: { publicMessage: true, createdAt: true },
  },
} satisfies Prisma.ScanlationGroupRequestSelect;

export type ScanlationGroupCreationRequestProjection =
  Prisma.ScanlationGroupRequestGetPayload<{
    select: typeof scanlationGroupCreationRequestSelect;
  }>;

export type SelfScanlationGroupCreationRequestHistoryProjection =
  Prisma.ScanlationGroupRequestGetPayload<{
    select: typeof selfScanlationGroupCreationRequestHistorySelect;
  }>;

@Injectable()
export class ScanlationGroupCreationRequestsMapper {
  toDto(
    request: ScanlationGroupCreationRequestProjection,
  ): SelfScanlationGroupCreationRequestDto {
    return {
      id: request.id,
      proposedName: request.proposedName,
      description: request.description,
      language: request.language,
      website: request.website,
      status: request.status,
      createdAt: request.createdAt.toISOString(),
      updatedAt: request.updatedAt.toISOString(),
      reviewedAt: request.reviewedAt?.toISOString() ?? null,
      createdGroup: request.createdGroup
        ? {
            id: request.createdGroup.id,
            slug: request.createdGroup.slug,
            name: request.createdGroup.name,
          }
        : null,
      latestInfoRequest: null,
    };
  }

  toHistoryDto(
    request: SelfScanlationGroupCreationRequestHistoryProjection,
  ): SelfScanlationGroupCreationRequestDto {
    const action = request.actions[0];
    const latestInfoRequest =
      request.status === ScanlationGroupRequestStatus.NEEDS_INFO &&
      action?.publicMessage != null
        ? {
            message: action.publicMessage,
            createdAt: action.createdAt.toISOString(),
          }
        : null;

    return { ...this.toDto(request), latestInfoRequest };
  }
}
