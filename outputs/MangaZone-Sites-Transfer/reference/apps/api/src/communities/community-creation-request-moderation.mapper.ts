import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import type { CommunityCreationRequestModerationDto } from './dto/community-creation-request-moderation-response.dto.js';

export const communityCreationRequestModerationSelect = {
  id: true,
  proposedName: true,
  description: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  reviewedAt: true,
  reviewReason: true,
  relatedManga: { select: { id: true, slug: true, title: true } },
  createdCommunity: { select: { id: true, slug: true, name: true } },
  requester: {
    select: {
      id: true,
      username: true,
      profile: { select: { displayName: true } },
    },
  },
} satisfies Prisma.CommunityRequestSelect;

export type CommunityCreationRequestModerationProjection =
  Prisma.CommunityRequestGetPayload<{
    select: typeof communityCreationRequestModerationSelect;
  }>;

@Injectable()
export class CommunityCreationRequestModerationMapper {
  toDto(
    request: CommunityCreationRequestModerationProjection,
  ): CommunityCreationRequestModerationDto {
    return {
      id: request.id,
      proposedName: request.proposedName,
      description: request.description,
      relatedManga: request.relatedManga,
      status: request.status,
      createdAt: request.createdAt.toISOString(),
      updatedAt: request.updatedAt.toISOString(),
      reviewedAt: request.reviewedAt?.toISOString() ?? null,
      reviewReason: request.reviewReason,
      createdCommunity: request.createdCommunity,
      requester: {
        id: request.requester.id,
        username: request.requester.username,
        displayName: request.requester.profile?.displayName ?? null,
      },
    };
  }
}
