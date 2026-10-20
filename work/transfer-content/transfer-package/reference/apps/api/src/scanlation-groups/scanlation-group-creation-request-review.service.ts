import { Injectable } from '@nestjs/common';
import {
  CreationRequestActionType,
  Prisma,
  ScanlationGroupMemberStatus,
  ScanlationGroupRequestStatus,
  ScanlationGroupRole,
  ScanlationGroupStatus,
} from '../../generated/prisma/client.js';
import type { AuthenticatedRequestContext } from '../auth/types/authenticated-request-context.js';
import { runCreationRequestSerializableTransaction } from '../creation-requests/creation-request-transaction.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { RejectScanlationGroupCreationRequestDto } from './dto/reject-scanlation-group-creation-request.dto.js';
import type { RequestScanlationGroupCreationRequestInfoDto } from './dto/request-scanlation-group-creation-request-info.dto.js';
import type { ScanlationGroupCreationRequestModerationQueryDto } from './dto/scanlation-group-creation-request-moderation-query.dto.js';
import type {
  ScanlationGroupCreationRequestModerationListDto,
  ScanlationGroupCreationRequestModerationResponseDto,
} from './dto/scanlation-group-creation-request-moderation-response.dto.js';
import {
  scanlationGroupAlreadyExists,
  scanlationGroupCreationRequestConflict,
  scanlationGroupCreationRequestNotFound,
  scanlationGroupCreationRequestNotReviewable,
  scanlationGroupSlugConflict,
} from './scanlation-group-creation-request-review.errors.js';
import {
  scanlationGroupCreationRequestModerationSelect,
  ScanlationGroupCreationRequestModerationMapper,
} from './scanlation-group-creation-request-moderation.mapper.js';
import {
  createScanlationGroupSlugBase,
  createScanlationGroupSlugCandidates,
} from './scanlation-group-slug.js';

const scanlationGroupApprovalRequestSelect = {
  id: true,
  requesterUserId: true,
  proposedName: true,
  proposedNameNormalized: true,
  description: true,
  language: true,
  website: true,
  status: true,
} satisfies Prisma.ScanlationGroupRequestSelect;

type ScanlationGroupReviewTransaction = Prisma.TransactionClient;

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'P2002'
  );
}

