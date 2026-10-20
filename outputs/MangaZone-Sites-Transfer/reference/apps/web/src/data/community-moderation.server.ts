import { getPrivateHeaders } from "./auth.server";
import type {
  CommunityModerationFilters,
  CommunityModerationList,
} from "./community-moderation";

export class CommunityModerationUnauthorizedError extends Error {
  constructor() {
    super("Unauthorized");
    this.name = "CommunityModerationUnauthorizedError";
  }
}

export async function fetchCommunityModerationList(
  filters: CommunityModerationFilters,
): Promise<CommunityModerationList> {
  const headers = await getPrivateHeaders();
  if (!headers) throw new CommunityModerationUnauthorizedError();
  const baseUrl = process.env.INTERNAL_API_URL;
  if (!baseUrl) throw new Error("INTERNAL_API_URL is not configured in environment.");

  const url = new URL(`${baseUrl.replace(/\/+$/, "")}/moderation/community-content`);
  if (filters.type) url.searchParams.set("type", filters.type);
  if (filters.community) url.searchParams.set("community", filters.community);
  if (filters.page !== 1) url.searchParams.set("page", String(filters.page));
  const response = await fetch(url.toString(), { cache: "no-store", headers });
  if (response.status === 401) throw new CommunityModerationUnauthorizedError();
  if (!response.ok) {
    throw new Error(`Failed to fetch Community moderation content: ${response.status}`);
  }
  return (await response.json()) as CommunityModerationList;
}
