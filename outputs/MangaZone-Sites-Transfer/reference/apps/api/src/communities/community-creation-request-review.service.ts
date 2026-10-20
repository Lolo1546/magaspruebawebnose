import { Injectable } from '@nestjs/common';
import {
  CreationRequestActionType,
  CommunityMemberRole,
  CommunityMemberStatus,
  CommunityRequestStatus,
  CommunityStatus,
  Prisma,
} from '../../generated/prisma/client.js';
import type { AuthenticatedRequestContext } from '../auth/types/authenticated-request-context.js';
import { runCreationRequestSerializableTransaction } from '../creation-requests/creation-request-transaction.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  communityAlreadyExists,
  communityCreationRequestNotFound,
  communityCreationRequestNotReviewable,
  communitySlugConflict,
} from './community-creation-request-review.errors.js';
import {
  communityCreationRequestModerationSelect,
  CommunityCreationRequestModerationMapper,
} from './community-creation-request-moderation.mapper.js';
import {
  createCommunitySlugBase,
  createCommunitySlugCandidates,
} from './community-slug.js';
import type { CommunityCreationRequestModerationQueryDto } from './dto/community-creation-request-moderation-query.dto.js';
import type {
  CommunityCreationRequestModerationListDto,
  CommunityCreationRequestModerationResponseDto,
} from './dto/community-creation-request-moderation-response.dto.js';
import type { RejectCommunityCreationRequestDto } from './dto/reject-community-creation-request.dto.js';
import type { RequestCommunityCreationRequestInfoDto } from './dto/request-community-creation-request-info.dto.js';

const communityApprovalRequestSelect = {
  id: true,
  requesterUserId: true,
  proposedName: true,
  proposedNameNormalized: true,
  description: true,
  relatedMangaId: true,
  status: true,
} satisfies Prisma.CommunityRequestSelect;

type CommunityReviewTransaction = Prisma.TransactionClient;

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'P2002'
  );
}

