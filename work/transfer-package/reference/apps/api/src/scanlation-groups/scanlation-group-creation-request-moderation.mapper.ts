import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import type { ScanlationGroupCreationRequestModerationDto } from './dto/scanlation-group-creation-request-moderation-response.dto.js';

export const scanlationGroupCreationRequestModerationSelect = {
  id: true,
  proposedName: true,
  description: true,
  language: true,
  website: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  reviewedAt: true,
  reviewReason: true,
  createdGroup: { select: { id: true, slug: true, name: true } },
  requester: {
    select: {
      id: true,
      username: true,
      profile: { select: { displayName: true } },
    },
  },
} satisfies Prisma.ScanlationGroupRequestSelect;

export type ScanlationGroupCreationRequestModerationProjection =
  Prisma.ScanlationGroupRequestGetPayload<{
    select: typeof scanlationGroupCreationRequestModerationSelect;
  }>;

@Injectable()
export class ScanlationGroupCreationRequestModerationMapper {
  toDto(
    request: ScanlationGroupCreationRequestModerationProjection,
  ): ScanlationGroupCreationRequestModerationDto {
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
      reviewReason: request.reviewReason,
      createdGroup: request.createdGroup,
      requester: {
        id: request.requester.id,
        username: request.requester.username,
        displayName: request.requester.profile?.displayName ?? null,
      },
    };
  }
}
