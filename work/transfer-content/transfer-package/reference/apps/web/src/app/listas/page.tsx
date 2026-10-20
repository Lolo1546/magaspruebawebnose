import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getSession } from "@/data/auth.server";
import { fetchLists, ListsUnauthorizedError } from "@/data/lists.server";

import {
  parseListsFilters,
  type ListsSearchParams,
} from "./lists-catalog";
import { ListsPageView } from "./ListsPageView";

export const metadata: Metadata = {
  title: "Listas | MangaZone",
  description: "Organiza colecciones temáticas de manga en listas visuales de MangaZone.",
};

export default async function ListsPage({
  searchParams,
}: {
  searchParams: Promise<ListsSearchParams>;
}) {
  const session = await getSession();
  if (!session) {
    return redirect("/login");
  }

  const filters = parseListsFilters(await searchParams);

  let lists;
  try {
    lists = await fetchLists({
      q: filters.q,
      sort: filters.sort,
      visibility: filters.visibility,
    });
  } catch (error) {
    if (error instanceof ListsUnauthorizedError) {
      return redirect("/login");
    }
    throw error;
  }

  return (
    <ListsPageView
      csrfToken={session.csrfToken}
      filters={filters}
      lists={lists}
    />
  );
}
