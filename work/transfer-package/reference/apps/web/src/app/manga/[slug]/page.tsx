import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { fetchMangaDetail, fetchChapterIndex } from "./api.server";
import { adaptMangaDetail } from "./adapter";

import {
  parseMangaDetailQuery,
  type MangaDetailSearchParams,
} from "./manga-detail-query";
import { MangaDetailPageView } from "./MangaDetailPageView";
import { getSession } from "@/data/auth.server";

type MangaDetailPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<MangaDetailSearchParams>;
};

export async function generateMetadata({
  params,
}: MangaDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const apiManga = await fetchMangaDetail(slug);
  if (!apiManga) notFound();

  return {
    title: `${apiManga.title} | MangaZone`,
    description:
      apiManga.description?.slice(0, 160) ||
      `Lee ${apiManga.title} en MangaZone`,
  };
}

export default async function MangaDetailPage({
  params,
  searchParams,
}: MangaDetailPageProps) {
  const { slug } = await params;
  const query = parseMangaDetailQuery(await searchParams);

  const [apiManga, apiChapters, firstIndex, newestIndex, session] =
    await Promise.all([
      fetchMangaDetail(slug),
      fetchChapterIndex(slug, 1, {
        pageSize: 10,
        q: query.chapterQuery,
        group: query.group,
        sort: query.chapterSort,
      }),
      fetchChapterIndex(slug, 1, { pageSize: 1, sort: "asc" }),
      fetchChapterIndex(slug, 1, { pageSize: 1, sort: "desc" }),
      getSession().catch(() => null),
    ]);

  if (!apiManga || !apiChapters || !firstIndex || !newestIndex) notFound();

  const manga = adaptMangaDetail(apiManga, newestIndex.items, {
    groups: apiChapters.groups,
    firstChapter: firstIndex.items[0],
    totalChapters: newestIndex.pagination.total,
  });

  return (
    <MangaDetailPageView
      listsCsrfToken={session?.csrfToken ?? null}
      readingUserId={session?.user.id ?? null}
      manga={manga}
      chapterIndex={apiChapters}
      query={query}
    />
  );
}
