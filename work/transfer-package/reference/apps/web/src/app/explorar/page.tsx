import type { Metadata } from "next";

import {
  parseExploreFilters,
  type ExploreSearchParams,
  type ExplorePageResult,
} from "./explore-catalog";
import { ExplorePageView } from "./ExplorePageView";
import { fetchExploreCatalog } from "./api.server";
import { adaptMangaCatalogItem } from "./adapter";

export const metadata: Metadata = {
  title: "Explorar manga | MangaZone",
  description:
    "Descubre manga, manhwa y manhua por género, estado y popularidad en MangaZone.",
};

type ExplorePageProps = {
  searchParams: Promise<ExploreSearchParams>;
};

export default async function ExplorePage({ searchParams }: ExplorePageProps) {
  const filters = parseExploreFilters(await searchParams);
  
  let pageResult: ExplorePageResult;
  try {
    const apiResult = await fetchExploreCatalog(filters);
    pageResult = {
      items: apiResult.items.map(adaptMangaCatalogItem),
      page: apiResult.pagination.page,
      pageCount: apiResult.pagination.pageCount,
      total: apiResult.pagination.total,
    };
  } catch (error) {
    console.error("Explore API Error:", error);
    throw new Error("No pudimos cargar el catálogo. Por favor, intenta de nuevo más tarde.");
  }

  return <ExplorePageView filters={filters} catalogPage={pageResult} />;
}
