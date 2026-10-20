import { getPrivateHeaders } from "./auth.server";
import {
  mapApiSelfCommunityMembership,
  type ApiSelfCommunityMembershipsResponse,
  type SelfCommunityMembership,
} from "./community-memberships";

export class CommunityMembershipsUnauthorizedError extends Error {
  constructor() {
    super("Unauthorized");
    this.name = "CommunityMembershipsUnauthorizedError";
  }
}

export class CommunityMembershipsServerError extends Error {
  readonly status: number | null;

  constructor(message: string, status: number | null, cause?: unknown) {
    super(message, cause === undefined ? undefined : { cause });
    this.name = "CommunityMembershipsServerError";
    this.status = status;
  }
}

export async function fetchSelfCommunityMemberships(): Promise<
  SelfCommunityMembership[]
> {
  const headers = await getPrivateHeaders();
  if (!headers) throw new CommunityMembershipsUnauthorizedError();

  const baseUrl = process.env.INTERNAL_API_URL;
  if (!baseUrl) {
    throw new CommunityMembershipsServerError(
      "INTERNAL_API_URL is not configured in environment.",
      null,
    );
  }

  let response: Response;
  try {
    response = await fetch(
      `${baseUrl.replace(/\/+$/, "")}/me/community-memberships`,
      { cache: "no-store", headers },
    );
  } catch (cause) {
    throw new CommunityMembershipsServerError(
      "Failed to fetch community memberships: network error",
      null,
      cause,
    );
  }

  if (response.status === 401) {
    throw new CommunityMembershipsUnauthorizedError();
  }
  if (!response.ok) {
    throw new CommunityMembershipsServerError(
      `Failed to fetch community memberships: ${response.status}`,
      response.status,
    );
  }

  const body: ApiSelfCommunityMembershipsResponse = await response.json();
  return body.items.map(mapApiSelfCommunityMembership);
}
