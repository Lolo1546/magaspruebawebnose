import {
  mapApiSelfCommunityMembership,
  type ApiCommunityMembershipMutationResponse,
  type SelfCommunityMembership,
} from "./community-memberships";

export const communityMembershipMutationErrorCodes = [
  "AUTHENTICATION_REQUIRED",
  "CSRF_VALIDATION_FAILED",
  "ACCOUNT_NOT_ELIGIBLE",
  "COMMUNITY_MEMBERSHIP_SUSPENDED",
  "COMMUNITY_MEMBERSHIP_REMOVED",
  "COMMUNITY_OWNER_CANNOT_LEAVE",
  "COMMUNITY_MEMBERSHIP_INVARIANT_VIOLATION",
  "COMMUNITY_MEMBERSHIP_CONFLICT",
] as const;

export type CommunityMembershipMutationErrorCode =
  (typeof communityMembershipMutationErrorCodes)[number];

export class CommunityMembershipMutationError extends Error {
  readonly code: CommunityMembershipMutationErrorCode | null;
  readonly status: number;

  constructor(
    message: string,
    status: number,
    code: CommunityMembershipMutationErrorCode | null,
  ) {
    super(message);
    this.name = "CommunityMembershipMutationError";
    this.status = status;
    this.code = code;
  }
}

function isKnownErrorCode(
  value: unknown,
): value is CommunityMembershipMutationErrorCode {
  return (
    typeof value === "string" &&
    communityMembershipMutationErrorCodes.some((code) => code === value)
  );
}

function getClientApiUrl(): string {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!baseUrl) {
    throw new CommunityMembershipMutationError(
      "No pudimos conectar con el servicio.",
      0,
      null,
    );
  }
  return baseUrl.replace(/\/+$/, "");
}

async function throwMutationError(response: Response): Promise<never> {
  let code: CommunityMembershipMutationErrorCode | null = null;
  try {
    const body: unknown = await response.json();
    if (body && typeof body === "object" && "code" in body) {
      const candidate = body.code;
      if (isKnownErrorCode(candidate)) code = candidate;
    }
  } catch {
    // HTTP status remains authoritative when the response has no JSON body.
  }

  throw new CommunityMembershipMutationError(
    "No se pudo actualizar la membresía.",
    response.status,
    code,
  );
}

export async function joinCommunity(
  slug: string,
  csrfToken: string,
): Promise<SelfCommunityMembership> {
  const response = await fetch(
    `${getClientApiUrl()}/me/community-memberships/${encodeURIComponent(slug)}`,
    {
      method: "PUT",
      credentials: "include",
      headers: { "x-csrf-token": csrfToken },
    },
  );

  if (!response.ok) return throwMutationError(response);
  const body: ApiCommunityMembershipMutationResponse = await response.json();
  return mapApiSelfCommunityMembership(body.membership);
}

export async function leaveCommunity(
  slug: string,
  csrfToken: string,
): Promise<void> {
  const response = await fetch(
    `${getClientApiUrl()}/me/community-memberships/${encodeURIComponent(slug)}`,
    {
      method: "DELETE",
      credentials: "include",
      headers: { "x-csrf-token": csrfToken },
    },
  );

  if (!response.ok) return throwMutationError(response);
}
