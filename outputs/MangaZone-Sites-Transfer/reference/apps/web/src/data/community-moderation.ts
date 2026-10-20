export type CommunityModerationContentType = "POST" | "COMMENT";

export type CommunityModerationAuthor = {
  readonly username: string | null;
  readonly displayName: string | null;
  readonly avatarUrl: string | null;
};

export type CommunityModerationContent = {
  readonly id: string;
  readonly type: CommunityModerationContentType;
  readonly community: { readonly slug: string; readonly name: string };
  readonly author: CommunityModerationAuthor;
  readonly status: "HIDDEN";
  readonly title: string | null;
  readonly body: string;
  readonly context: {
    readonly postId: string;
    readonly postTitle: string;
  } | null;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type CommunityModerationHistoryItem = {
  readonly action: string;
  readonly reason: string;
  readonly createdAt: string;
  readonly actor: CommunityModerationAuthor | null;
};

export type CommunityModerationList = {
  readonly items: CommunityModerationContent[];
  readonly communities: ReadonlyArray<{ readonly slug: string; readonly name: string }>;
  readonly pagination: {
    readonly page: number;
    readonly pageSize: number;
    readonly total: number;
    readonly pageCount: number;
  };
};

export type CommunityModerationDetail = {
  readonly item: CommunityModerationContent;
  readonly history: readonly CommunityModerationHistoryItem[];
};

export type CommunityModerationFilters = {
  readonly type?: CommunityModerationContentType;
  readonly community?: string;
  readonly page: number;
};
