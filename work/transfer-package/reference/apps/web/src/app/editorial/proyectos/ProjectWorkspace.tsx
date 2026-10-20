"use client";

import { useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, Plus, Users } from "lucide-react";
import type { EditorialChapter, EditorialMembership, EditorialProject, EditorialRelease, PageResult } from "@/data/editorial-workflow";
import { editorialUiAccess, releaseHref, releaseLabel } from "@/data/editorial-workflow";
import { addProjectGroup, createChapter, createRelease, getChapters, getProject, getReleases, removeProjectGroup, searchVerifiedGroups, workflowError } from "@/data/editorial-workflow.client";
import styles from "./Workflow.module.css";

type Props = {
  initialProject: EditorialProject;
  initialChapters: PageResult<EditorialChapter>;
  memberships: EditorialMembership[];
  isAdmin: boolean;
  csrfToken: string;
};

export function ProjectWorkspace({ initialProject, initialChapters, memberships, isAdmin, csrfToken }: Props) {
  const [project, setProject] = useState(initialProject);
  const [chapters, setChapters] = useState(initialChapters);
  const [openChapter, setOpenChapter] = useState<string | null>(null);
  const chapterLoadGeneration = useRef(0);
  const [releases, setReleases] = useState<PageResult<EditorialRelease> | null>(null);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [showChapterForm, setShowChapterForm] = useState(false);
  const [showReleaseForm, setShowReleaseForm] = useState(false);
  const [groupId, setGroupId] = useState("");
  const [groupQuery, setGroupQuery] = useState("");
  const [groupResults, setGroupResults] = useState<Array<{ id: string; name: string }>>([]);
  const groupSearchGeneration = useRef(0);
  const preparableGroups = project.groups.filter((group) => group.status === "VERIFIED" && editorialUiAccess(isAdmin, memberships, group.id).canPrepare);
  const canPrepare = project.status === "ACTIVE" && preparableGroups.length > 0;

  async function refresh(chapterId = openChapter, page = chapters.pagination.page) {
    const [nextProject, nextChapters] = await Promise.all([getProject(project.id), getChapters(project.id, page)]);
    setProject(nextProject.project);
    setChapters(nextChapters);
    if (chapterId) setReleases(await getReleases(project.id, chapterId));
  }

  async function run(action: () => Promise<void>, success: string) {
    if (busyRef.current) return;
    busyRef.current = true; setBusy(true); setError(""); setMessage("");
    try {
      await action();
      setMessage(success);
    } catch (cause) {
      setError(workflowError(cause));
      try { await refresh(); } catch { /* Keep the original actionable error. */ }
    } finally { busyRef.current = false; setBusy(false); }
  }

  async function toggleChapter(chapterId: string) {
    const generation = ++chapterLoadGeneration.current;
    if (openChapter === chapterId) { setOpenChapter(null); setReleases(null); return; }
    setOpenChapter(chapterId); setReleases(null); setShowReleaseForm(false); setError("");
    try { const result = await getReleases(project.id, chapterId); if (generation === chapterLoadGeneration.current) setReleases(result); }
    catch (cause) { if (generation === chapterLoadGeneration.current) setError(workflowError(cause)); }
  }

  async function searchGroups() {
    const generation = ++groupSearchGeneration.current;
    try {
      const result = await searchVerifiedGroups(groupQuery);
      if (generation !== groupSearchGeneration.current) return;
      setGroupResults(result.items.filter((item) => item.status === "VERIFIED" && !project.groups.some((group) => group.id === item.id)));
      setGroupId("");
    } catch (cause) {
      if (generation === groupSearchGeneration.current) setError(workflowError(cause));
    }
  }

  function submitChapter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canPrepare) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    void run(async () => {
      const created = await createChapter(project.id, {
        groupId: String(data.get("groupId")),
        kind: String(data.get("kind")) as EditorialChapter["kind"],
        number: String(data.get("number") || "").trim() || null,
        displayLabel: String(data.get("displayLabel") || "").trim(),
        sortOrder: String(data.get("sortOrder") || "").trim(),
        title: String(data.get("title") || "").trim() || null,
      }, csrfToken);
      setShowChapterForm(false);
      form.reset();
      await refresh(created.chapter.id, 1);
      setOpenChapter(created.chapter.id);
    }, "Capítulo creado.");
  }

  function submitRelease(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!openChapter || !canPrepare || chapters.items.find((chapter) => chapter.id === openChapter)?.status !== "ACTIVE") return;
    const form = event.currentTarget;
    const data = new FormData(form);
    void run(async () => {
      await createRelease(project.id, openChapter, {
        publishingGroupId: String(data.get("publishingGroupId")),
        language: String(data.get("language") || "").trim(),
      }, csrfToken);
      setShowReleaseForm(false);
      form.reset();
      setReleases(await getReleases(project.id, openChapter));
    }, "Publicación en borrador creada.");
  }

  return <main className={styles.page}>
    <nav className={styles.breadcrumb} aria-label="Ruta editorial"><Link href="/editorial/proyectos">Proyectos de traducción</Link><span>/</span><span>{project.manga.title}</span></nav>
    <header className={styles.hero}>
      <div><span className={styles.eyebrow}>Proyecto de traducción · {project.status === "ACTIVE" ? "Activo" : "Inactivo"}</span>
        <h1>{project.manga.title}</h1><p>Gestiona capítulos lógicos y sus publicaciones sin duplicar el capítulo por grupo.</p></div>
      {isAdmin && <Link className={styles.secondary} href={`/editorial/mangas/${project.manga.id}`}>Ficha del manga</Link>}
    </header>
    {message && <p className={styles.success} role="status">{message}</p>}
    {error && <p className={styles.error} role="alert">{error}</p>}
    <div className={styles.columns}>
      <section className={styles.mainColumn} aria-label="Capítulos del proyecto">
        <div className={styles.sectionHeading}><div><span className={styles.eyebrow}>Contenido</span><h2>Capítulos</h2></div>
          {canPrepare && <button className={styles.primary} type="button" aria-expanded={showChapterForm} onClick={() => setShowChapterForm(!showChapterForm)}><Plus size={16} /> Nuevo capítulo</button>}
        </div>
        {showChapterForm && canPrepare && <form className={styles.form} onSubmit={submitChapter}>
          <h3>Crear capítulo lógico</h3>
          <label>Grupo responsable<select name="groupId" required>{preparableGroups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}</select></label>
          <label>Tipo<select name="kind"><option value="REGULAR">Regular</option><option value="SPECIAL">Especial</option><option value="ONE_SHOT">One-shot</option><option value="EXTRA">Extra</option></select></label>
          <label>Número (opcional)<input name="number" inputMode="decimal" pattern="[0-9]{1,8}(\.[0-9]{1,4})?" placeholder="12.5" /></label>
          <label>Etiqueta visible<input name="displayLabel" maxLength={200} required placeholder="Capítulo 12" /></label>
          <label>Orden<input name="sortOrder" inputMode="decimal" pattern="[0-9]{1,8}(\.[0-9]{1,4})?" required placeholder="12" /></label>
          <label>Título (opcional)<input name="title" maxLength={200} /></label>
          <div className={styles.actions}><button className={styles.primary} disabled={busy} type="submit">{busy ? "Creando…" : "Crear capítulo"}</button><button className={styles.secondary} type="button" onClick={() => setShowChapterForm(false)}>Cancelar</button></div>
        </form>}
        <div className={styles.chapterList}>
          {chapters.items.length ? chapters.items.map((chapter) => <article className={styles.chapterCard} key={chapter.id}>
            <div className={styles.chapterTop}><BookOpen size={21} aria-hidden="true" /><div><span className={styles.eyebrow}>{chapter.kind === "REGULAR" ? "Regular" : chapter.kind === "SPECIAL" ? "Especial" : chapter.kind === "EXTRA" ? "Extra" : "One-shot"} · {chapter.status === "ACTIVE" ? "Activo" : chapter.status}</span><h3>{chapter.displayLabel}</h3>{chapter.title && <p>{chapter.title}</p>}</div>
              <button type="button" className={styles.secondary} aria-expanded={openChapter === chapter.id} onClick={() => void toggleChapter(chapter.id)}>{openChapter === chapter.id ? "Cerrar" : "Ver publicaciones"}</button></div>
            {openChapter === chapter.id && <div className={styles.releaseArea}>
              <div className={styles.sectionHeading}><h4>Publicaciones</h4>{canPrepare && chapter.status === "ACTIVE" && <button type="button" className={styles.secondary} aria-expanded={showReleaseForm} onClick={() => setShowReleaseForm(!showReleaseForm)}><Plus size={14} /> Nueva publicación</button>}</div>
              {showReleaseForm && canPrepare && chapter.status === "ACTIVE" && <form className={styles.form} onSubmit={submitRelease}>
                <p>El grupo, idioma y capítulo quedarán fijos después de crear el borrador.</p>
                <label>Grupo que publica<select name="publishingGroupId" required>{preparableGroups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}</select></label>
                <label>Idioma de la publicación<input name="language" required maxLength={35} defaultValue="es" placeholder="es" /></label>
                <button className={styles.primary} disabled={busy} type="submit">{busy ? "Creando…" : "Crear borrador"}</button>
              </form>}
              {releases ? releases.items.length ? <ul className={styles.releaseList}>{releases.items.map((release) => <li key={release.id}>
                <div><strong>{release.supersedesReleaseId ? "Reemplazo en borrador" : "Publicación"}</strong><span>{releaseLabel[release.status]} · {release.language} · {project.groups.find((group) => group.id === release.publishingGroupId)?.name ?? "Grupo no disponible"}</span></div>
                <Link href={releaseHref(project.id, chapter.id, release.id)} aria-label={`Abrir publicación de ${chapter.displayLabel}`}><ArrowRight size={18} /></Link>
              </li>)}</ul> : <p className={styles.empty}>Todavía no hay publicaciones para este capítulo.</p> : <p role="status">Cargando publicaciones…</p>}
              {releases && releases.pagination.pageCount > 1 && <div className={styles.pagination}><button disabled={busy || releases.pagination.page === 1} onClick={() => void getReleases(project.id, chapter.id, releases.pagination.page - 1).then(setReleases).catch((cause) => setError(workflowError(cause)))}>Anterior</button><span>Página {releases.pagination.page} de {releases.pagination.pageCount}</span><button disabled={busy || releases.pagination.page >= releases.pagination.pageCount} onClick={() => void getReleases(project.id, chapter.id, releases.pagination.page + 1).then(setReleases).catch((cause) => setError(workflowError(cause)))}>Siguiente</button></div>}
            </div>}
          </article>) : <p className={styles.empty}>Este proyecto aún no tiene capítulos.</p>}
        </div>
        {chapters.pagination.pageCount > 1 && <div className={styles.pagination}><button disabled={busy || chapters.pagination.page === 1} onClick={() => void getChapters(project.id, chapters.pagination.page - 1).then(setChapters).catch((cause) => setError(workflowError(cause)))}>Anterior</button><span>Página {chapters.pagination.page} de {chapters.pagination.pageCount}</span><button disabled={busy || chapters.pagination.page >= chapters.pagination.pageCount} onClick={() => void getChapters(project.id, chapters.pagination.page + 1).then(setChapters).catch((cause) => setError(workflowError(cause)))}>Siguiente</button></div>}
      </section>
      <aside className={styles.rail} aria-label="Contexto del proyecto">
        <section className={styles.panel}><div className={styles.sectionHeading}><Users size={18} /><h2>Grupos participantes</h2></div>
          <ul className={styles.groupList}>{project.groups.map((group) => <li key={group.id}><span>{group.name}<small>{group.status === "VERIFIED" ? "Verificado" : group.status}</small></span>{isAdmin && <button disabled={busy} type="button" onClick={() => void run(async () => { await removeProjectGroup(project.id, group.id, csrfToken); await refresh(); }, "Grupo retirado del proyecto.")}>Retirar</button>}</li>)}</ul>
          {isAdmin && <form className={styles.form} onSubmit={(event) => { event.preventDefault(); if (!groupId) return; void run(async () => { await addProjectGroup(project.id, groupId, csrfToken); setGroupId(""); setGroupResults([]); await refresh(); }, "Grupo añadido al proyecto."); }}>
            <label>Buscar grupo verificado<input value={groupQuery} onChange={(event) => { groupSearchGeneration.current += 1; setGroupQuery(event.target.value); setGroupResults([]); setGroupId(""); }} maxLength={80} placeholder="Nombre del grupo" /></label>
            <button className={styles.secondary} type="button" disabled={busy || !groupQuery.trim()} onClick={() => void searchGroups()}>Buscar grupos</button>
            {groupResults.length > 0 && <label>Grupo seleccionado<select value={groupId} required onChange={(event) => setGroupId(event.target.value)}><option value="">Selecciona un grupo</option>{groupResults.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}</select></label>}
            {groupResults.length > 0 && <button className={styles.secondary} disabled={busy || !groupId} type="submit">Añadir grupo</button>}
          </form>}
          {!isAdmin && <p className={styles.muted}>La participación del proyecto solo puede administrarla un administrador global.</p>}
        </section>
        <section className={styles.panel}><h2>Proyecto</h2><dl><dt>Manga</dt><dd>{project.manga.title}</dd><dt>Estado</dt><dd>{project.status === "ACTIVE" ? "Activo" : project.status}</dd><dt>Creado</dt><dd><time dateTime={project.createdAt}>{new Date(project.createdAt).toLocaleDateString("es-PE")}</time></dd></dl></section>
      </aside>
    </div>
  </main>;
}
