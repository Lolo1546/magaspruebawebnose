export const scanlationGroupSortValues = ["name", "recent"] as const;

export type ScanlationGroupSort = (typeof scanlationGroupSortValues)[number];

export type ApiScanlationGroupStatus =
  "PENDING" | "VERIFIED" | "REJECTED" | "SUSPENDED" | "CLOSED";

export type ApiScanlationGroupItem = {
  readonly bannerUrl: string | null;
  readonly createdAt: string;
  readonly description: string | null;
  readonly id: string;
  readonly language: string;
  readonly logoUrl: string | null;
  readonly memberCount: number;
  readonly name: string;
  readonly projectCount: number;
  readonly releaseCount: number;
  readonly slug: string;
  readonly status: ApiScanlationGroupStatus;
  readonly verified: boolean;
  readonly verifiedAt: string | null;
  readonly website: string | null;
};

export type ApiScanlationGroupPagination = {
  readonly page: number;
  readonly pageCount: number;
  readonly pageSize: number;
  readonly total: number;
};

export type ApiScanlationGroupIndexResponse = {
  readonly items: readonly ApiScanlationGroupItem[];
  readonly pagination: ApiScanlationGroupPagination;
};

export type ApiScanlationGroupDetailResponse = ApiScanlationGroupItem & {
  readonly updatedAt: string;
};

export type ScanlationGroup = {
  readonly bannerUrl: string | null;
  readonly createdAt: string;
  readonly description: string | null;
  readonly id: string;
  readonly language: string;
  readonly logoUrl: string | null;
  readonly memberCount: number;
  readonly name: string;
  readonly projectCount: number;
  readonly releaseCount: number;
  readonly slug: string;
  readonly verified: boolean;
  readonly verifiedAt: string | null;
  readonly websiteUrl: string | null;
};

export type ScanlationGroupDetail = ScanlationGroup & {
  readonly updatedAt: string;
};

export type ScanlationGroupsPage = {
  readonly items: readonly ScanlationGroup[];
  readonly page: number;
  readonly pageCount: number;
  readonly pageSize: number;
  readonly total: number;
};

function mapSafeWebsite(value: string | null): string | null {
  if (!value) return null;

  try {
    const url = new URL(value);
    if (
      (url.protocol !== "http:" && url.protocol !== "https:") ||
      url.username ||
      url.password
    ) {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}

export function mapApiScanlationGroup(
  group: ApiScanlationGroupItem,
): ScanlationGroup {
  return {
    bannerUrl: group.bannerUrl,
    createdAt: group.createdAt,
    description: group.description,
    id: group.id,
    language: group.language,
    logoUrl: group.logoUrl,
    memberCount: group.memberCount,
    name: group.name,
    projectCount: group.projectCount,
    releaseCount: group.releaseCount,
    slug: group.slug,
    verified: group.verified,
    verifiedAt: group.verifiedAt,
    websiteUrl: mapSafeWebsite(group.website),
  };
}

export function mapApiScanlationGroupsPage(
  response: ApiScanlationGroupIndexResponse,
): ScanlationGroupsPage {
  return {
    items: response.items.map(mapApiScanlationGroup),
    page: response.pagination.page,
    pageCount: response.pagination.pageCount,
    pageSize: response.pagination.pageSize,
    total: response.pagination.total,
  };
}

export function mapApiScanlationGroupDetail(
  group: ApiScanlationGroupDetailResponse,
): ScanlationGroupDetail {
  return {
    ...mapApiScanlationGroup(group),
    updatedAt: group.updatedAt,
  };
}
