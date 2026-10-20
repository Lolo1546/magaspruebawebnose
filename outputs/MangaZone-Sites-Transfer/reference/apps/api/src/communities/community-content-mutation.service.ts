import { Injectable } from '@nestjs/common';
import {
  CommunityMemberStatus,
  CommunityStatus,
  ContentDeletionRequestStatus,
  ModerationActionType,
  ModerationTargetType,
  PostCommentStatus,
  PostStatus,
  Prisma,
} from '../../generated/prisma/client.js';
import { assertActiveMutationActor } from '../auth/assert-active-mutation-actor.js';
import type { AuthenticatedRequestContext } from '../auth/types/authenticated-request-context.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CommunityAuthorizationService } from './community-authorization.service.js';
import {
  activeCommunityNotFound,
  communityCommentNotFound,
  communityCommentParentInvalid,
  communityContentAuthorForbidden,
  communityContentConflict,
  communityContentInvalidState,
  communityContentMembershipRequired,
  communityContentNoChanges,
  communityPostNotFound,
  communitySpoilerInvalid,
  contentDeletionRequestAlreadyOpen,
} from './community-content-mutation.errors.js';
import {
  CommunitiesMapper,
  PUBLIC_POST_COMMENT_SELECT,
  PUBLIC_POST_SELECT,
} from './communities.mapper.js';
import type {
  CommunityContentDeletionRequestDto,
  CreateCommunityPostCommentDto,
  CreateCommunityPostDto,
  EditCommunityPostCommentDto,
  EditCommunityPostDto,
} from './dto/community-content-mutation.dto.js';
import type {
  CommunityCommentMutationResponseDto,
  CommunityContentDeletionRequestResponseDto,
  CommunityPostMutationResponseDto,
} from './dto/community-content-mutation-response.dto.js';

const SERIALIZABLE_MAX_ATTEMPTS = 3;

const participantMembershipWhere = (userId: string) => ({
  userId,
  status: CommunityMemberStatus.ACTIVE,
  leftAt: null,
});

const activeCommunityParticipantSelect = (userId: string) =>
  ({
    id: true,
    relatedMangaId: true,
    members: {
      where: participantMembershipWhere(userId),
      take: 1,
      select: { id: true },
    },
  }) satisfies Prisma.CommunitySelect;

type ActiveParticipantCommunity = Prisma.CommunityGetPayload<{
  select: ReturnType<typeof activeCommunityParticipantSelect>;
}>;

const postAuthorStateSelect = (userId: string) =>
  ({
    id: true,
    authorUserId: true,
    title: true,
    body: true,
    status: true,
    isSpoiler: true,
    spoilerChapterId: true,
    spoilerLabel: true,
    updatedAt: true,
    community: {
      select: {
        id: true,
        status: true,
        relatedMangaId: true,
        members: {
          where: participantMembershipWhere(userId),
          take: 1,
          select: { id: true },
        },
      },
    },
  }) satisfies Prisma.PostSelect;

type PostAuthorState = Prisma.PostGetPayload<{
  select: ReturnType<typeof postAuthorStateSelect>;
}>;

const commentAuthorStateSelect = (userId: string) =>
  ({
    id: true,
    authorUserId: true,
    body: true,
    status: true,
    updatedAt: true,
    post: {
      select: {
        id: true,
        status: true,
        community: {
          select: {
            id: true,
            status: true,
            members: {
              where: participantMembershipWhere(userId),
              take: 1,
              select: { id: true },
            },
          },
        },
      },
    },
  }) satisfies Prisma.PostCommentSelect;

type CommentAuthorState = Prisma.PostCommentGetPayload<{
  select: ReturnType<typeof commentAuthorStateSelect>;
}>;

function isSerializableConflict(error: unknown): boolean {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2034'
  ) {
    return true;
  }
  if (typeof error !== 'object' || error === null || !('cause' in error)) {
    return false;
  }
  const cause = error.cause;
  return (
    typeof cause === 'object' &&
    cause !== null &&
    'originalCode' in cause &&
    cause.originalCode === '40001' &&
    'kind' in cause &&
    cause.kind === 'TransactionWriteConflict'
  );
}

