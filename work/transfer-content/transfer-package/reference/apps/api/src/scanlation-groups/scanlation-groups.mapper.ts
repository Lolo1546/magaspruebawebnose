import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AssetStatus,
  Prisma,
  ScanlationGroupStatus,
} from '../../generated/prisma/client.js';
import { resolveReaderAssetUrl } from '../manga/utils/reader-asset.utils.js';
import type {
  ScanlationGroupDetailResponseDto,
  ScanlationGroupIndexItemDto,
} from './dto/scanlation-group-response.dto.js';

export type PublicScanlationGroupQueryResult =
  Prisma.ScanlationGroupGetPayload<{
    include: {
      logoAsset: true;
      bannerAsset: true;
      _count: {
        select: {
          members: true;
          releaseParticipations: true;
          projectParticipations: true;
        };
      };
    };
  }>;

@Injectable()
export class ScanlationGroupsMapper {
  constructor(private readonly configService: ConfigService) {}

  private mapAsset(
    asset: PublicScanlationGroupQueryResult['logoAsset'],
  ): string | null {
    if (!asset || asset.status !== AssetStatus.READY) return null;

    return resolveReaderAssetUrl(asset.storageKey, {
      objectStorageBucket: this.configService.get<string>(
        'OBJECT_STORAGE_BUCKET',
      ),
      objectStorageEndpoint: this.configService.get<string>(
        'OBJECT_STORAGE_ENDPOINT',
      ),
    });
  }

  toIndexItem(
    group: PublicScanlationGroupQueryResult,
  ): ScanlationGroupIndexItemDto {
    return {
      id: group.id,
      slug: group.slug,
      name: group.name,
      description: group.description,
      language: group.language,
      website: group.website,
      status: group.status,
      verified: group.status === ScanlationGroupStatus.VERIFIED,
      verifiedAt: group.verifiedAt?.toISOString() ?? null,
      logoUrl: this.mapAsset(group.logoAsset),
      bannerUrl: this.mapAsset(group.bannerAsset),
      createdAt: group.createdAt.toISOString(),
      memberCount: group._count.members,
      releaseCount: group._count.releaseParticipations,
      projectCount: group._count.projectParticipations,
    };
  }

  toDetail(
    group: PublicScanlationGroupQueryResult,
  ): ScanlationGroupDetailResponseDto {
    return {
      ...this.toIndexItem(group),
      updatedAt: group.updatedAt.toISOString(),
    };
  }
}
