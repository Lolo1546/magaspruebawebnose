import {
  mapApiCommunityPostCommentsPage,
  type ApiCommunityPostCommentsResponse,
  type PublicCommunityPostCommentsPage,
} from "./communities.public";

export type CommunityPostInput = {
  readonly body: string;
  readonly isSpoiler: boolean;
  readonly spoilerChapterId?: string | null;
  readonly spoilerLabel?: string | null;
  readonly title: string;
};

export type CommunityCommentInput = {
  readonly body: string;
  readonly parentCommentId?: string;
};

export type CommunityDeletionRequestInput = {
  readonly details?: string;
  readonly reason: string;
};

const knownCodes = [
  "AUTHENTICATION_REQUIRED",
  "ACCOUNT_NOT_ELIGIBLE",
  "CSRF_VALIDATION_FAILED",
  "COMMUNITY_MEMBERSHIP_REQUIRED",
  "COMMUNITY_CONTENT_AUTHOR_FORBIDDEN",
  "COMMUNITY_POST_NOT_FOUND",
  "COMMUNITY_POST_COMMENT_NOT_FOUND",
  "COMMUNITY_COMMENT_PARENT_INVALID",
  "COMMUNITY_POST_SPOILER_INVALID",
  "COMMUNITY_CONTENT_INVALID_STATE",
  "COMMUNITY_CONTENT_NO_CHANGES",
  "CONTENT_DELETION_REQUEST_ALREADY_OPEN",
  "COMMUNITY_CONTENT_CONFLICT",
] as const;

export type CommunityContentErrorCode = (typeof knownCodes)[number];

export class CommunityContentError extends Error {
  constructor(
    readonly status: number,
    readonly code: CommunityContentErrorCode | null,
  ) {
    super("No se pudo completar la acción.");
    this.name = "CommunityContentError";
  }
}

function apiBase(): string {
  const value = process.env.NEXT_PUBLIC_API_URL;
  if (!value) throw new CommunityContentError(0, null);
  return value.replace(/\/+$/, "");
}

function isKnownCode(value: unknown): value is CommunityContentErrorCode {
  return typeof value === "string" && knownCodes.some((code) => code === value);
}

async function throwApiError(response: Response): Promise<never> {
  let code: CommunityContentErrorCode | null = null;
  try {
    const body: unknown = await response.json();
    if (
      body &&
      typeof body === "object" &&
      "code" in body &&
      isKnownCode(body.code)
    ) {
      code = body.code;
    }
  } catch {
    // Status remains authoritative for malformed or empty error responses.
  }
  throw new CommunityContentError(response.status, code);
}

async function jsonMutation(
  path: string,
  method: "PATCH" | "POST",
  input: object,
  csrfToken: string,
): Promise<void> {
  const response = await fetch(`${apiBase()}${path}`, {
    body: JSON.stringify(input),
    credentials: "include",
    headers: { "Content-Type": "application/json", "x-csrf-token": csrfToken },
    method,
  });
  if (!response.ok) return throwApiError(response);
}

export async function fetchCommunityPostComments(
  postId: string,
  page = 1,
  pageSize = 20,
): Promise<PublicCommunityPostCommentsPage> {
  const url = new URL(
    `${apiBase()}/community-posts/${encodeURIComponent(postId)}/comments`,
  );
  url.searchParams.set("page", String(page));
  url.searchParams.set("pageSize", String(pageSize));
  const response = await fetch(url.toString(), { credentials: "include" });
  if (!response.ok) return throwApiError(response);
  const body: ApiCommunityPostCommentsResponse = await response.json();
  return mapApiCommunityPostCommentsPage(body);
}

export function createCommunityPost(
  slug: string,
  input: CommunityPostInput,
  csrfToken: string,
): Promise<void> {
  return jsonMutation(
    `/communities/${encodeURIComponent(slug)}/posts`,
    "POST",
    input,
    csrfToken,
  );
}

export function editCommunityPost(
  postId: string,
  input: CommunityPostInput,
  csrfToken: string,
): Promise<void> {
  return jsonMutation(
    `/community-posts/${encodeURIComponent(postId)}`,
    "PATCH",
    input,
    csrfToken,
  );
}

export function requestCommunityPostDeletion(
  postId: string,
  input: CommunityDeletionRequestInput,
  csrfToken: string,
): Promise<void> {
  return jsonMutation(
    `/community-posts/${encodeURIComponent(postId)}/deletion-request`,
    "POST",
    input,
    csrfToken,
  );
}

export function createCommunityComment(
  postId: string,
  input: CommunityCommentInput,
  csrfToken: string,
): Promise<void> {
  return jsonMutation(
    `/community-posts/${encodeURIComponent(postId)}/comments`,
    "POST",
    input,
    csrfToken,
  );
}

export function editCommunityComment(
  commentId: string,
  body: string,
  csrfToken: string,
): Promise<void> {
  return jsonMutation(
    `/community-post-comments/${encodeURIComponent(commentId)}`,
    "PATCH",
    { body },
    csrfToken,
  );
}

export function requestCommunityCommentDeletion(
  commentId: string,
  input: CommunityDeletionRequestInput,
  csrfToken: string,
): Promise<void> {
  return jsonMutation(
    `/community-post-comments/${encodeURIComponent(commentId)}/deletion-request`,
    "POST",
    input,
    csrfToken,
  );
}

export function restoreCommunityPost(
  postId: string,
  reason: string,
  csrfToken: string,
): Promise<void> {
  return jsonMutation(
    `/community-posts/${encodeURIComponent(postId)}/unhide`,
    "POST",
    { reason },
    csrfToken,
  );
}

export function restoreCommunityComment(
  commentId: string,
  reason: string,
  csrfToken: string,
): Promise<void> {
  return jsonMutation(
    `/community-post-comments/${encodeURIComponent(commentId)}/unhide`,
    "POST",
    { reason },
    csrfToken,
  );
}
