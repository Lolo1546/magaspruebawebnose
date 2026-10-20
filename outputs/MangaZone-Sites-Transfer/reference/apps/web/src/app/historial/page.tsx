import type { Metadata } from "next";

import { redirect } from "next/navigation";
import { getSession } from "@/data/auth.server";

import {
  parseHistoryFilters,
  type HistorySearchParams,
} from "./history-catalog";
import { HistoryPageView } from "./HistoryPageView";

export const metadata: Metadata = {
  title: "Historial de lectura | MangaZone",
  description: "Consulta tus lecturas recientes y continúa desde un capítulo válido en MangaZone.",
};

import { fetchHistory } from "@/data/reading.server";

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<HistorySearchParams>;
}) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const filters = parseHistoryFilters(await searchParams);

  const apiData = await fetchHistory(filters);

  return (
    <HistoryPageView
      filters={filters}
      apiData={apiData}
    />
  );
}
