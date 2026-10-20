import {
  mapApiList,
  mapApiListMembership,
  type ApiListResponse,
  type ApiListVisibility,
  type UserList,
  type UserListMembership,
} from "./lists";

export type CreateListInput = {
  readonly description?: string;
  readonly name: string;
  readonly visibility: ApiListVisibility;
};

export type UpdateListInput = {
  readonly description?: string | null;
  readonly name?: string;
  readonly visibility?: ApiListVisibility;
};

export class ListsMutationError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ListsMutationError";
    this.status = status;
  }
}

function readApiErrorMessage(value: unknown): string | null {
  if (!value || typeof value !== "object" || !("message" in value)) {
    return null;
  }

  const message = value.message;
  if (typeof message === "string") return message;
  if (Array.isArray(message) && message.every((item) => typeof item === "string")) {
    return message.join(" ");
  }
  return null;
}

export async function createList(
  input: CreateListInput,
  csrfToken: string,
): Promise<UserList> {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!baseUrl) {
    throw new ListsMutationError("NEXT_PUBLIC_API_URL no está configurada.", 0);
  }

  const response = await fetch(`${baseUrl}/me/lists`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "x-csrf-token": csrfToken,
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    let apiMessage: string | null = null;
    try {
      const body: unknown = await response.json();
      apiMessage = readApiErrorMessage(body);
    } catch {
      // The HTTP status remains authoritative when the response has no JSON body.
    }
    throw new ListsMutationError(
      apiMessage ?? `No se pudo crear la lista (${response.status}).`,
      response.status,
    );
  }

  const list: ApiListResponse = await response.json();
  return mapApiList(list);
}

function getClientApiUrl(): string {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!baseUrl) {
    throw new ListsMutationError("NEXT_PUBLIC_API_URL no está configurada.", 0);
  }
  return baseUrl;
}

async function throwMutationError(
  response: Response,
  fallbackMessage: string,
): Promise<never> {
  let apiMessage: string | null = null;
  try {
    const body: unknown = await response.json();
    apiMessage = readApiErrorMessage(body);
  } catch {
    // The HTTP status remains authoritative when the response has no JSON body.
  }
  throw new ListsMutationError(
    apiMessage ?? `${fallbackMessage} (${response.status}).`,
    response.status,
  );
}

export async function fetchListsForManga(
  mangaId: string,
): Promise<UserListMembership[]> {
  const url = new URL(`${getClientApiUrl()}/me/lists`);
  url.searchParams.set("mangaId", mangaId);

  const response = await fetch(url.toString(), {
    method: "GET",
    credentials: "include",
  });

  if (!response.ok) {
    return throwMutationError(response, "No se pudieron cargar tus listas");
  }

  const lists: ApiListResponse[] = await response.json();
  return lists.map(mapApiListMembership);
}

export async function addListItem(
  listId: string,
  mangaId: string,
  csrfToken: string,
): Promise<void> {
  const response = await fetch(
    `${getClientApiUrl()}/me/lists/${encodeURIComponent(listId)}/items`,
    {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "x-csrf-token": csrfToken,
      },
      body: JSON.stringify({ mangaId }),
    },
  );

  if (!response.ok) {
    return throwMutationError(response, "No se pudo añadir el manga");
  }
}

export async function updateList(
  listId: string,
  input: UpdateListInput,
  csrfToken: string,
): Promise<UserList> {
  const response = await fetch(
    `${getClientApiUrl()}/me/lists/${encodeURIComponent(listId)}`,
    {
      method: "PATCH",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "x-csrf-token": csrfToken,
      },
      body: JSON.stringify(input),
    },
  );

  if (!response.ok) {
    return throwMutationError(response, "No se pudo actualizar la lista");
  }

  const list: ApiListResponse = await response.json();
  return mapApiList(list);
}

async function deleteListResource(
  path: string,
  csrfToken: string,
  fallbackMessage: string,
): Promise<void> {
  const response = await fetch(`${getClientApiUrl()}${path}`, {
    method: "DELETE",
    credentials: "include",
    headers: { "x-csrf-token": csrfToken },
  });

  if (!response.ok) {
    return throwMutationError(response, fallbackMessage);
  }
}

export async function deleteList(
  listId: string,
  csrfToken: string,
): Promise<void> {
  return deleteListResource(
    `/me/lists/${encodeURIComponent(listId)}`,
    csrfToken,
    "No se pudo eliminar la lista",
  );
}

export async function removeListItem(
  listId: string,
  mangaId: string,
  csrfToken: string,
): Promise<void> {
  return deleteListResource(
    `/me/lists/${encodeURIComponent(listId)}/items/${encodeURIComponent(mangaId)}`,
    csrfToken,
    "No se pudo quitar el manga",
  );
}
