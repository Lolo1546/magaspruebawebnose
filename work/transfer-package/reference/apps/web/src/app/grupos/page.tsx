import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { fetchPublicScanlationGroups } from "@/data/scanlation-groups.server";

import { GroupsPageView } from "./GroupsPageView";
import {
  createGroupsHref,
  parseGroupsFilters,
  type GroupsSearchParams,
} from "./groups-catalog";

export const metadata: Metadata = {
  title: "Grupos públicos | MangaZone",
  description:
    "Descubre grupos públicos de scanlation verificados por idioma, proyectos y publicaciones.",
};

export default async function GroupsPage({
  searchParams,
}: {
  searchParams: Promise<GroupsSearchParams>;
}) {
  const filters = parseGroupsFilters(await searchParams);
  const result = await fetchPublicScanlationGroups({
    language: filters.language,
    page: filters.page,
    pageSize: filters.pageSize,
    q: filters.q,
    sort: filters.sort,
  });

  if (result.total > 0 && filters.page > result.pageCount) {
    redirect(createGroupsHref(filters, { page: result.pageCount }));
  }

  return <GroupsPageView filters={filters} result={result} />;
}
