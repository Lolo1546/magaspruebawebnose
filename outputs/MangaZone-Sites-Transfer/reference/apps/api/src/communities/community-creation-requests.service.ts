import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CommunityRequestStatus,
  CreationRequestActionType,
  Prisma,
} from '../../generated/prisma/client.js';
import { assertActiveMutationActor } from '../auth/assert-active-mutation-actor.js';
import type { AuthenticatedRequestContext } from '../auth/types/authenticated-request-context.js';
import { normalizeCreationRequestName } from '../creation-requests/creation-request-name-normalizer.js';
import {
  creationRequestNotResubmittable,
  creationRequestResubmitNoChanges,
} from '../creation-requests/creation-request-resubmit.errors.js';
import { runCreationRequestSerializableTransaction } from '../creation-requests/creation-request-transaction.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  communityCreationRequestSelect,
  CommunityCreationRequestsMapper,
  selfCommunityCreationRequestHistorySelect,
} from './community-creation-requests.mapper.js';
import {
  communityAlreadyExists,
  communityCreationRequestNotFound,
} from './community-creation-request-review.errors.js';
import type { CreateCommunityCreationRequestDto } from './dto/create-community-creation-request.dto.js';
import type { CommunityCreationRequestQueryDto } from './dto/community-creation-request-query.dto.js';
import type {
  CommunityCreationRequestMutationResponseDto,
  SelfCommunityCreationRequestHistoryDto,
} from './dto/community-creation-request-response.dto.js';
import type { ResubmitCommunityCreationRequestDto } from './dto/resubmit-community-creation-request.dto.js';

const OPEN_COMMUNITY_REQUEST_STATUSES = [
  CommunityRequestStatus.PENDING,
  CommunityRequestStatus.NEEDS_INFO,
] as const;

function conflict(code: string, message: string): never {
  throw new ConflictException({ statusCode: 409, code, message });
}

