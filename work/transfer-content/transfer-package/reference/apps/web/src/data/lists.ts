export const listVisibilities = ["private", "unlisted", "public"] as const;
export const listVisibilityFilters = ["all", "private", "public"] as const;
export const listSortValues = ["recent", "name", "count"] as const;

export type ListVisibility = (typeof listVisibilities)[number];
export type ListVisibilityFilter = (typeof listVisibilityFilters)[number];
export type ListsSort = (typeof listSortValues)[number];

export type ApiListVisibility = "PRIVATE" | "UNLISTED" | "PUBLIC";

export type ApiListPreviewManga = {
  readonly coverUrl: string | null;
  readonly id: string;
  readonly slug: string;
  readonly title: string;
};

export type ApiListResponse = {
  readonly containsManga: boolean;
  readonly createdAt: string;
  readonly description: string | null;
  readonly id: string;
  readonly itemCount: number;
  readonly name: string;
  readonly previewItems: readonly ApiListPreviewManga[];
  readonly updatedAt: string;
  readonly visibility: ApiListVisibility;
};

export type ApiListItem = {
  readonly addedAt: string;
  readonly manga: ApiListPreviewManga;
};

export type ApiListPagination = {
  readonly page: number;
  readonly pageCount: number;
  readonly pageSize: number;
  readonly total: number;
};

export type ApiListDetailResponse = Omit<ApiListResponse, "previewItems"> & {
  readonly items: readonly ApiListItem[];
  readonly pagination: ApiListPagination;
};

export type UserList = {
  readonly createdAt: string;
  readonly description: string | null;
  readonly id: string;
  readonly itemCount: number;
  readonly name: string;
  readonly previewItems: readonly ApiListPreviewManga[];
  readonly updatedAt: string;
  readonly visibility: ListVisibility;
};

export type UserListMembership = UserList & {
  readonly containsManga: boolean;
};

export type UserListItem = {
  readonly addedAt: string;
  readonly manga: ApiListPreviewManga;
};

export type UserListDetail = Omit<UserList, "previewItems"> & {
  readonly items: readonly UserListItem[];
  readonly pagination: ApiListPagination;
};

const visibilityByApiValue: Readonly<Record<ApiListVisibility, ListVisibility>> = {
  PRIVATE: "private",
  PUBLIC: "public",
  UNLISTED: "unlisted",
};

export function mapApiList(apiList: ApiListResponse): UserList {
  return {
    createdAt: apiList.createdAt,
    description: apiList.description,
    id: apiList.id,
    itemCount: apiList.itemCount,
    name: apiList.name,
    previewItems: apiList.previewItems.map((manga) => ({ ...manga })),
    updatedAt: apiList.updatedAt,
    visibility: visibilityByApiValue[apiList.visibility],
  };
}

export function mapApiListMembership(
  apiList: ApiListResponse,
): UserListMembership {
  return {
    ...mapApiList(apiList),
    containsManga: apiList.containsManga,
  };
}

export function mapApiListDetail(
  apiList: ApiListDetailResponse,
): UserListDetail {
  return {
    createdAt: apiList.createdAt,
    description: apiList.description,
    id: apiList.id,
    itemCount: apiList.itemCount,
    items: apiList.items.map((item) => ({
      addedAt: item.addedAt,
      manga: { ...item.manga },
    })),
    name: apiList.name,
    pagination: { ...apiList.pagination },
    updatedAt: apiList.updatedAt,
    visibility: visibilityByApiValue[apiList.visibility],
  };
}
