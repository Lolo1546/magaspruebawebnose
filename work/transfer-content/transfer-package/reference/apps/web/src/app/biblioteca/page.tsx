import type { Metadata } from "next";

import { redirect } from "next/navigation";
import { fetchLibrary } from "./api.server";
import { mapLibraryItem } from "./adapter";

import {
  parseLibraryFilters,
  type LibrarySearchParams,
} from "./library-catalog";
import { LibraryPageView } from "./LibraryPageView";

export const metadata: Metadata = {
  title: "Biblioteca | MangaZone",
  description: "Organiza tus lecturas y retoma cada manga desde tu biblioteca de MangaZone.",
};

type LibraryPageProps = {
  searchParams: Promise<LibrarySearchParams>;
};

export default async function LibraryPage({ searchParams }: LibraryPageProps) {
  const filters = parseLibraryFilters(await searchParams);

  let apiResponse;
  try {
    apiResponse = await fetchLibrary({
      q: filters.q,
      status: filters.status,
      page: 1, // Pagination not fully exposed in UI yet, but bounded
      pageSize: 24,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      redirect("/login");
    }
    throw error;
  }

  const items = apiResponse.items.map(mapLibraryItem);

  return <LibraryPageView filters={filters} items={items} stats={apiResponse.stats} />;
}
