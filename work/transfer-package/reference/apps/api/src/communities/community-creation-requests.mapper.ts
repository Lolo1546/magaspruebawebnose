import { Injectable } from '@nestjs/common';
import {
  CommunityRequestStatus,
  CreationRequestActionType,
  Prisma,
} from '../../generated/prisma/client.js';
import type { SelfCommunityCreationRequestDto } from './dto/community-creation-request-response.dto.js';

export const communityCreationRequestSelect = {
  id: true,
  proposedName: true,
  description: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  reviewedAt: true,
  relatedManga: { select: { id: true, slug: true, title: true } },
  createdCommunity: { select: { id: true, slug: true, name: true } },
} satisfies Prisma.CommunityRequestSelect;

export const selfCommunityCreationRequestHistorySelect = {
  ...communityCreationRequestSelect,
  actions: {
    where: { type: CreationRequestActionType.INFO_REQUESTED },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: 1,
    select: { publicMessage: true, createdAt: true },
  },
} satisfies Prisma.CommunityRequestSelect;

export type CommunityCreationRequestProjection =
  Prisma.CommunityRequestGetPayload<{
    select: typeof communityCreationRequestSelect;
  }>;

export type SelfCommunityCreationRequestHistoryProjection =
  Prisma.CommunityRequestGetPayload<{
    select: typeof selfCommunityCreationRequestHistorySelect;
  }>;

@Injectable()
export class CommunityCreationRequestsMapper {
  toDto(
    request: CommunityCreationRequestProjection,
  ): SelfCommunityCreationRequestDto {
    return {
      id: request.id,
      proposedName: request.proposedName,
      description: request.description,
      relatedManga: request.relatedManga
        ? {
            id: request.relatedManga.id,
            slug: request.relatedManga.slug,
            title: request.relatedManga.title,
          }
        : null,
      status: request.status,
      createdAt: request.createdAt.toISOString(),
      updatedAt: request.updatedAt.toISOString(),
      reviewedAt: request.reviewedAt?.toISOString() ?? null,
      createdCommunity: request.createdCommunity
        ? {
            id: request.createdCommunity.id,
            slug: request.createdCommunity.slug,
            name: request.createdCommunity.name,
          }
        : null,
      latestInfoRequest: null,
    };
  }

  toHistoryDto(
    request: SelfCommunityCreationRequestHistoryProjection,
  ): SelfCommunityCreationRequestDto {
    const action = request.actions[0];
    const latestInfoRequest =
      request.status === CommunityRequestStatus.NEEDS_INFO &&
      action?.publicMessage != null
        ? {
            message: action.publicMessage,
            createdAt: action.createdAt.toISOString(),
          }
        : null;

    return { ...this.toDto(request), latestInfoRequest };
  }
}
