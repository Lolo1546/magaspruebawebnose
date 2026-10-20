import { notFound } from "next/navigation";
import { getSession } from "@/data/auth.server";
import { EditorialReadError, fetchEditorialManga, hasGlobalAdminAccess } from "@/data/editorial.server";
import { MangaEditor } from "../MangaEditor";

export default async function EditEditorialMangaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return null;
  let result: Awaited<ReturnType<typeof fetchEditorialManga>>;
  let isAdmin: boolean;
  try {
    [result, isAdmin] = await Promise.all([fetchEditorialManga(id), hasGlobalAdminAccess()]);
  } catch (error) {
    if (error instanceof EditorialReadError && error.status === 404) notFound();
    throw error;
  }
  return <MangaEditor csrfToken={session.csrfToken} initialManga={result.manga} isAdmin={isAdmin} />;
}
