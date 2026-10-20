import {
  mapApiCommunitiesPage,
  mapApiCommunityDetail,
  mapApiCommunityPostsPage,
  type ApiCommunityDetailResponse,
  type ApiCommunityIndexResponse,
  type ApiCommunityPostsResponse,
  type CommunitySort,
  type PublicCommunitiesPage,
  type PublicCommunityDetail,
  type PublicCommunityPostsPage,
} from "./communities.public";

export type CommunitiesServerQuery = {
  readonly page: number;
  readonly pageSize: number;
  readonly q: string;
  readonly sort: CommunitySort;
};

export type CommunityPostsServerQuery = {
  readonly page: number;
  readonly pageSize: number;
};

export class CommunitiesApiError extends Error {
  readonly status: number | null;

  constructor(message: string, status: number | null, cause?: unknown) {
    super(message, cause === undefined ? undefined : { cause });
    this.name = "CommunitiesApiError";
    this.status = status;
  }
}

function getApiUrl(path: string): URL {
  const baseUrl = process.env.INTERNAL_API_URL;
  if (!baseUrl) {
    throw new CommunitiesApiError(
      "INTERNAL_API_URL is not configured in environment.",
      null,
    );
  }

  return new URL(path, `${baseUrl.replace(/\/+$/, "")}/`);
}

async function publicGet(url: URL, operation: string): Promise<Response> {
  try {
    return await fetch(url.toString(), { cache: "no-store" });
  } catch (cause) {
    throw new CommunitiesApiError(`${operation}: network error`, null, cause);
  }
}

function assertOk(response: Response, operation: string): void {
  if (!response.ok) {
    throw new CommunitiesApiError(
      `${operation}: ${response.status}`,
      response.status,
    );
  }
}

export async function fetchPublicCommunities(
  query: CommunitiesServerQuery,
): Promise<PublicCommunitiesPage> {
  const url = getApiUrl("communities");
  if (query.q) url.searchParams.set("q", query.q);
  if (query.sort !== "name") url.searchParams.set("sort", query.sort);
  if (query.page !== 1) url.searchParams.set("page", String(query.page));
  if (query.pageSize !== 20) {
    url.searchParams.set("pageSize", String(query.pageSize));
  }

  const response = await publicGet(url, "Failed to fetch communities");
  assertOk(response, "Failed to fetch communities");
  const body: ApiCommunityIndexResponse = await response.json();
  return mapApiCommunitiesPage(body);
}

export async function fetchPublicCommunityDetail(
  slug: string,
): Promise<PublicCommunityDetail | null> {
  const url = getApiUrl(`communities/${encodeURIComponent(slug)}`);
  const response = await publicGet(url, "Failed to fetch community detail");
  if (response.status === 404) return null;
  assertOk(response, "Failed to fetch community detail");
  const body: ApiCommunityDetailResponse = await response.json();
  return mapApiCommunityDetail(body);
}

export async function fetchPublicCommunityPosts(
  slug: string,
  query: CommunityPostsServerQuery,
): Promise<PublicCommunityPostsPage | null> {
  const url = getApiUrl(`communities/${encodeURIComponent(slug)}/posts`);
  url.searchParams.set("sort", "recent");
  if (query.page !== 1) url.searchParams.set("page", String(query.page));
  if (query.pageSize !== 20) {
    url.searchParams.set("pageSize", String(query.pageSize));
  }

  const response = await publicGet(url, "Failed to fetch community posts");
  if (response.status === 404) return null;
  assertOk(response, "Failed to fetch community posts");
  const body: ApiCommunityPostsResponse = await response.json();
  return mapApiCommunityPostsPage(body);
}
