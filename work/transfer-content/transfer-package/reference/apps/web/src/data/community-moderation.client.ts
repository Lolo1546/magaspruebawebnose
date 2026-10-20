import type { CommunityModerationDetail } from "./community-moderation";

export class CommunityModerationReadError extends Error {
  constructor(readonly status: number) {
    super("No se pudo cargar el contenido de moderación.");
    this.name = "CommunityModerationReadError";
  }
}

function apiBase(): string {
  const value = process.env.NEXT_PUBLIC_API_URL;
  if (!value) throw new CommunityModerationReadError(0);
  return value.replace(/\/+$/, "");
}

export async function fetchCommunityModerationDetail(
  type: "POST" | "COMMENT",
  id: string,
): Promise<CommunityModerationDetail> {
  const response = await fetch(
    `${apiBase()}/moderation/community-content/${type}/${encodeURIComponent(id)}`,
    { credentials: "include" },
  );
  if (!response.ok) throw new CommunityModerationReadError(response.status);
  return (await response.json()) as CommunityModerationDetail;
}
