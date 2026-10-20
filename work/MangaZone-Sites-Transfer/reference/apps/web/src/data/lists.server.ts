import { getPrivateHeaders } from "./auth.server";
import {
  mapApiList,
  mapApiListDetail,
  type ApiListDetailResponse,
  type ApiListResponse,
  type ListVisibilityFilter,
  type ListsSort,
  type UserList,
  type UserListDetail,
} from "./lists";

export type ListsServerQuery = {
  readonly q: string;
  readonly sort: ListsSort;
  readonly visibility: ListVisibilityFilter;
};

export class ListsUnauthorizedError extends Error {
  constructor() {
    super("Unauthorized");
    this.name = "ListsUnauthorizedError";
  }
}

async function getListsRequestContext() {
  const headers = await getPrivateHeaders();
  if (!headers) {
    throw new ListsUnauthorizedError();
  }

  const baseUrl = process.env.INTERNAL_API_URL;
  if (!baseUrl) {
    throw new Error("INTERNAL_API_URL is not configured in environment.");
  }

  return { baseUrl, headers };
}

export async function fetchLists(query: ListsServerQuery): Promise<UserList[]> {
  const { baseUrl, headers } = await getListsRequestContext();

  const url = new URL(`${baseUrl}/me/lists`);
  if (query.q) url.searchParams.set("q", query.q);
  if (query.sort !== "recent") url.searchParams.set("sort", query.sort);
  if (query.visibility !== "all") {
    url.searchParams.set("visibility", query.visibility);
  }

  const response = await fetch(url.toString(), {
    headers,
    cache: "no-store",
  });

  if (response.status === 401) {
    throw new ListsUnauthorizedError();
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch lists: ${response.status}`);
  }

  const lists: ApiListResponse[] = await response.json();
  return lists.map(mapApiList);
}

export async function fetchListDetail(
  listId: string,
  page = 1,
): Promise<UserListDetail | null> {
  const { baseUrl, headers } = await getListsRequestContext();
  const url = new URL(`${baseUrl}/me/lists/${encodeURIComponent(listId)}`);
  if (page !== 1) url.searchParams.set("page", String(page));

  const response = await fetch(url.toString(), {
    headers,
    cache: "no-store",
  });

  if (response.status === 401) {
    throw new ListsUnauthorizedError();
  }
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`Failed to fetch list detail: ${response.status}`);
  }

  const list: ApiListDetailResponse = await response.json();
  return mapApiListDetail(list);
}