@Injectable()
export class ScanlationGroupCreationRequestReviewService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mapper: ScanlationGroupCreationRequestModerationMapper,
  ) {}

  async list(
    query: ScanlationGroupCreationRequestModerationQueryDto,
  ): Promise<ScanlationGroupCreationRequestModerationListDto> {
    const where: Prisma.ScanlationGroupRequestWhereInput = {
      status: query.status ?? ScanlationGroupRequestStatus.PENDING,
    };
    const [total, requests] = await this.prisma.$transaction([
      this.prisma.scanlationGroupRequest.count({ where }),
      this.prisma.scanlationGroupRequest.findMany({
        where,
        select: scanlationGroupCreationRequestModerationSelect,
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
  ): Promise<ScanlationGroupCreationRequestModerationResponseDto> {
    const request = await this.prisma.scanlationGroupRequest.findUnique({
      where: { id: requestId },
      select: scanlationGroupCreationRequestModerationSelect,
    });
    if (!request) throw scanlationGroupCreationRequestNotFound();

    return { request: this.mapper.toDto(request) };
  }

  async approve(
    auth: AuthenticatedRequestContext,
    requestId: string,
  ): Promise<ScanlationGroupCreationRequestModerationResponseDto> {
    let attemptedSlug: string | null = null;

    try {
      return await runCreationRequestSerializableTransaction(
        this.prisma,
        async (transaction) => {
          const request = await transaction.scanlationGroupRequest.findUnique({
            where: { id: requestId },
            select: scanlationGroupApprovalRequestSelect,
          });
          if (!request) throw scanlationGroupCreationRequestNotFound();
          if (request.status !== ScanlationGroupRequestStatus.PENDING) {
            throw scanlationGroupCreationRequestNotReviewable();
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
          attemptedSlug = slug;
          const transactionNow = new Date();
          const group = await transaction.scanlationGroup.create({
            data: {
              slug,
              name: request.proposedName,
              nameNormalized: request.proposedNameNormalized,
              description: request.description,
              language: request.language,
              website: request.website,
              status: ScanlationGroupStatus.VERIFIED,
              verifiedAt: transactionNow,
              createdByUserId: request.requesterUserId,
            },
            select: { id: true },
          });
          const membership = await transaction.scanlationGroupMember.create({
            data: {
              groupId: group.id,
              userId: request.requesterUserId,
              status: ScanlationGroupMemberStatus.ACTIVE,
              leftAt: null,
            },
            select: { id: true },
          });
          await transaction.scanlationGroupMemberRole.create({
            data: {
              membershipId: membership.id,
              role: ScanlationGroupRole.FOUNDER,
            },
          });
          const transition =
            await transaction.scanlationGroupRequest.updateMany({
              where: {
                id: request.id,
                status: ScanlationGroupRequestStatus.PENDING,
              },
              data: {
                status: ScanlationGroupRequestStatus.APPROVED,
                reviewerUserId: auth.userId,
                reviewedAt: transactionNow,
                createdGroupId: group.id,
              },
            });
          if (transition.count !== 1) {
            throw scanlationGroupCreationRequestNotReviewable();
          }

          const reviewed = await transaction.scanlationGroupRequest.findUnique({
            where: { id: request.id },
            select: scanlationGroupCreationRequestModerationSelect,
          });
          if (!reviewed) throw scanlationGroupCreationRequestNotFound();

          return { request: this.mapper.toDto(reviewed) };
        },
      );
    } catch (error) {
      if (!isUniqueConstraintError(error)) throw error;
      return this.reconcileApprovalUniqueConflict(requestId, attemptedSlug);
    }
  }

  async reject(
    auth: AuthenticatedRequestContext,
    requestId: string,
    dto: RejectScanlationGroupCreationRequestDto,
  ): Promise<ScanlationGroupCreationRequestModerationResponseDto> {
    return runCreationRequestSerializableTransaction(
      this.prisma,
      async (transaction) => {
        const request = await transaction.scanlationGroupRequest.findUnique({
          where: { id: requestId },
          select: { id: true, status: true },
        });
        if (!request) throw scanlationGroupCreationRequestNotFound();
        if (request.status !== ScanlationGroupRequestStatus.PENDING) {
          throw scanlationGroupCreationRequestNotReviewable();
        }

        const transactionNow = new Date();
        const transition = await transaction.scanlationGroupRequest.updateMany({
          where: {
            id: request.id,
            status: ScanlationGroupRequestStatus.PENDING,
          },
          data: {
            status: ScanlationGroupRequestStatus.REJECTED,
            reviewerUserId: auth.userId,
            reviewedAt: transactionNow,
            reviewReason: dto.reviewReason,
          },
        });
        if (transition.count !== 1) {
          throw scanlationGroupCreationRequestNotReviewable();
        }

        const reviewed = await transaction.scanlationGroupRequest.findUnique({
          where: { id: request.id },
          select: scanlationGroupCreationRequestModerationSelect,
        });
        if (!reviewed) throw scanlationGroupCreationRequestNotFound();

        return { request: this.mapper.toDto(reviewed) };
      },
    );
  }

  async requestInfo(
    auth: AuthenticatedRequestContext,
    requestId: string,
    dto: RequestScanlationGroupCreationRequestInfoDto,
  ): Promise<ScanlationGroupCreationRequestModerationResponseDto> {
    return this.prisma.$transaction(async (transaction) => {
      const transition = await transaction.scanlationGroupRequest.updateMany({
        where: {
          id: requestId,
          status: ScanlationGroupRequestStatus.PENDING,
        },
        data: { status: ScanlationGroupRequestStatus.NEEDS_INFO },
      });
      if (transition.count !== 1) {
        const request = await transaction.scanlationGroupRequest.findUnique({
          where: { id: requestId },
          select: { id: true },
        });
        if (!request) throw scanlationGroupCreationRequestNotFound();
        throw scanlationGroupCreationRequestNotReviewable();
      }

      await transaction.scanlationGroupRequestAction.create({
        data: {
          requestId,
          actorUserId: auth.userId,
          type: CreationRequestActionType.INFO_REQUESTED,
          publicMessage: dto.publicMessage,
          internalNote: dto.internalNote ?? null,
        },
        select: { id: true },
      });

      const updated = await transaction.scanlationGroupRequest.findUnique({
        where: { id: requestId },
        select: scanlationGroupCreationRequestModerationSelect,
      });
      if (!updated) throw scanlationGroupCreationRequestNotFound();

      return { request: this.mapper.toDto(updated) };
    });
  }

  private async assertNameAvailable(
    transaction: ScanlationGroupReviewTransaction,
    proposedNameNormalized: string,
  ): Promise<void> {
    const existingGroup = await transaction.scanlationGroup.findFirst({
      where: { nameNormalized: proposedNameNormalized },
      select: { id: true },
    });
    if (existingGroup) throw scanlationGroupAlreadyExists();
  }

  private async resolveAvailableSlug(
    transaction: ScanlationGroupReviewTransaction,
    proposedName: string,
    requestId: string,
  ): Promise<string> {
    const base = createScanlationGroupSlugBase(proposedName, requestId);
    const candidates = createScanlationGroupSlugCandidates(base);
    const currentSlugs = await transaction.scanlationGroup.findMany({
      where: { slug: { in: candidates } },
      select: { slug: true },
    });
    const historicalSlugs =
      await transaction.scanlationGroupSlugHistory.findMany({
        where: { slug: { in: candidates } },
        select: { slug: true },
      });
    const occupied = new Set([
      ...currentSlugs.map(({ slug }) => slug),
      ...historicalSlugs.map(({ slug }) => slug),
    ]);
    const slug = candidates.find((candidate) => !occupied.has(candidate));
    if (!slug) throw scanlationGroupSlugConflict();

    return slug;
  }

  private async reconcileApprovalUniqueConflict(
    requestId: string,
    attemptedSlug: string | null,
  ): Promise<never> {
    const request = await this.prisma.scanlationGroupRequest.findUnique({
      where: { id: requestId },
      select: { status: true, proposedNameNormalized: true },
    });
    if (!request) throw scanlationGroupCreationRequestNotFound();
    if (request.status !== ScanlationGroupRequestStatus.PENDING) {
      throw scanlationGroupCreationRequestNotReviewable();
    }

    const existingGroup = await this.prisma.scanlationGroup.findFirst({
      where: { nameNormalized: request.proposedNameNormalized },
      select: { id: true },
    });
    if (existingGroup) throw scanlationGroupAlreadyExists();

    if (attemptedSlug) {
      const [currentSlug, historicalSlug] = await Promise.all([
        this.prisma.scanlationGroup.findUnique({
          where: { slug: attemptedSlug },
          select: { id: true },
        }),
        this.prisma.scanlationGroupSlugHistory.findUnique({
          where: { slug: attemptedSlug },
          select: { id: true },
        }),
      ]);
      if (currentSlug || historicalSlug) throw scanlationGroupSlugConflict();
    }

    throw scanlationGroupCreationRequestConflict();
  }
}
