import Link from "next/link";
import { redirect } from "next/navigation";
import { readProjects } from "@/data/editorial-workflow.server";
import { hasGlobalAdminAccess } from "@/data/editorial.server";
import { getSession } from "@/data/auth.server";
import { projectHref } from "@/data/editorial-workflow";
import styles from "./Workflow.module.css";

export default async function EditorialProjectsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  if (!await getSession()) redirect("/login");
  const query = await searchParams;
  const candidate = Number(query.page ?? "1");
  const page = Number.isSafeInteger(candidate) && candidate > 0 ? candidate : 1;
  const [result, isAdmin] = await Promise.all([readProjects(page), hasGlobalAdminAccess()]);
  return <main className={styles.page}>
    <header className={styles.hero}>
      <div><span className={styles.eyebrow}>Área editorial</span><h1>Proyectos de traducción</h1><p>Capítulos y publicaciones de los proyectos a los que tienes acceso.</p></div>
      {isAdmin && <Link className={styles.secondary} href="/editorial/mangas">Fichas de manga</Link>}
    </header>
    <section className={styles.projectGrid} aria-label="Proyectos editoriales">
      {result.items.length ? result.items.map((project) => <article className={styles.card} key={project.id}>
        <span className={styles.eyebrow}>{project.status === "ACTIVE" ? "Proyecto activo" : "Proyecto inactivo"}</span>
        <h2>{project.manga.title}</h2>
        <p>{project.groups.length} {project.groups.length === 1 ? "grupo participante" : "grupos participantes"}</p>
        <div className={styles.chips}>{project.groups.map((group) => <span key={group.id}>{group.name}</span>)}</div>
        <Link className={styles.primary} href={projectHref(project.id)}>Gestionar proyecto</Link>
      </article>) : <p className={styles.empty}>No hay proyectos editoriales disponibles para tu cuenta.</p>}
    </section>
    {result.pagination.pageCount > 1 && <nav className={styles.pagination} aria-label="Páginas de proyectos">
      {page > 1 && <Link href={`?page=${page - 1}`}>Anterior</Link>}
      <span>Página {result.pagination.page} de {result.pagination.pageCount}</span>
      {page < result.pagination.pageCount && <Link href={`?page=${page + 1}`}>Siguiente</Link>}
    </nav>}
  </main>;
}
