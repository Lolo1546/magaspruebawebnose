import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ReaderExperience } from "@/components/reader/ReaderExperience";
import { fetchReaderData, fetchChapterIndex } from "../../api.server";
import { adaptReaderData } from "../../adapter";
import { getSession } from "@/data/auth.server";
import { fetchReleaseProgress } from "@/data/reading.server";

type ReaderPageProps = {
  params: Promise<{ chapter: string; slug: string }>;
  searchParams?: Promise<{ release?: string; page?: string }>;
};

export async function generateMetadata({
  params,
  searchParams,
}: ReaderPageProps): Promise<Metadata> {
  const { chapter, slug } = await params;
  const { release } = searchParams ? await searchParams : {};
  const apiData = await fetchReaderData(slug, chapter, release);
  if (!apiData) notFound();

  const chapterDisplay = apiData.chapter.displayLabel;
  return {
    title: `${chapterDisplay} — ${apiData.manga.title} | MangaZone`,
    description: `Lee ${chapterDisplay} de ${apiData.manga.title} en el lector de MangaZone.`,
  };
}

export default async function ReaderPage({ params, searchParams }: ReaderPageProps) {
  const { chapter, slug } = await params;
  const { release, page: queryPageStr } = searchParams ? await searchParams : {};

  const [apiData, apiIndex] = await Promise.all([
    fetchReaderData(slug, chapter, release),
    fetchChapterIndex(slug, 1),
  ]);

  if (!apiData || !apiIndex) notFound();

  const reader = adaptReaderData(apiData, apiIndex.items);

  let session = null;
  try {
    session = await getSession();
  } catch {
    // 5xx network, optional auth degradation
  }

  let storedProgress = null;
  if (session && reader.chapter.releaseId) {
    storedProgress = await fetchReleaseProgress(reader.chapter.releaseId);
  }

  // Precedence logic:
  // 1. explicit valid ?page=
  const explicitPage = queryPageStr ? parseInt(queryPageStr, 10) : NaN;
  const isExplicitPageValid =
    !isNaN(explicitPage) && reader.pages.some((p) => p.number === explicitPage);

  // 2. stored compatible progress
  const isStoredProgressCompatible =
    storedProgress &&
    storedProgress.chapterReleaseId === reader.chapter.releaseId &&
    reader.pages.some((p) => p.number === storedProgress.pageNumber);

  // 3. first readable page (fallback)
  const firstReadablePage = reader.pages[0]?.number ?? 1;

  const initialPage = isExplicitPageValid
    ? explicitPage
    : isStoredProgressCompatible
      ? storedProgress!.pageNumber
      : firstReadablePage;

  const persistenceConfig = session ? {
    mangaId: reader.manga.id,
    chapterId: reader.chapter.id,
    chapterReleaseId: reader.chapter.releaseId,
    csrfToken: session.csrfToken,
  } : null;

  return <ReaderExperience key={`${session?.user.id ?? "anonymous"}:${reader.chapter.releaseId}`} persistenceConfig={persistenceConfig} initialPage={initialPage} reader={reader} />;
}
