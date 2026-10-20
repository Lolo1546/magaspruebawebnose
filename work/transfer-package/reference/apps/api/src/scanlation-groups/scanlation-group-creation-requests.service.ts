import { ConflictException, Injectable } from '@nestjs/common';
import {
  CreationRequestActionType,
  Prisma,
  ScanlationGroupRequestStatus,
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
import type { CreateScanlationGroupCreationRequestDto } from './dto/create-scanlation-group-creation-request.dto.js';
import type { ResubmitScanlationGroupCreationRequestDto } from './dto/resubmit-scanlation-group-creation-request.dto.js';
import type { ScanlationGroupCreationRequestQueryDto } from './dto/scanlation-group-creation-request-query.dto.js';
import type {
  ScanlationGroupCreationRequestMutationResponseDto,
  SelfScanlationGroupCreationRequestHistoryDto,
} from './dto/scanlation-group-creation-request-response.dto.js';
import {
  scanlationGroupCreationRequestSelect,
  ScanlationGroupCreationRequestsMapper,
  selfScanlationGroupCreationRequestHistorySelect,
} from './scanlation-group-creation-requests.mapper.js';
import {
  scanlationGroupAlreadyExists,
  scanlationGroupCreationRequestNotFound,
} from './scanlation-group-creation-request-review.errors.js';

const OPEN_SCANLATION_GROUP_REQUEST_STATUSES = [
  ScanlationGroupRequestStatus.PENDING,
  ScanlationGroupRequestStatus.NEEDS_INFO,
] as const;

function conflict(code: string, message: string): never {
  throw new ConflictException({ statusCode: 409, code, message });
}

@Injectable()
export class ScanlationGroupCreationRequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mapper: ScanlationGroupCreationRequestsMapper,
  ) {}

  async submit(
    auth: AuthenticatedRequestContext,
    dto: CreateScanlationGroupCreationRequestDto,
  ): Promise<ScanlationGroupCreationRequestMutationResponseDto> {
    const requesterUserId = assertActiveMutationActor(auth);
    const proposedNameNormalized = normalizeCreationRequestName(
      dto.proposedName,
    );

    const request = await runCreationRequestSerializableTransaction(
      this.prisma,
      async (transaction) => {
        const existingGroup = await transaction.scanlationGroup.findFirst({
          where: { nameNormalized: proposedNameNormalized },
          select: { id: true },
        });
        if (existingGroup) {
          conflict(
            'SCANLATION_GROUP_ALREADY_EXISTS',
            'Ya existe un grupo de scanlation con ese nombre.',
          );
        }

        const existingOpenRequest =
          await transaction.scanlationGroupRequest.findFirst({
            where: {
              requesterUserId,
              proposedNameNormalized,
              status: { in: [...OPEN_SCANLATION_GROUP_REQUEST_STATUSES] },
            },
            select: { id: true },
          });
        if (existingOpenRequest) {
          conflict(
            'CREATION_REQUEST_ALREADY_OPEN',
            'Ya existe una solicitud abierta con ese nombre.',
          );
        }

        return transaction.scanlationGroupRequest.create({
          data: {
            requesterUserId,
            proposedName: dto.proposedName,
            proposedNameNormalized,
            description: dto.description ?? null,
            language: dto.language,
            website: dto.website ?? null,
            status: ScanlationGroupRequestStatus.PENDING,
          },
          select: scanlationGroupCreationRequestSelect,
        });
      },
    );

    return { request: this.mapper.toDto(request) };
  }

  async getHistory(
    requesterUserId: string,
    query: ScanlationGroupCreationRequestQueryDto,
  ): Promise<SelfScanlationGroupCreationRequestHistoryDto> {
    const where: Prisma.ScanlationGroupRequestWhereInput = { requesterUserId };
    const [total, requests] = await this.prisma.$transaction([
      this.prisma.scanlationGroupRequest.count({ where }),
      this.prisma.scanlationGroupRequest.findMany({
        where,
        select: selfScanlationGroupCreationRequestHistorySelect,
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
    dto: ResubmitScanlationGroupCreationRequestDto,
  ): Promise<ScanlationGroupCreationRequestMutationResponseDto> {
    const requesterUserId = assertActiveMutationActor(auth);

    const request = await runCreationRequestSerializableTransaction(
      this.prisma,
      async (transaction) => {
        const current = await transaction.scanlationGroupRequest.findFirst({
          where: { id: requestId, requesterUserId },
          select: {
            id: true,
            status: true,
            proposedName: true,
            proposedNameNormalized: true,
            description: true,
            language: true,
            website: true,
          },
        });
        if (!current) throw scanlationGroupCreationRequestNotFound();
        if (current.status !== ScanlationGroupRequestStatus.NEEDS_INFO) {
          throw creationRequestNotResubmittable();
        }

        const proposedName = dto.proposedName ?? current.proposedName;
        const proposedNameNormalized =
          dto.proposedName === undefined
            ? current.proposedNameNormalized
            : normalizeCreationRequestName(dto.proposedName);
        const description =
          dto.description === undefined ? current.description : dto.description;
        const language = dto.language ?? current.language;
        const website =
          dto.website === undefined ? current.website : dto.website;

        const duplicate = await transaction.scanlationGroupRequest.findFirst({
          where: {
            id: { not: requestId },
            requesterUserId,
            proposedNameNormalized,
            status: { in: [...OPEN_SCANLATION_GROUP_REQUEST_STATUSES] },
          },
          select: { id: true },
        });
        if (duplicate) {
          conflict(
            'CREATION_REQUEST_ALREADY_OPEN',
            'Ya existe una solicitud abierta con ese nombre.',
          );
        }

        const existingGroup = await transaction.scanlationGroup.findFirst({
          where: { nameNormalized: proposedNameNormalized },
          select: { id: true },
        });
        if (existingGroup) throw scanlationGroupAlreadyExists();

        const hasProposalChange =
          proposedName !== current.proposedName ||
          proposedNameNormalized !== current.proposedNameNormalized ||
          description !== current.description ||
          language !== current.language ||
          website !== current.website;
        if (!hasProposalChange && dto.responseMessage === undefined) {
          throw creationRequestResubmitNoChanges();
        }

        const transition = await transaction.scanlationGroupRequest.updateMany({
          where: {
            id: requestId,
            requesterUserId,
            status: ScanlationGroupRequestStatus.NEEDS_INFO,
          },
          data: {
            status: ScanlationGroupRequestStatus.PENDING,
            ...(dto.proposedName === undefined
              ? {}
              : { proposedName, proposedNameNormalized }),
            ...(dto.description === undefined ? {} : { description }),
            ...(dto.language === undefined ? {} : { language }),
            ...(dto.website === undefined ? {} : { website }),
          },
        });
        if (transition.count !== 1) {
          const reconciled = await transaction.scanlationGroupRequest.findFirst(
            {
              where: { id: requestId, requesterUserId },
              select: { id: true },
            },
          );
          if (!reconciled) throw scanlationGroupCreationRequestNotFound();
          throw creationRequestNotResubmittable();
        }

        await transaction.scanlationGroupRequestAction.create({
          data: {
            requestId,
            actorUserId: requesterUserId,
            type: CreationRequestActionType.RESUBMITTED,
            publicMessage: dto.responseMessage ?? null,
            internalNote: null,
          },
          select: { id: true },
        });

        const updated = await transaction.scanlationGroupRequest.findUnique({
          where: { id: requestId },
          select: scanlationGroupCreationRequestSelect,
        });
        if (!updated) throw scanlationGroupCreationRequestNotFound();
        return updated;
      },
    );

    return { request: this.mapper.toDto(request) };
  }
}
