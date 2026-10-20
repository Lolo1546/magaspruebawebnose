import { notFound } from "next/navigation";
import { getSession } from "@/data/auth.server";
import { EditorialReadError, hasGlobalAdminAccess } from "@/data/editorial.server";
import { readChapter, readEditorialMemberships, readPages, readProject, readRelease, readThumbnail } from "@/data/editorial-workflow.server";
import { ReleaseWorkspace } from "../../../../../ReleaseWorkspace";

export default async function EditorialReleasePage({ params }: { params: Promise<{ projectId: string; chapterId: string; releaseId: string }> }) {
  const { projectId, chapterId, releaseId } = await params;
  const session = await getSession();
  if (!session) return null;
  let project: Awaited<ReturnType<typeof readProject>>["project"];
  let chapter: Awaited<ReturnType<typeof readChapter>>["chapter"];
  let release: Awaited<ReturnType<typeof readRelease>>["release"];
  let memberships: Awaited<ReturnType<typeof readEditorialMemberships>>;
  let isAdmin: boolean;
  let pages: Awaited<ReturnType<typeof readPages>> | null;
  let thumbnail: Awaited<ReturnType<typeof readThumbnail>>;
  try {
    ({ project } = await readProject(projectId));
    [{ chapter }, { release }, memberships, isAdmin] = await Promise.all([
      readChapter(projectId, chapterId), readRelease(projectId, chapterId, releaseId),
      readEditorialMemberships(), hasGlobalAdminAccess(),
    ]);
    [pages, thumbnail] = await Promise.all([
      release.status === "DRAFT" || release.status === "PUBLISHED" || release.status === "WITHDRAWN"
        ? readPages(projectId, chapterId, releaseId) : Promise.resolve(null),
      readThumbnail(chapterId),
    ]);
  } catch (error) {
    if (error instanceof EditorialReadError && (error.status === 403 || error.status === 404)) notFound();
    throw error;
  }
  return <ReleaseWorkspace project={project} chapter={chapter} initialRelease={release} initialPages={pages} initialThumbnail={thumbnail} memberships={memberships.items} isAdmin={isAdmin} csrfToken={session.csrfToken} />;
}
