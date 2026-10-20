import type { Metadata } from "next";

import {
  parseRankingFilters,
  type RankingSearchParams,
} from "./ranking-catalog";
import { RankingPageView } from "./RankingPageView";

export const metadata: Metadata = {
  title: "Ranking de manga | MangaZone",
  description:
    "Descubre un ranking visual de mangas por popularidad, valoración, guardados y crecimiento.",
};

export default async function RankingPage({
  searchParams,
}: {
  searchParams: Promise<RankingSearchParams>;
}) {
  return <RankingPageView filters={parseRankingFilters(await searchParams)} />;
}