function assertParticipant(community: ActiveParticipantCommunity): void {
  if (community.members.length !== 1) {
    throw communityContentMembershipRequired();
  }
}

function assertPostParticipant(
  post: PostAuthorState,
  actorUserId: string,
): void {
  if (post.authorUserId !== actorUserId) {
    throw communityContentAuthorForbidden();
  }
  if (post.community.members.length !== 1) {
    throw communityContentMembershipRequired();
  }
}

function assertCommentParticipant(
  comment: CommentAuthorState,
  actorUserId: string,
): void {
  if (comment.authorUserId !== actorUserId) {
    throw communityContentAuthorForbidden();
  }
  if (comment.post.community.members.length !== 1) {
    throw communityContentMembershipRequired();
  }
}

function normalizeCreateSpoiler(dto: CreateCommunityPostDto) {
  const isSpoiler = dto.isSpoiler ?? false;
  const spoilerChapterId = dto.spoilerChapterId ?? null;
  const spoilerLabel = dto.spoilerLabel ?? null;
  if (
    (!isSpoiler && (spoilerChapterId !== null || spoilerLabel !== null)) ||
    (isSpoiler && spoilerChapterId === null && spoilerLabel === null)
  ) {
    throw communitySpoilerInvalid();
  }
  return { isSpoiler, spoilerChapterId, spoilerLabel };
}

function normalizeEditedSpoiler(
  post: PostAuthorState,
  dto: EditCommunityPostDto,
) {
  const isSpoiler = dto.isSpoiler ?? post.isSpoiler;
  const spoilerChapterId =
    dto.spoilerChapterId === undefined
      ? post.spoilerChapterId
      : dto.spoilerChapterId;
  const spoilerLabel =
    dto.spoilerLabel === undefined ? post.spoilerLabel : dto.spoilerLabel;

  if (!isSpoiler) {
    return { isSpoiler, spoilerChapterId: null, spoilerLabel: null };
  }
  if (spoilerChapterId === null && spoilerLabel === null) {
    throw communitySpoilerInvalid();
  }
  return { isSpoiler, spoilerChapterId, spoilerLabel };
}

