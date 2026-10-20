import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { fetchPublicCommunities } from "@/data/communities.server";
import { CommunitiesPageView } from "./CommunitiesPageView";
import { createCommunitiesHref, parseCommunitiesFilters, type CommunitiesSearchParams } from "./communities-catalog";

export const metadata: Metadata = {
  title: "Comunidades públicas | MangaZone",
  description: "Encuentra comunidades públicas de manga y consulta sus miembros, publicaciones y obras relacionadas.",
};

export default async function CommunitiesPage({ searchParams }: { searchParams: Promise<CommunitiesSearchParams> }) {
  const filters = parseCommunitiesFilters(await searchParams);
  const result = await fetchPublicCommunities({ page: filters.page, pageSize: filters.pageSize, q: filters.q, sort: filters.sort });
  if (result.total > 0 && filters.page > result.pageCount) {
    redirect(createCommunitiesHref(filters, { page: result.pageCount }));
  }
  return <CommunitiesPageView filters={filters} result={result} />;
}
