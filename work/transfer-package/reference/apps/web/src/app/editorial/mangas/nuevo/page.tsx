import { getSession } from "@/data/auth.server";
import { hasGlobalAdminAccess } from "@/data/editorial.server";
import { MangaEditor } from "../MangaEditor";

export default async function NewEditorialMangaPage() {
  const [session, isAdmin] = await Promise.all([getSession(), hasGlobalAdminAccess()]);
  if (!session) return null;
  return <MangaEditor csrfToken={session.csrfToken} initialManga={null} isAdmin={isAdmin} />;
}