@Injectable()
export class CommunityContentMutationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mapper: CommunitiesMapper,
    private readonly communityAuthorization: CommunityAuthorizationService,
  ) {}

  createPost(
    slug: string,
    dto: CreateCommunityPostDto,
    auth: AuthenticatedRequestContext,
  ): Promise<CommunityPostMutationResponseDto> {
    const actorUserId = assertActiveMutationActor(auth);
    return this.runSerializable(async (tx) => {
      const community = await this.getActiveParticipantCommunity(
        tx,
        slug,
        actorUserId,
      );
      const spoiler = normalizeCreateSpoiler(dto);
      await this.assertSpoilerChapter(
        tx,
        community.relatedMangaId,
        spoiler.spoilerChapterId,
      );
      const post = await tx.post.create({
        data: {
          communityId: community.id,
          authorUserId: actorUserId,
          title: dto.title,
          body: dto.body,
          status: PostStatus.PUBLISHED,
          deletedAt: null,
          ...spoiler,
        },
        select: PUBLIC_POST_SELECT,
      });
      return { post: this.mapper.toPost(post) };
    });
  }

  editPost(
    postId: string,
    dto: EditCommunityPostDto,
    auth: AuthenticatedRequestContext,
  ): Promise<CommunityPostMutationResponseDto> {
    const actorUserId = assertActiveMutationActor(auth);
    return this.runSerializable(async (tx) => {
      const current = await tx.post.findUnique({
        where: { id: postId },
        select: postAuthorStateSelect(actorUserId),
      });
      if (!current || current.community.status !== CommunityStatus.ACTIVE) {
        throw communityPostNotFound();
      }
      assertPostParticipant(current, actorUserId);
      if (current.status !== PostStatus.PUBLISHED) {
        throw communityContentInvalidState();
      }

      const spoiler = normalizeEditedSpoiler(current, dto);
      const finalState = {
        title: dto.title ?? current.title,
        body: dto.body ?? current.body,
        ...spoiler,
      };
      if (
        finalState.title === current.title &&
        finalState.body === current.body &&
        finalState.isSpoiler === current.isSpoiler &&
        finalState.spoilerChapterId === current.spoilerChapterId &&
        finalState.spoilerLabel === current.spoilerLabel
      ) {
        throw communityContentNoChanges();
      }
      await this.assertSpoilerChapter(
        tx,
        current.community.relatedMangaId,
        finalState.spoilerChapterId,
      );
      const updated = await tx.post.updateMany({
        where: {
          id: current.id,
          authorUserId: actorUserId,
          status: PostStatus.PUBLISHED,
          updatedAt: current.updatedAt,
        },
        data: finalState,
      });
      if (updated.count !== 1) throw communityContentConflict();
      return { post: this.mapper.toPost(await this.readPost(tx, postId)) };
    });
  }

  requestPostDeletion(
    postId: string,
    dto: CommunityContentDeletionRequestDto,
    auth: AuthenticatedRequestContext,
  ): Promise<CommunityContentDeletionRequestResponseDto> {
    const actorUserId = assertActiveMutationActor(auth);
    return this.runSerializable(async (tx) => {
      const post = await tx.post.findUnique({
        where: { id: postId },
        select: postAuthorStateSelect(actorUserId),
      });
      if (!post || post.community.status !== CommunityStatus.ACTIVE) {
        throw communityPostNotFound();
      }
      assertPostParticipant(post, actorUserId);
      if (post.status === PostStatus.REMOVED) {
        throw communityContentInvalidState();
      }
      const duplicate = await tx.contentDeletionRequest.findFirst({
        where: {
          requesterUserId: actorUserId,
          postId,
          status: ContentDeletionRequestStatus.PENDING,
        },
        select: { id: true },
      });
      if (duplicate) throw contentDeletionRequestAlreadyOpen();
      const request = await tx.contentDeletionRequest.create({
        data: {
          requesterUserId: actorUserId,
          postId,
          reason: dto.reason,
          details: dto.details ?? null,
          status: ContentDeletionRequestStatus.PENDING,
        },
        select: {
          id: true,
          postId: true,
          reason: true,
          details: true,
          status: true,
          createdAt: true,
        },
      });
      return {
        deletionRequest: {
          id: request.id,
          targetType: 'POST',
          targetId: request.postId ?? postId,
          reason: request.reason,
          details: request.details,
          status: request.status,
          createdAt: request.createdAt.toISOString(),
        },
      };
    });
  }

  createComment(
    postId: string,
    dto: CreateCommunityPostCommentDto,
    auth: AuthenticatedRequestContext,
  ): Promise<CommunityCommentMutationResponseDto> {
    const actorUserId = assertActiveMutationActor(auth);
    return this.runSerializable(async (tx) => {
      const post = await tx.post.findUnique({
        where: { id: postId },
        select: {
          id: true,
          status: true,
          community: {
            select: {
              id: true,
              status: true,
              relatedMangaId: true,
              members: {
                where: participantMembershipWhere(actorUserId),
                take: 1,
                select: { id: true },
              },
            },
          },
        },
      });
      if (
        !post ||
        post.status !== PostStatus.PUBLISHED ||
        post.community.status !== CommunityStatus.ACTIVE
      ) {
        throw communityPostNotFound();
      }
      assertParticipant(post.community);

      const parentCommentId = dto.parentCommentId ?? null;
      if (parentCommentId !== null) {
        const parent = await tx.postComment.findFirst({
          where: {
            id: parentCommentId,
            postId,
            status: PostCommentStatus.PUBLISHED,
            parentCommentId: null,
          },
          select: { id: true },
        });
        if (!parent) throw communityCommentParentInvalid();
      }
      const comment = await tx.postComment.create({
        data: {
          postId,
          authorUserId: actorUserId,
          parentCommentId,
          body: dto.body,
          status: PostCommentStatus.PUBLISHED,
          deletedAt: null,
        },
        select: PUBLIC_POST_COMMENT_SELECT,
      });
      return { comment: this.mapper.toComment(comment, postId) };
    });
  }

  editComment(
    commentId: string,
    dto: EditCommunityPostCommentDto,
    auth: AuthenticatedRequestContext,
  ): Promise<CommunityCommentMutationResponseDto> {
    const actorUserId = assertActiveMutationActor(auth);
    return this.runSerializable(async (tx) => {
      const current = await tx.postComment.findUnique({
        where: { id: commentId },
        select: commentAuthorStateSelect(actorUserId),
      });
      if (
        !current ||
        current.post.status !== PostStatus.PUBLISHED ||
        current.post.community.status !== CommunityStatus.ACTIVE
      ) {
        throw communityCommentNotFound();
      }
      assertCommentParticipant(current, actorUserId);
      if (current.status !== PostCommentStatus.PUBLISHED) {
        throw communityContentInvalidState();
      }
      const body = dto.body ?? current.body;
      if (body === current.body) throw communityContentNoChanges();
      const updated = await tx.postComment.updateMany({
        where: {
          id: current.id,
          authorUserId: actorUserId,
          status: PostCommentStatus.PUBLISHED,
          updatedAt: current.updatedAt,
          post: { status: PostStatus.PUBLISHED },
        },
        data: { body },
      });
      if (updated.count !== 1) throw communityContentConflict();
      return {
        comment: this.mapper.toComment(
          await this.readComment(tx, commentId),
          current.post.id,
        ),
      };
    });
  }

  requestCommentDeletion(
    commentId: string,
    dto: CommunityContentDeletionRequestDto,
    auth: AuthenticatedRequestContext,
  ): Promise<CommunityContentDeletionRequestResponseDto> {
    const actorUserId = assertActiveMutationActor(auth);
    return this.runSerializable(async (tx) => {
      const comment = await tx.postComment.findUnique({
        where: { id: commentId },
        select: commentAuthorStateSelect(actorUserId),
      });
      if (
        !comment ||
        comment.post.community.status !== CommunityStatus.ACTIVE
      ) {
        throw communityCommentNotFound();
      }
      assertCommentParticipant(comment, actorUserId);
      if (comment.status === PostCommentStatus.REMOVED) {
        throw communityContentInvalidState();
      }
      const duplicate = await tx.contentDeletionRequest.findFirst({
        where: {
          requesterUserId: actorUserId,
          postCommentId: commentId,
          status: ContentDeletionRequestStatus.PENDING,
        },
        select: { id: true },
      });
      if (duplicate) throw contentDeletionRequestAlreadyOpen();
      const request = await tx.contentDeletionRequest.create({
        data: {
          requesterUserId: actorUserId,
          postCommentId: commentId,
          reason: dto.reason,
          details: dto.details ?? null,
          status: ContentDeletionRequestStatus.PENDING,
        },
        select: {
          id: true,
          postCommentId: true,
          reason: true,
          details: true,
          status: true,
          createdAt: true,
        },
      });
      return {
        deletionRequest: {
          id: request.id,
          targetType: 'POST_COMMENT',
          targetId: request.postCommentId ?? commentId,
          reason: request.reason,
          details: request.details,
          status: request.status,
          createdAt: request.createdAt.toISOString(),
        },
      };
    });
  }

  moderatePost(
    postId: string,
    command: 'hide' | 'unhide',
    reason: string,
    auth: AuthenticatedRequestContext,
  ): Promise<CommunityPostMutationResponseDto> {
    const actorUserId = assertActiveMutationActor(auth);
    return this.runSerializable(async (tx) => {
      const post = await tx.post.findUnique({
        where: { id: postId },
        select: {
          id: true,
          status: true,
          updatedAt: true,
          community: { select: { id: true, status: true } },
        },
      });
      if (!post || post.community.status !== CommunityStatus.ACTIVE) {
        throw communityPostNotFound();
      }
      await this.communityAuthorization.assertCanModerateCommunityContent(
        post.community.id,
        actorUserId,
        tx,
      );
      const from =
        command === 'hide' ? PostStatus.PUBLISHED : PostStatus.HIDDEN;
      const to = command === 'hide' ? PostStatus.HIDDEN : PostStatus.PUBLISHED;
      if (post.status !== from) throw communityContentInvalidState();
      const updated = await tx.post.updateMany({
        where: { id: postId, status: from, updatedAt: post.updatedAt },
        data: { status: to },
      });
      if (updated.count !== 1) throw communityContentConflict();
      await tx.moderationAction.create({
        data: {
          moderatorUserId: actorUserId,
          actionType:
            command === 'hide'
              ? ModerationActionType.HIDE_CONTENT
              : ModerationActionType.RESTORE_CONTENT,
          targetType: ModerationTargetType.POST,
          targetId: postId,
          reason,
        },
      });
      return { post: this.mapper.toPost(await this.readPost(tx, postId)) };
    });
  }

  moderateComment(
    commentId: string,
    command: 'hide' | 'unhide',
    reason: string,
    auth: AuthenticatedRequestContext,
  ): Promise<CommunityCommentMutationResponseDto> {
    const actorUserId = assertActiveMutationActor(auth);
    return this.runSerializable(async (tx) => {
      const comment = await tx.postComment.findUnique({
        where: { id: commentId },
        select: {
          id: true,
          postId: true,
          status: true,
          updatedAt: true,
          post: {
            select: { community: { select: { id: true, status: true } } },
          },
        },
      });
      if (
        !comment ||
        comment.post.community.status !== CommunityStatus.ACTIVE
      ) {
        throw communityCommentNotFound();
      }
      await this.communityAuthorization.assertCanModerateCommunityContent(
        comment.post.community.id,
        actorUserId,
        tx,
      );
      const from =
        command === 'hide'
          ? PostCommentStatus.PUBLISHED
          : PostCommentStatus.HIDDEN;
      const to =
        command === 'hide'
          ? PostCommentStatus.HIDDEN
          : PostCommentStatus.PUBLISHED;
      if (comment.status !== from) throw communityContentInvalidState();
      const updated = await tx.postComment.updateMany({
        where: { id: commentId, status: from, updatedAt: comment.updatedAt },
        data: { status: to },
      });
      if (updated.count !== 1) throw communityContentConflict();
      await tx.moderationAction.create({
        data: {
          moderatorUserId: actorUserId,
          actionType:
            command === 'hide'
              ? ModerationActionType.HIDE_CONTENT
              : ModerationActionType.RESTORE_CONTENT,
          targetType: ModerationTargetType.POST_COMMENT,
          targetId: commentId,
          reason,
        },
      });
      return {
        comment: this.mapper.toComment(
          await this.readComment(tx, commentId),
          comment.postId,
        ),
      };
    });
  }

  private async getActiveParticipantCommunity(
    tx: Prisma.TransactionClient,
    slug: string,
    actorUserId: string,
  ): Promise<ActiveParticipantCommunity> {
    const community = await tx.community.findFirst({
      where: { slug, status: CommunityStatus.ACTIVE },
      select: activeCommunityParticipantSelect(actorUserId),
    });
    if (!community) throw activeCommunityNotFound();
    assertParticipant(community);
    return community;
  }

  private async assertSpoilerChapter(
    tx: Prisma.TransactionClient,
    relatedMangaId: string | null,
    spoilerChapterId: string | null,
  ): Promise<void> {
    if (spoilerChapterId === null) return;
    if (relatedMangaId === null) throw communitySpoilerInvalid();
    const chapter = await tx.chapter.findFirst({
      where: { id: spoilerChapterId, mangaId: relatedMangaId },
      select: { id: true },
    });
    if (!chapter) throw communitySpoilerInvalid();
  }

  private async readPost(tx: Prisma.TransactionClient, postId: string) {
    const post = await tx.post.findUnique({
      where: { id: postId },
      select: PUBLIC_POST_SELECT,
    });
    if (!post) throw communityPostNotFound();
    return post;
  }

  private async readComment(tx: Prisma.TransactionClient, commentId: string) {
    const comment = await tx.postComment.findUnique({
      where: { id: commentId },
      select: PUBLIC_POST_COMMENT_SELECT,
    });
    if (!comment) throw communityCommentNotFound();
    return comment;
  }

  private async runSerializable<T>(
    operation: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    for (let attempt = 1; attempt <= SERIALIZABLE_MAX_ATTEMPTS; attempt += 1) {
      try {
        return await this.prisma.$transaction(operation, {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        });
      } catch (error) {
        if (!isSerializableConflict(error)) throw error;
        if (attempt === SERIALIZABLE_MAX_ATTEMPTS) {
          throw communityContentConflict();
        }
      }
    }
    throw communityContentConflict();
  }
}
