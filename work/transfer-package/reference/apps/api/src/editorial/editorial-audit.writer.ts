import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';

type EditorialProjectAuditInput = {
  actorUserId: string;
  projectId: string;
  groupId: string;
  actionType:
    'PROJECT_CREATED' | 'PROJECT_GROUP_ADDED' | 'PROJECT_GROUP_REMOVED';
};

type EditorialMangaAuditResource = {
  actorUserId: string;
  mangaId: string;
  toVersion: number;
};

export type EditorialMangaAuditInput = EditorialMangaAuditResource &
  (
    | {
        actionType: 'MANGA_CREATED';
        reason?: string;
        fromVersion?: never;
      }
    | {
        actionType: 'MANGA_UPDATED' | 'MANGA_PUBLISHED';
        reason?: string;
        fromVersion: number;
      }
    | {
        actionType: 'MANGA_HIDDEN';
        reason: string;
        fromVersion: number;
      }
  );

export type EditorialAuditInput =
  | EditorialProjectAuditInput
  | EditorialMangaAuditInput
  | EditorialReleaseAuditInput
  | EditorialThumbnailAuditInput;

type EditorialThumbnailAuditInput = {
  createdAt: Date;
  actorUserId: string;
  chapterId: string;
  groupId: string | null;
  thumbnailRequestId?: string;
  previousAssetId: string | null;
  proposedAssetId: string;
  actionType:
    | 'CHAPTER_THUMBNAIL_SET'
    | 'CHAPTER_THUMBNAIL_REQUESTED'
    | 'CHAPTER_THUMBNAIL_APPROVED'
    | 'CHAPTER_THUMBNAIL_REJECTED'
    | 'CHAPTER_THUMBNAIL_OVERRIDDEN';
};

export type EditorialReleaseAuditInput = {
  actorUserId: string;
  releaseId: string;
  actionType: 'RELEASE_PUBLISHED' | 'RELEASE_WITHDRAWN';
  fromVersion: number;
  toVersion: number;
  createdAt: Date;
};

@Injectable()
export class EditorialAuditWriter {
  write(
    tx: {
      editorialAuditEvent: Pick<
        Prisma.TransactionClient['editorialAuditEvent'],
        'create'
      >;
    },
    input: EditorialAuditInput,
  ) {
    return tx.editorialAuditEvent.create({
      data:
        'chapterId' in input
          ? {
              actorUserId: input.actorUserId,
              chapterId: input.chapterId,
              groupId: input.groupId,
              thumbnailRequestId: input.thumbnailRequestId ?? null,
              previousAssetId: input.previousAssetId,
              proposedAssetId: input.proposedAssetId,
              createdAt: input.createdAt,
              actionType: input.actionType,
            }
          : 'releaseId' in input
            ? {
                actorUserId: input.actorUserId,
                releaseId: input.releaseId,
                actionType: input.actionType,
                fromVersion: input.fromVersion,
                toVersion: input.toVersion,
                createdAt: input.createdAt,
              }
            : 'mangaId' in input
              ? {
                  actorUserId: input.actorUserId,
                  mangaId: input.mangaId,
                  actionType: input.actionType,
                  reason: input.reason ?? null,
                  fromVersion: input.fromVersion ?? null,
                  toVersion: input.toVersion,
                }
              : {
                  actorUserId: input.actorUserId,
                  projectId: input.projectId,
                  groupId: input.groupId,
                  actionType: input.actionType,
                },
      select: { id: true },
    });
  }
}
