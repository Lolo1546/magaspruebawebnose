import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getSession } from "@/data/auth.server";
import type {
  CommunityModerationContentType,
  CommunityModerationFilters,
} from "@/data/community-moderation";
import {
  CommunityModerationUnauthorizedError,
  fetchCommunityModerationList,
} from "@/data/community-moderation.server";

import { CommunityModerationPanel } from "./CommunityModerationPanel";

export const metadata: Metadata = {
  title: "Moderación de comunidades | MangaZone",
  description: "Gestiona contenido oculto en las comunidades que moderas.",
};

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function parseCommunityModerationFilters(
  params: SearchParams,
): CommunityModerationFilters {
  const rawType = first(params.type);
  const type: CommunityModerationContentType | undefined =
    rawType === "POST" || rawType === "COMMENT" ? rawType : undefined;
  const community = first(params.community)?.trim() || undefined;
  const rawPage = Number(first(params.page) ?? "1");
  const page = Number.isSafeInteger(rawPage) && rawPage >= 1 ? rawPage : 1;
  return { type, community, page };
}

async function loadCommunityModeration(filters: CommunityModerationFilters) {
  try {
    return await fetchCommunityModerationList(filters);
  } catch (error) {
    if (error instanceof CommunityModerationUnauthorizedError) {
      return redirect("/login");
    }
    throw error;
  }
}

export default async function CommunityModerationPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await getSession();
  if (!session) return redirect("/login");
  const filters = parseCommunityModerationFilters(await searchParams);
  const initialData = await loadCommunityModeration(filters);
  return (
    <CommunityModerationPanel
      csrfToken={session.csrfToken}
      filters={filters}
      initialData={initialData}
    />
  );
}