@Injectable()
export class CommunityCreationRequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mapper: CommunityCreationRequestsMapper,
  ) {}

  async submit(
    auth: AuthenticatedRequestContext,
    dto: CreateCommunityCreationRequestDto,
  ): Promise<CommunityCreationRequestMutationResponseDto> {
    const requesterUserId = assertActiveMutationActor(auth);
    const proposedNameNormalized = normalizeCreationRequestName(
      dto.proposedName,
    );

    const request = await runCreationRequestSerializableTransaction(
      this.prisma,
      async (transaction) => {
        if (dto.relatedMangaId) {
          const manga = await transaction.manga.findUnique({
            where: { id: dto.relatedMangaId },
            select: { id: true },
          });
          if (!manga) {
            throw new NotFoundException({
              statusCode: 404,
              code: 'RELATED_MANGA_NOT_FOUND',
              message: 'El manga relacionado no está disponible.',
            });
          }
        }

        const existingCommunity = await transaction.community.findFirst({
          where: { nameNormalized: proposedNameNormalized },
          select: { id: true },
        });
        if (existingCommunity) {
          conflict(
            'COMMUNITY_ALREADY_EXISTS',
            'Ya existe una comunidad con ese nombre.',
          );
        }

        const existingOpenRequest =
          await transaction.communityRequest.findFirst({
            where: {
              requesterUserId,
              proposedNameNormalized,
              status: { in: [...OPEN_COMMUNITY_REQUEST_STATUSES] },
            },
            select: { id: true },
          });
        if (existingOpenRequest) {
          conflict(
            'CREATION_REQUEST_ALREADY_OPEN',
            'Ya existe una solicitud abierta con ese nombre.',
          );
        }

        return transaction.communityRequest.create({
          data: {
            requesterUserId,
            proposedName: dto.proposedName,
            proposedNameNormalized,
            description: dto.description ?? null,
            relatedMangaId: dto.relatedMangaId ?? null,
            status: CommunityRequestStatus.PENDING,
          },
          select: communityCreationRequestSelect,
        });
      },
    );

    return { request: this.mapper.toDto(request) };
  }

  async getHistory(
    requesterUserId: string,
    query: CommunityCreationRequestQueryDto,
  ): Promise<SelfCommunityCreationRequestHistoryDto> {
    const where: Prisma.CommunityRequestWhereInput = { requesterUserId };
    const [total, requests] = await this.prisma.$transaction([
      this.prisma.communityRequest.count({ where }),
      this.prisma.communityRequest.findMany({
        where,
        select: selfCommunityCreationRequestHistorySelect,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);

    return {
      items: requests.map((request) => this.mapper.toHistoryDto(request)),
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        pageCount: Math.max(1, Math.ceil(total / query.pageSize)),
      },
    };
  }

  async resubmit(
    auth: AuthenticatedRequestContext,
    requestId: string,
    dto: ResubmitCommunityCreationRequestDto,
  ): Promise<CommunityCreationRequestMutationResponseDto> {
    const requesterUserId = assertActiveMutationActor(auth);

    const request = await runCreationRequestSerializableTransaction(
      this.prisma,
      async (transaction) => {
        const current = await transaction.communityRequest.findFirst({
          where: { id: requestId, requesterUserId },
          select: {
            id: true,
            status: true,
            proposedName: true,
            proposedNameNormalized: true,
            description: true,
            relatedMangaId: true,
          },
        });
        if (!current) throw communityCreationRequestNotFound();
        if (current.status !== CommunityRequestStatus.NEEDS_INFO) {
          throw creationRequestNotResubmittable();
        }

        const proposedName = dto.proposedName ?? current.proposedName;
        const proposedNameNormalized =
          dto.proposedName === undefined
            ? current.proposedNameNormalized
            : normalizeCreationRequestName(dto.proposedName);
        const description =
          dto.description === undefined ? current.description : dto.description;
        const relatedMangaId =
          dto.relatedMangaId === undefined
            ? current.relatedMangaId
            : dto.relatedMangaId;

        if (dto.relatedMangaId !== undefined && relatedMangaId !== null) {
          const manga = await transaction.manga.findUnique({
            where: { id: relatedMangaId },
            select: { id: true },
          });
          if (!manga) {
            throw new NotFoundException({
              statusCode: 404,
              code: 'RELATED_MANGA_NOT_FOUND',
              message: 'El manga relacionado no estÃ¡ disponible.',
            });
          }
        }

        const duplicate = await transaction.communityRequest.findFirst({
          where: {
            id: { not: requestId },
            requesterUserId,
            proposedNameNormalized,
            status: { in: [...OPEN_COMMUNITY_REQUEST_STATUSES] },
          },
          select: { id: true },
        });
        if (duplicate) {
          conflict(
            'CREATION_REQUEST_ALREADY_OPEN',
            'Ya existe una solicitud abierta con ese nombre.',
          );
        }

        const existingCommunity = await transaction.community.findFirst({
          where: { nameNormalized: proposedNameNormalized },
          select: { id: true },
        });
        if (existingCommunity) throw communityAlreadyExists();

        const hasProposalChange =
          proposedName !== current.proposedName ||
          proposedNameNormalized !== current.proposedNameNormalized ||
          description !== current.description ||
          relatedMangaId !== current.relatedMangaId;
        if (!hasProposalChange && dto.responseMessage === undefined) {
          throw creationRequestResubmitNoChanges();
        }

        const transition = await transaction.communityRequest.updateMany({
          where: {
            id: requestId,
            requesterUserId,
            status: CommunityRequestStatus.NEEDS_INFO,
          },
          data: {
            status: CommunityRequestStatus.PENDING,
            ...(dto.proposedName === undefined
              ? {}
              : { proposedName, proposedNameNormalized }),
            ...(dto.description === undefined ? {} : { description }),
            ...(dto.relatedMangaId === undefined ? {} : { relatedMangaId }),
          },
        });
        if (transition.count !== 1) {
          const reconciled = await transaction.communityRequest.findFirst({
            where: { id: requestId, requesterUserId },
            select: { id: true },
          });
          if (!reconciled) throw communityCreationRequestNotFound();
          throw creationRequestNotResubmittable();
        }

        await transaction.communityRequestAction.create({
          data: {
            requestId,
            actorUserId: requesterUserId,
            type: CreationRequestActionType.RESUBMITTED,
            publicMessage: dto.responseMessage ?? null,
            internalNote: null,
          },
          select: { id: true },
        });

        const updated = await transaction.communityRequest.findUnique({
          where: { id: requestId },
          select: communityCreationRequestSelect,
        });
        if (!updated) throw communityCreationRequestNotFound();
        return updated;
      },
    );

    return { request: this.mapper.toDto(request) };
  }
}
