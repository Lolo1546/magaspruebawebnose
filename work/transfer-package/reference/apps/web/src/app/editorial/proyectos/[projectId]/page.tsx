import { notFound } from "next/navigation";
import { getSession } from "@/data/auth.server";
import { EditorialReadError, hasGlobalAdminAccess } from "@/data/editorial.server";
import { readChapters, readEditorialMemberships, readProject } from "@/data/editorial-workflow.server";
import { ProjectWorkspace } from "../ProjectWorkspace";

export default async function ProjectPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const session = await getSession();
  if (!session) return null;
  let project: Awaited<ReturnType<typeof readProject>>["project"];
  let chapters: Awaited<ReturnType<typeof readChapters>>;
  let memberships: Awaited<ReturnType<typeof readEditorialMemberships>>;
  let isAdmin: boolean;
  try {
    ({ project } = await readProject(projectId));
    [chapters, memberships, isAdmin] = await Promise.all([
      readChapters(projectId), readEditorialMemberships(), hasGlobalAdminAccess(),
    ]);
  } catch (error) {
    if (error instanceof EditorialReadError && (error.status === 403 || error.status === 404)) notFound();
    throw error;
  }
  return <ProjectWorkspace initialProject={project} initialChapters={chapters} memberships={memberships.items} isAdmin={isAdmin} csrfToken={session.csrfToken} />;
}
