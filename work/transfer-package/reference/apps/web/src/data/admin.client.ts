import type {
  AdminCommunity,
  AdminCreationRequest,
  AdminScanlationGroup,
  AdminUser,
  AdminUserMutation,
  AdminRequestKind,
} from "./admin";

export class AdminClientError extends Error {
  constructor(
    readonly status: number,
    readonly code?: string,
  ) {
    super("No se pudo completar la operación administrativa.");
    this.name = "AdminClientError";
  }
}

function apiBase(): string {
  const value = process.env.NEXT_PUBLIC_API_URL;
  if (!value) throw new AdminClientError(0);
  return value.replace(/\/+$/, "");
}

async function json<T>(path: string): Promise<T> {
  const response = await fetch(`${apiBase()}${path}`, {
    credentials: "include",
  });
  if (!response.ok) throw await adminClientError(response);
  return (await response.json()) as T;
}

async function adminClientError(response: Response): Promise<AdminClientError> {
  let code: string | undefined;
  try {
    const payload = (await response.json()) as { code?: unknown };
    if (typeof payload.code === "string") code = payload.code;
  } catch {
    // Ignore non-JSON and private server error details.
  }
  return new AdminClientError(response.status, code);
}

export function fetchAdminUser(username: string): Promise<{ user: AdminUser }> {
  return json(`/admin/users/${encodeURIComponent(username)}`);
}

export function fetchAdminCommunity(
  slug: string,
): Promise<{ community: AdminCommunity }> {
  return json(`/admin/communities/${encodeURIComponent(slug)}`);
}

export function fetchAdminGroup(
  slug: string,
): Promise<{ group: AdminScanlationGroup }> {
  return json(`/admin/scanlation-groups/${encodeURIComponent(slug)}`);
}

export function fetchCreationRequestDetail(
  kind: AdminRequestKind,
  id: string,
): Promise<{ request: AdminCreationRequest }> {
  const segment = kind === "community" ? "community" : "scanlation-group";
  return json(
    `/moderation/${segment}-creation-requests/${encodeURIComponent(id)}`,
  );
}

export async function reviewCreationRequest(
  kind: AdminRequestKind,
  id: string,
  action: "approve" | "reject" | "request-info",
  csrfToken: string,
  input: {
    reviewReason?: string;
    publicMessage?: string;
    internalNote?: string;
  },
): Promise<void> {
  const segment = kind === "community" ? "community" : "scanlation-group";
  const response = await fetch(
    `${apiBase()}/moderation/${segment}-creation-requests/${encodeURIComponent(id)}/${action}`,
    {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "x-csrf-token": csrfToken,
      },
      body: JSON.stringify(input),
    },
  );
  if (!response.ok) throw await adminClientError(response);
}

export async function mutateAdminUser(
  username: string,
  mutation: AdminUserMutation,
  reason: string,
  csrfToken: string,
): Promise<{ user: AdminUser }> {
  const user = encodeURIComponent(username);
  const path =
    mutation.family === "account"
      ? `/admin/users/${user}/${mutation.command}`
      : `/admin/users/${user}/${
          mutation.family === "role" ? "roles" : "permissions"
        }/${encodeURIComponent(mutation.key)}/${mutation.command}`;
  const response = await fetch(`${apiBase()}${path}`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "x-csrf-token": csrfToken,
    },
    body: JSON.stringify({ reason }),
  });
  if (!response.ok) throw await adminClientError(response);
  return (await response.json()) as { user: AdminUser };
}
