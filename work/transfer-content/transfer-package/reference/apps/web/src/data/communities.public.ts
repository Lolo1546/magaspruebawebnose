export const communitySortValues = ["name", "recent"] as const;

export type CommunitySort = (typeof communitySortValues)[number];

export type ApiCommunityStatus =
  "PENDING" | "ACTIVE" | "SUSPENDED" | "CLOSED" | "MERGED";

export type ApiCommunityRelatedManga = {
  readonly id: string;
  readonly slug: string;
  readonly title: string;
};

export type ApiCommunityItem = {
  readonly avatarUrl: string | null;
  readonly bannerUrl: string | null;
  readonly createdAt: string;
  readonly description: string | null;
  readonly id: string;
  readonly memberCount: number;
  readonly name: string;
  readonly postCount: number;
  readonly relatedManga: ApiCommunityRelatedManga | null;
  readonly slug: string;
  readonly status: ApiCommunityStatus;
};

export type ApiCommunityPagination = {
  readonly page: number;
  readonly pageCount: number;
  readonly pageSize: number;
  readonly total: number;
};

export type ApiCommunityIndexResponse = {
  readonly items: readonly ApiCommunityItem[];
  readonly pagination: ApiCommunityPagination;
};

export type ApiCommunityDetailResponse = ApiCommunityItem & {
  readonly updatedAt: string;
};

export type ApiCommunityPost = {
  readonly author: {
    readonly avatarUrl: string | null;
    readonly displayName: string | null;
    readonly username: string | null;
  };
  readonly body: string;
  readonly commentCount: number;
  readonly createdAt: string;
  readonly id: string;
  readonly isSpoiler: boolean;
  readonly spoilerChapterId: string | null;
  readonly spoilerLabel: string | null;
  readonly title: string;
  readonly updatedAt: string;
};

export type ApiCommunityPostsResponse = {
  readonly items: readonly ApiCommunityPost[];
  readonly pagination: ApiCommunityPagination;
};

export type ApiCommunityPostComment = {
  readonly author: ApiCommunityPost["author"];
  readonly body: string;
  readonly createdAt: string;
  readonly id: string;
  readonly parentCommentId: string | null;
  readonly updatedAt: string;
};

export type ApiCommunityPostCommentsResponse = {
  readonly items: readonly ApiCommunityPostComment[];
  readonly pagination: ApiCommunityPagination;
};

export type CommunityRelatedManga = {
  readonly id: string;
  readonly slug: string;
  readonly title: string;
};

export type PublicCommunity = {
  readonly avatarUrl: string | null;
  readonly bannerUrl: string | null;
  readonly createdAt: string;
  readonly description: string | null;
  readonly id: string;
  readonly memberCount: number;
  readonly name: string;
  readonly postCount: number;
  readonly relatedManga: CommunityRelatedManga | null;
  readonly slug: string;
};

export type PublicCommunityDetail = PublicCommunity & {
  readonly updatedAt: string;
};

export type PublicCommunityPost = {
  readonly author: {
    readonly avatarUrl: string | null;
    readonly displayName: string | null;
    readonly username: string | null;
  };
  readonly body: string;
  readonly commentCount: number;
  readonly createdAt: string;
  readonly id: string;
  readonly isSpoiler: boolean;
  readonly spoilerChapterId: string | null;
  readonly spoilerLabel: string | null;
  readonly title: string;
  readonly updatedAt: string;
};

export type PublicCommunityPostComment = ApiCommunityPostComment;

export type PublicCommunityPostCommentsPage = {
  readonly items: readonly PublicCommunityPostComment[];
  readonly page: number;
  readonly pageCount: number;
  readonly pageSize: number;
  readonly total: number;
};

export type PublicCommunitiesPage = {
  readonly items: readonly PublicCommunity[];
  readonly page: number;
  readonly pageCount: number;
  readonly pageSize: number;
  readonly total: number;
};

export type PublicCommunityPostsPage = {
  readonly items: readonly PublicCommunityPost[];
  readonly page: number;
  readonly pageCount: number;
  readonly pageSize: number;
  readonly total: number;
};

export function mapApiCommunity(community: ApiCommunityItem): PublicCommunity {
  return {
    avatarUrl: community.avatarUrl,
    bannerUrl: community.bannerUrl,
    createdAt: community.createdAt,
    description: community.description,
    id: community.id,
    memberCount: community.memberCount,
    name: community.name,
    postCount: community.postCount,
    relatedManga: community.relatedManga
      ? {
          id: community.relatedManga.id,
          slug: community.relatedManga.slug,
          title: community.relatedManga.title,
        }
      : null,
    slug: community.slug,
  };
}

export function mapApiCommunitiesPage(
  response: ApiCommunityIndexResponse,
): PublicCommunitiesPage {
  return {
    items: response.items.map(mapApiCommunity),
    page: response.pagination.page,
    pageCount: response.pagination.pageCount,
    pageSize: response.pagination.pageSize,
    total: response.pagination.total,
  };
}

export function mapApiCommunityDetail(
  response: ApiCommunityDetailResponse,
): PublicCommunityDetail {
  return {
    ...mapApiCommunity(response),
    updatedAt: response.updatedAt,
  };
}

export function mapApiCommunityPostsPage(
  response: ApiCommunityPostsResponse,
): PublicCommunityPostsPage {
  return {
    items: response.items.map((post) => ({
      author: {
        avatarUrl: post.author.avatarUrl,
        displayName: post.author.displayName,
        username: post.author.username,
      },
      body: post.body,
      commentCount: post.commentCount,
      createdAt: post.createdAt,
      id: post.id,
      isSpoiler: post.isSpoiler,
      spoilerChapterId: post.spoilerChapterId,
      spoilerLabel: post.spoilerLabel,
      title: post.title,
      updatedAt: post.updatedAt,
    })),
    page: response.pagination.page,
    pageCount: response.pagination.pageCount,
    pageSize: response.pagination.pageSize,
    total: response.pagination.total,
  };
}

export function mapApiCommunityPostCommentsPage(
  response: ApiCommunityPostCommentsResponse,
): PublicCommunityPostCommentsPage {
  return {
    items: response.items.map((comment) => ({
      author: {
        avatarUrl: comment.author.avatarUrl,
        displayName: comment.author.displayName,
        username: comment.author.username,
      },
      body: comment.body,
      createdAt: comment.createdAt,
      id: comment.id,
      parentCommentId: comment.parentCommentId,
      updatedAt: comment.updatedAt,
    })),
    page: response.pagination.page,
    pageCount: response.pagination.pageCount,
    pageSize: response.pagination.pageSize,
    total: response.pagination.total,
  };
}
