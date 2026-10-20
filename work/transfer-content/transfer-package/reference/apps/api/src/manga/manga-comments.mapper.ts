import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AssetStatus,
  MangaCommentStatus,
  Prisma,
} from '../../generated/prisma/client.js';
import { resolveReaderAssetUrl } from './utils/reader-asset.utils.js';

export const mangaCommentSelect = {
  id: true,
  parentCommentId: true,
  body: true,
  status: true,
  isSpoiler: true,
  createdAt: true,
  updatedAt: true,
  editedAt: true,
  author: {
    select: {
      username: true,
      profile: {
        select: {
          displayName: true,
          avatarAsset: { select: { status: true, storageKey: true } },
        },
      },
    },
  },
} satisfies Prisma.MangaCommentSelect;

export type CommentData = Prisma.MangaCommentGetPayload<{
  select: typeof mangaCommentSelect;
}>;
export type PublicMangaComment = {
  id: string;
  parentCommentId: string | null;
  body: string | null;
  status: MangaCommentStatus;
  isSpoiler: boolean;
  createdAt: string;
  updatedAt: string;
  editedAt: string | null;
  author: {
    username: string | null;
    displayName: string | null;
    avatarUrl: string | null;
  };
};
export type CommentPageInfo = { nextCursor: string | null; hasMore: boolean };
export type MangaCommentRoot = PublicMangaComment & {
  replies: PublicMangaComment[];
  repliesPageInfo: CommentPageInfo;
};

@Injectable()
export class MangaCommentsMapper {
  constructor(private readonly config: ConfigService) {}

  public(row: CommentData): PublicMangaComment {
    const published = row.status === MangaCommentStatus.PUBLISHED;
    const asset = row.author.profile?.avatarAsset;
    const avatarUrl =
      asset?.status === AssetStatus.READY
        ? resolveReaderAssetUrl(asset.storageKey, {
            objectStorageBucket: this.config.get<string>(
              'OBJECT_STORAGE_BUCKET',
            ),
            objectStorageEndpoint: this.config.get<string>(
              'OBJECT_STORAGE_ENDPOINT',
            ),
          })
        : null;
    return {
      id: row.id,
      parentCommentId: row.parentCommentId,
      status: row.status,
      body: published ? row.body : null,
      isSpoiler: published && row.isSpoiler,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      editedAt: published ? (row.editedAt?.toISOString() ?? null) : null,
      author: {
        username: row.author.username,
        displayName: row.author.profile?.displayName ?? null,
        avatarUrl,
      },
    };
  }
}
