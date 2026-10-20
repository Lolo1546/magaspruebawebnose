import {
  mapApiScanlationGroupDetail,
  mapApiScanlationGroupsPage,
  type ApiScanlationGroupDetailResponse,
  type ApiScanlationGroupIndexResponse,
  type ScanlationGroupDetail,
  type ScanlationGroupsPage,
  type ScanlationGroupSort,
} from "./scanlation-groups";

export type ScanlationGroupsServerQuery = {
  readonly language: string;
  readonly page: number;
  readonly pageSize: number;
  readonly q: string;
  readonly sort: ScanlationGroupSort;
};

export class ScanlationGroupsApiError extends Error {
  readonly status: number | null;

  constructor(message: string, status: number | null, cause?: unknown) {
    super(message, cause === undefined ? undefined : { cause });
    this.name = "ScanlationGroupsApiError";
    this.status = status;
  }
}

function getApiUrl(path: string): URL {
  const baseUrl = process.env.INTERNAL_API_URL;
  if (!baseUrl) {
    throw new ScanlationGroupsApiError(
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
    throw new ScanlationGroupsApiError(
      `Failed to ${operation}: network error`,
      null,
      cause,
    );
  }
}

export async function fetchPublicScanlationGroups(
  query: ScanlationGroupsServerQuery,
): Promise<ScanlationGroupsPage> {
  const url = getApiUrl("scanlation-groups");
  if (query.q) url.searchParams.set("q", query.q);
  if (query.language) url.searchParams.set("language", query.language);
  if (query.sort !== "name") url.searchParams.set("sort", query.sort);
  if (query.page !== 1) url.searchParams.set("page", String(query.page));
  if (query.pageSize !== 20) {
    url.searchParams.set("pageSize", String(query.pageSize));
  }

  const response = await publicGet(url, "fetch scanlation groups");
  if (!response.ok) {
    throw new ScanlationGroupsApiError(
      `Failed to fetch scanlation groups: ${response.status}`,
      response.status,
    );
  }

  const body: ApiScanlationGroupIndexResponse = await response.json();
  return mapApiScanlationGroupsPage(body);
}

export async function fetchPublicScanlationGroupDetail(
  slug: string,
): Promise<ScanlationGroupDetail | null> {
  const url = getApiUrl(`scanlation-groups/${encodeURIComponent(slug)}`);
  const response = await publicGet(url, "fetch scanlation group detail");

  if (response.status === 404) return null;
  if (!response.ok) {
    throw new ScanlationGroupsApiError(
      `Failed to fetch scanlation group detail: ${response.status}`,
      response.status,
    );
  }

  const body: ApiScanlationGroupDetailResponse = await response.json();
  return mapApiScanlationGroupDetail(body);
}