@Injectable()
export class CommunityCreationRequestReviewService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mapper: CommunityCreationRequestModerationMapper,
  ) {}

  async list(
    query: CommunityCreationRequestModerationQueryDto,
  ): Promise<CommunityCreationRequestModerationListDto> {
    const where: Prisma.CommunityRequestWhereInput = {
      status: query.status ?? CommunityRequestStatus.PENDING,
    };
    const [total, requests] = await this.prisma.$transaction([
      this.prisma.communityRequest.count({ where }),
      this.prisma.communityRequest.findMany({
        where,
        select: communityCreationRequestModerationSelect,
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);

    return {
      items: requests.map((request) => this.mapper.toDto(request)),
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        pageCount: Math.max(1, Math.ceil(total / query.pageSize)),
      },
    };
  }

  async detail(
    requestId: string,
  ): Promise<CommunityCreationRequestModerationResponseDto> {
    const request = await this.prisma.communityRequest.findUnique({
      where: { id: requestId },
      select: communityCreationRequestModerationSelect,
    });
    if (!request) throw communityCreationRequestNotFound();

    return { request: this.mapper.toDto(request) };
  }

  async approve(
    auth: AuthenticatedRequestContext,
    requestId: string,
  ): Promise<CommunityCreationRequestModerationResponseDto> {
    try {
      return await runCreationRequestSerializableTransaction(
        this.prisma,
        async (transaction) => {
          const request = await transaction.communityRequest.findUnique({
            where: { id: requestId },
            select: communityApprovalRequestSelect,
          });
          if (!request) throw communityCreationRequestNotFound();
          if (request.status !== CommunityRequestStatus.PENDING) {
            throw communityCreationRequestNotReviewable();
          }

          await this.assertNameAvailable(
            transaction,
            request.proposedNameNormalized,
          );
          const slug = await this.resolveAvailableSlug(
            transaction,
            request.proposedName,
            request.id,
          );
          const transactionNow = new Date();
          const community = await transaction.community.create({
            data: {
              slug,
              name: request.proposedName,
              nameNormalized: request.proposedNameNormalized,
              description: request.description,
              status: CommunityStatus.ACTIVE,
              ownerUserId: request.requesterUserId,
              relatedMangaId: request.relatedMangaId,
            },
            select: { id: true },
          });
          await transaction.communityMember.create({
            data: {
              communityId: community.id,
              userId: request.requesterUserId,
              role: CommunityMemberRole.OWNER,
              status: CommunityMemberStatus.ACTIVE,
              leftAt: null,
            },
            select: { id: true },
          });
          const transition = await transaction.communityRequest.updateMany({
            where: {
              id: request.id,
              status: CommunityRequestStatus.PENDING,
            },
            data: {
              status: CommunityRequestStatus.APPROVED,
              reviewerUserId: auth.userId,
              reviewedAt: transactionNow,
              createdCommunityId: community.id,
            },
          });
          if (transition.count !== 1) {
            throw communityCreationRequestNotReviewable();
          }

          const reviewed = await transaction.communityRequest.findUnique({
            where: { id: request.id },
            select: communityCreationRequestModerationSelect,
          });
          if (!reviewed) throw communityCreationRequestNotFound();

          return { request: this.mapper.toDto(reviewed) };
        },
      );
    } catch (error) {
      if (!isUniqueConstraintError(error)) throw error;
      return this.reconcileApprovalUniqueConflict(requestId);
    }
  }

  async reject(
    auth: AuthenticatedRequestContext,
    requestId: string,
    dto: RejectCommunityCreationRequestDto,
  ): Promise<CommunityCreationRequestModerationResponseDto> {
    return runCreationRequestSerializableTransaction(
      this.prisma,
      async (transaction) => {
        const request = await transaction.communityRequest.findUnique({
          where: { id: requestId },
          select: { id: true, status: true },
        });
        if (!request) throw communityCreationRequestNotFound();
        if (request.status !== CommunityRequestStatus.PENDING) {
          throw communityCreationRequestNotReviewable();
        }

        const transactionNow = new Date();
        const transition = await transaction.communityRequest.updateMany({
          where: {
            id: request.id,
            status: CommunityRequestStatus.PENDING,
          },
          data: {
            status: CommunityRequestStatus.REJECTED,
            reviewerUserId: auth.userId,
            reviewedAt: transactionNow,
            reviewReason: dto.reviewReason,
          },
        });
        if (transition.count !== 1) {
          throw communityCreationRequestNotReviewable();
        }

        const reviewed = await transaction.communityRequest.findUnique({
          where: { id: request.id },
          select: communityCreationRequestModerationSelect,
        });
        if (!reviewed) throw communityCreationRequestNotFound();

        return { request: this.mapper.toDto(reviewed) };
      },
    );
  }

  async requestInfo(
    auth: AuthenticatedRequestContext,
    requestId: string,
    dto: RequestCommunityCreationRequestInfoDto,
  ): Promise<CommunityCreationRequestModerationResponseDto> {
    return this.prisma.$transaction(async (transaction) => {
      const transition = await transaction.communityRequest.updateMany({
        where: {
          id: requestId,
          status: CommunityRequestStatus.PENDING,
        },
        data: { status: CommunityRequestStatus.NEEDS_INFO },
      });
      if (transition.count !== 1) {
        const request = await transaction.communityRequest.findUnique({
          where: { id: requestId },
          select: { id: true },
        });
        if (!request) throw communityCreationRequestNotFound();
        throw communityCreationRequestNotReviewable();
      }

      await transaction.communityRequestAction.create({
        data: {
          requestId,
          actorUserId: auth.userId,
          type: CreationRequestActionType.INFO_REQUESTED,
          publicMessage: dto.publicMessage,
          internalNote: dto.internalNote ?? null,
        },
        select: { id: true },
      });

      const updated = await transaction.communityRequest.findUnique({
        where: { id: requestId },
        select: communityCreationRequestModerationSelect,
      });
      if (!updated) throw communityCreationRequestNotFound();

      return { request: this.mapper.toDto(updated) };
    });
  }

  private async assertNameAvailable(
    transaction: CommunityReviewTransaction,
    proposedNameNormalized: string,
  ): Promise<void> {
    const existingCommunity = await transaction.community.findFirst({
      where: { nameNormalized: proposedNameNormalized },
      select: { id: true },
    });
    if (existingCommunity) throw communityAlreadyExists();
  }

  private async resolveAvailableSlug(
    transaction: CommunityReviewTransaction,
    proposedName: string,
    requestId: string,
  ): Promise<string> {
    const base = createCommunitySlugBase(proposedName, requestId);
    const candidates = createCommunitySlugCandidates(base);
    const currentSlugs = await transaction.community.findMany({
      where: { slug: { in: candidates } },
      select: { slug: true },
    });
    const historicalSlugs = await transaction.communitySlugHistory.findMany({
      where: { slug: { in: candidates } },
      select: { slug: true },
    });
    const occupied = new Set([
      ...currentSlugs.map(({ slug }) => slug),
      ...historicalSlugs.map(({ slug }) => slug),
    ]);
    const slug = candidates.find((candidate) => !occupied.has(candidate));
    if (!slug) throw communitySlugConflict();

    return slug;
  }

  private async reconcileApprovalUniqueConflict(
    requestId: string,
  ): Promise<never> {
    const request = await this.prisma.communityRequest.findUnique({
      where: { id: requestId },
      select: { status: true, proposedNameNormalized: true },
    });
    if (!request) throw communityCreationRequestNotFound();
    if (request.status !== CommunityRequestStatus.PENDING) {
      throw communityCreationRequestNotReviewable();
    }

    const existingCommunity = await this.prisma.community.findFirst({
      where: { nameNormalized: request.proposedNameNormalized },
      select: { id: true },
    });
    if (existingCommunity) throw communityAlreadyExists();
    throw communitySlugConflict();
  }
}
