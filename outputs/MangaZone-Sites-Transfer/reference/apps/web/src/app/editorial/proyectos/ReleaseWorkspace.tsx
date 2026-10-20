"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowDown, ArrowLeft, ArrowUp, ImagePlus, RefreshCw, UploadCloud, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { EditorialClientError } from "@/data/editorial.client";
import type { EditorialChapter, EditorialMembership, EditorialPages, EditorialProject, EditorialRelease, ThumbnailState } from "@/data/editorial-workflow";
import { editorialUiAccess, privateMediaUrl, projectHref, releaseHref, releaseLabel } from "@/data/editorial-workflow";
import { createPageIntent, createRelease, createThumbnailIntent, finalizeEditorialIntent, getPages, getRelease, getThumbnail, putEditorialUpload, reorderPages, requestThumbnailChange, setThumbnail, transitionRelease, workflowError } from "@/data/editorial-workflow.client";
import styles from "./Workflow.module.css";

type QueueItem = { key: string; file: File; status: "pendiente" | "subiendo" | "finalizando" | "completo" | "error"; error?: string };
type Props = {
  project: EditorialProject;
  chapter: EditorialChapter;
  initialRelease: EditorialRelease;
  initialPages: EditorialPages | null;
  initialThumbnail: ThumbnailState;
  memberships: EditorialMembership[];
  isAdmin: boolean;
  csrfToken: string;
};

const imageTypes = ["image/jpeg", "image/png", "image/webp"];
function fileProblem(file: File, max: number): string | null {
  if (!imageTypes.includes(file.type)) return "Selecciona JPEG, PNG o WebP estático.";
  if (file.size < 1) return "El archivo está vacío.";
  if (file.size > max) return `El archivo supera ${Math.round(max / 1048576)} MiB.`;
  return null;
}

function Reader({ pages, onClose }: { pages: EditorialPages; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => { dialog?.close(); };
  }, []);
  return <dialog className={styles.reader} ref={ref} onClose={onClose} aria-label="Vista previa privada de la publicación">
    <header><strong>Vista previa privada · {pages.pages.length} páginas</strong><div><button type="button" onClick={() => setRetry((value) => value + 1)}><RefreshCw size={16} /> Actualizar enlaces</button><button type="button" onClick={() => ref.current?.close()} aria-label="Cerrar vista previa"><X size={20} /></button></div></header>
    <div className={styles.readerPages} key={retry}>{pages.pages.map((page) => <figure key={page.id}>
      <Image unoptimized src={privateMediaUrl(page.previewUrl)} width={page.width} height={page.height} alt={`Página ${page.pageNumber}`} />
      <figcaption>Página {page.pageNumber}</figcaption>
    </figure>)}</div>
  </dialog>;
}

export function ReleaseWorkspace({ project, chapter, initialRelease, initialPages, initialThumbnail, memberships, isAdmin, csrfToken }: Props) {
  const router = useRouter();
  const [release, setRelease] = useState(initialRelease);
  const [pages, setPages] = useState(initialPages);
  const [thumbnail, setThumbnailState] = useState(initialThumbnail);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [draftIds, setDraftIds] = useState<string[] | null>(null);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const refreshGeneration = useRef(0);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [stale, setStale] = useState(false);
  const [currentState, setCurrentState] = useState("");
  const [readerOpen, setReaderOpen] = useState(false);
  const [confirmation, setConfirmation] = useState<"publish" | "withdraw" | null>(null);
  const confirmRef = useRef<HTMLDialogElement>(null);
  const [thumbnailBusy, setThumbnailBusy] = useState(false);
  const thumbnailBusyRef = useRef(false);
  const [thumbnailError, setThumbnailError] = useState("");
  const [thumbnailSuccess, setThumbnailSuccess] = useState("");
  const [thumbnailNeedsRefresh, setThumbnailNeedsRefresh] = useState(false);
  const access = editorialUiAccess(isAdmin, memberships, release.publishingGroupId);
  const operational = project.status === "ACTIVE" && project.groups.some((group) => group.id === release.publishingGroupId && group.status === "VERIFIED");
  const editable = release.status === "DRAFT" && chapter.status === "ACTIVE" && operational && access.canPrepare && !stale;
  const canPublish = release.status === "DRAFT" && chapter.status === "ACTIVE" && operational && access.canPublish && !stale;
  const canWithdraw = release.status === "PUBLISHED" && (isAdmin || operational && access.canPublish) && !stale;
  const canReplace = release.status === "PUBLISHED" && chapter.status === "ACTIVE" && operational && access.canPublish && !stale;
  const groupName = project.groups.find((group) => group.id === release.publishingGroupId)?.name ?? "Grupo no disponible";
  const orderedPages = draftIds && pages ? draftIds.map((id) => pages.pages.find((page) => page.id === id)).filter((page): page is NonNullable<typeof page> => !!page) : pages?.pages ?? [];
  const orderChanged = !!draftIds && !!pages && draftIds.some((id, index) => id !== pages.pages[index]?.id);
  const requestGroup = thumbnail.actorGroups.find((entry) => entry.canRequestChange);
  const setGroup = thumbnail.priority && thumbnail.actorGroups.some((entry) => entry.groupId === thumbnail.priority?.groupId)
    ? thumbnail.priority.groupId : undefined;

  useEffect(() => {
    const dialog = confirmRef.current;
    if (confirmation) dialog?.showModal();
    else dialog?.close();
  }, [confirmation]);

  async function refresh(clearOrder = true) {
    const generation = ++refreshGeneration.current;
    const [nextRelease, nextPages, nextThumbnail] = await Promise.all([
      getRelease(project.id, chapter.id, release.id),
      getPages(project.id, chapter.id, release.id),
      getThumbnail(chapter.id),
    ]);
    if (generation !== refreshGeneration.current) return;
    setRelease(nextRelease.release);
    setPages(nextPages);
    setThumbnailState(nextThumbnail);
    if (clearOrder) { setDraftIds(null); setStale(false); }
  }

  async function run(action: () => Promise<void>, message: string) {
    if (busyRef.current) return;
    busyRef.current = true; setBusy(true); setError(""); setSuccess("");
    try { await action(); if (message) setSuccess(message); }
    catch (cause) {
      setStale(true);
      setError(cause instanceof EditorialClientError && cause.code === "EDITORIAL_RELEASE_NO_PAGES"
        ? "Añade al menos una página antes de publicar."
        : cause instanceof EditorialClientError && cause.code === "EDITORIAL_RELEASE_PAGES_NOT_READY"
          ? "Algunas páginas aún no cumplen las condiciones de publicación. Revisa el estado actual."
          : workflowError(cause));
    } finally { busyRef.current = false; setBusy(false); }
  }

  function updateQueue(key: string, patch: Partial<QueueItem>) {
    setQueue((items) => items.map((item) => item.key === key ? { ...item, ...patch } : item));
  }

  function selectPages(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!files.length || !editable || busyRef.current) return;
    const items = files.map((file) => ({ key: crypto.randomUUID(), file, status: "pendiente" as const }));
    setQueue((current) => [...current, ...items]);
    void run(async () => {
      for (const item of items) {
        const problem = fileProblem(item.file, 20_971_520);
        if (problem) { updateQueue(item.key, { status: "error", error: problem }); continue; }
        try {
          updateQueue(item.key, { status: "subiendo" });
          const intent = await createPageIntent(project.id, chapter.id, release.id, item.file, csrfToken);
          await putEditorialUpload(intent, item.file);
          updateQueue(item.key, { status: "finalizando" });
          await finalizeEditorialIntent(intent.intentId, csrfToken);
          updateQueue(item.key, { status: "completo" });
          try { await refresh(); }
          catch { setStale(true); setError("La página se guardó, pero no se pudo actualizar la lista. Recarga el estado antes de intentar otra carga."); break; }
        } catch (cause) {
          updateQueue(item.key, { status: "error", error: workflowError(cause) });
          if (cause instanceof EditorialClientError && cause.status === 409) {
            setStale(true);
            break;
          }
        }
      }
    }, "");
  }

  function movePage(index: number, offset: number) {
    const ids = orderedPages.map((page) => page.id);
    const next = index + offset;
    if (next < 0 || next >= ids.length) return;
    [ids[index], ids[next]] = [ids[next], ids[index]];
    setDraftIds(ids);
  }

  function saveOrder() {
    if (!pages || !orderChanged || !draftIds) return;
    void run(async () => {
      await reorderPages(project.id, chapter.id, release.id, release.version, draftIds, csrfToken);
      await refresh();
    }, "Orden guardado.");
  }

  function confirmTransition() {
    const action = confirmation;
    confirmRef.current?.close();
    setConfirmation(null);
    if (!action) return;
    void run(async () => {
      await transitionRelease(project.id, chapter.id, release.id, action, release.version, csrfToken);
      await refresh();
      router.refresh();
    }, action === "publish" ? "Publicación completada." : "Publicación retirada.");
  }

  function makeReplacement() {
    const publishingGroupId = release.publishingGroupId;
    if (!publishingGroupId) return;
    void run(async () => {
      const result = await createRelease(project.id, chapter.id, {
        publishingGroupId,
        language: release.language,
        supersedesReleaseId: release.id,
      }, csrfToken);
      router.push(releaseHref(project.id, chapter.id, result.release.id));
      router.refresh();
    }, "Reemplazo en borrador creado.");
  }

  async function uploadThumbnail(file: File, mode: "set" | "override" | "request") {
    const problem = fileProblem(file, 5_242_880);
    if (problem) { setThumbnailError(problem); return; }
    if (thumbnailBusyRef.current) return;
    thumbnailBusyRef.current = true;
    setThumbnailBusy(true); setThumbnailError(""); setThumbnailSuccess("");
    let committed = false;
    try {
      const groupId = mode === "request" ? requestGroup?.groupId : mode === "set" ? setGroup : undefined;
      if (mode === "request" && !groupId || mode === "set" && !isAdmin && !groupId) throw new EditorialClientError(409);
      const intent = await createThumbnailIntent(chapter.id, file, csrfToken, groupId);
      await putEditorialUpload(intent, file);
      const { assetId } = await finalizeEditorialIntent(intent.intentId, csrfToken);
      if (mode === "request") await requestThumbnailChange(chapter.id, groupId!, assetId, csrfToken);
      else await setThumbnail(chapter.id, assetId, csrfToken, { groupId, override: mode === "override" });
      committed = true;
      setThumbnailNeedsRefresh(true);
      setThumbnailState(await getThumbnail(chapter.id));
      setThumbnailNeedsRefresh(false);
      setThumbnailSuccess(mode === "request" ? "Solicitud de cambio enviada." : "Miniatura actualizada.");
    } catch (cause) {
      setThumbnailError(committed ? "La operación se guardó, pero no se pudo actualizar el estado. Recárgalo antes de intentar otra acción." : workflowError(cause));
      try { setThumbnailState(await getThumbnail(chapter.id)); setThumbnailNeedsRefresh(false); } catch { /* Preserve the original error. */ }
    } finally { thumbnailBusyRef.current = false; setThumbnailBusy(false); }
  }

  const thumbnailMode = thumbnailNeedsRefresh ? null : thumbnail.canOverride && thumbnail.fixed ? "override" : thumbnail.canSet ? "set" : requestGroup ? "request" : null;
  const thumbnailLabel = thumbnailMode === "request" ? "Solicitar cambio" : thumbnailMode === "override" ? "Reemplazar miniatura" : "Subir miniatura";

  return <main className={styles.page}>
    <nav className={styles.breadcrumb} aria-label="Ruta editorial"><Link href={projectHref(project.id)}><ArrowLeft size={15} /> {project.manga.title}</Link><span>/</span><span>{chapter.displayLabel}</span></nav>
    <header className={styles.hero}><div><span className={styles.eyebrow}>Publicación · {releaseLabel[release.status]}</span><h1>{chapter.displayLabel}</h1><p>{chapter.title ?? "Prepara y revisa esta publicación editorial."}</p></div>
      <span className={styles.statePill}>{releaseLabel[release.status]}</span></header>
    {release.supersedesReleaseId && <p className={styles.notice}>Esta publicación reemplazará a la publicación actual de {chapter.displayLabel}. La original permanece publicada hasta completar este reemplazo. <Link href={releaseHref(project.id, chapter.id, release.supersedesReleaseId)}>Ver publicación original</Link></p>}
    {success && <p className={styles.success} role="status">{success}</p>}
    {error && <p className={styles.error} role="alert">{error}</p>}
    {stale && <div className={styles.conflict} role="alert"><strong>La publicación cambió mientras estabas trabajando.</strong><div className={styles.actions}><button type="button" onClick={() => void refresh().catch((cause) => setError(workflowError(cause)))}>Recargar cambios</button><button type="button" onClick={() => void getRelease(project.id, chapter.id, release.id).then((data) => setCurrentState(`${releaseLabel[data.release.status]} · revisión ${data.release.version}`)).catch((cause) => setError(workflowError(cause)))}>Revisar estado actual</button></div>{currentState && <p>Estado del servidor: {currentState}</p>}</div>}
    <div className={styles.columns}>
      <div className={styles.mainColumn}>
        <section className={styles.panel} aria-labelledby="context-title"><div className={styles.sectionHeading}><div><span className={styles.eyebrow}>Contexto fijo</span><h2 id="context-title">Datos de la publicación</h2></div></div>
          <dl className={styles.contextGrid}><div><dt>Manga</dt><dd>{project.manga.title}</dd></div><div><dt>Capítulo</dt><dd>{chapter.displayLabel}</dd></div><div><dt>Idioma</dt><dd>{release.language}</dd></div><div><dt>Grupo responsable</dt><dd>{groupName}</dd></div></dl>
        </section>
        <section className={styles.panel} aria-labelledby="thumbnail-title"><div className={styles.sectionHeading}><div><span className={styles.eyebrow}>Capítulo lógico</span><h2 id="thumbnail-title">Miniatura del capítulo</h2></div>{thumbnail.fixed && <span className={styles.statePill}>Fijada</span>}</div>
          <div className={styles.thumbnailRow}><div className={styles.thumbnailImage}><Image unoptimized src={privateMediaUrl(thumbnail.thumbnail?.previewUrl ?? `/media/mangas/${project.manga.id}/cover`)} width={180} height={250} alt={thumbnail.thumbnail ? `Miniatura de ${chapter.displayLabel}` : `Portada de ${project.manga.title} como respaldo`} /></div><div><p>{thumbnail.thumbnail ? "Miniatura personalizada" : "Sin miniatura personalizada. Se muestra la portada del manga como respaldo."}</p>
            {thumbnail.thumbnail && <p className={styles.muted}>Definida por {project.groups.find((group) => group.id === thumbnail.thumbnail?.groupId)?.name ?? "administración editorial"}</p>}
            {thumbnail.priority && <p className={styles.muted}>Prioridad actual: {project.groups.find((group) => group.id === thumbnail.priority?.groupId)?.name ?? "Grupo"}. Vence: <time dateTime={thumbnail.priority.expiresAt}>{new Date(thumbnail.priority.expiresAt).toLocaleString("es-PE")}</time></p>}
            {thumbnail.actorGroups.some((entry) => entry.hasPendingRequest) && <p className={styles.notice}>Solicitud pendiente</p>}
            {thumbnailMode && <label className={styles.fileButton}><ImagePlus size={17} /> {thumbnailLabel}<input type="file" accept="image/jpeg,image/png,image/webp" disabled={thumbnailBusy} onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; if (file) void uploadThumbnail(file, thumbnailMode); }} /></label>}
            {thumbnailNeedsRefresh && <button className={styles.secondary} type="button" onClick={() => void getThumbnail(chapter.id).then((state) => { setThumbnailState(state); setThumbnailNeedsRefresh(false); setThumbnailError(""); }).catch((cause) => setThumbnailError(workflowError(cause)))}>Recargar miniatura</button>}
            {thumbnailBusy && <p role="status">Validando miniatura…</p>}{thumbnailError && <p role="alert" className={styles.error}>{thumbnailError}</p>}{thumbnailSuccess && <p role="status" className={styles.success}>{thumbnailSuccess}</p>}
          </div></div>
        </section>
        {editable && <section className={styles.panel} aria-labelledby="upload-title"><div className={styles.sectionHeading}><div><span className={styles.eyebrow}>Solo borrador</span><h2 id="upload-title">Cola de carga</h2></div></div>
          <label className={styles.dropzone}><UploadCloud size={24} /> Seleccionar páginas JPEG, PNG o WebP <small>Máximo 20 MiB por archivo. Se añaden al finalizar la validación.</small><input type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={busy} onChange={selectPages} /></label>
          {queue.length > 0 && <ul className={styles.queue}>{queue.map((item) => <li key={item.key}><span>{item.file.name}</span><span>{item.status === "error" ? item.error : item.status}</span></li>)}</ul>}
        </section>}
        <section className={styles.panel} aria-labelledby="pages-title"><div className={styles.sectionHeading}><div><span className={styles.eyebrow}>Orden de lectura</span><h2 id="pages-title">Páginas persistidas</h2></div><span>{pages?.pages.length ?? 0} páginas</span></div>
          {orderedPages.length ? <ol className={styles.pageGrid}>{orderedPages.map((page, index) => <li key={page.id}>
            <Image unoptimized src={privateMediaUrl(page.previewUrl)} width={page.width} height={page.height} alt={`Vista previa de página ${index + 1}`} />
            <div><strong>Página {index + 1}</strong><span>{page.width} × {page.height}</span></div>
            {editable && <div className={styles.pageMove}><button type="button" aria-label={`Mover página ${index + 1} arriba`} disabled={busy || index === 0} onClick={() => movePage(index, -1)}><ArrowUp size={16} /></button><button type="button" aria-label={`Mover página ${index + 1} abajo`} disabled={busy || index === orderedPages.length - 1} onClick={() => movePage(index, 1)}><ArrowDown size={16} /></button></div>}
          </li>)}</ol> : <p className={styles.empty}>Esta publicación todavía no tiene páginas disponibles.</p>}
          {editable && orderChanged && <div className={styles.actions}><span>Cambios sin guardar</span><button className={styles.primary} type="button" disabled={busy} onClick={saveOrder}>Guardar orden</button><button className={styles.secondary} type="button" disabled={busy} onClick={() => setDraftIds(null)}>Descartar orden</button></div>}
          {pages && pages.pages.length > 0 && <button className={styles.secondary} type="button" onClick={() => setReaderOpen(true)}>Abrir vista previa privada</button>}
        </section>
      </div>
      <aside className={styles.rail} aria-label="Acciones de publicación"><section className={styles.panel}><span className={styles.eyebrow}>Estado</span><h2>{releaseLabel[release.status]}</h2>
        <p className={styles.muted}>La validación final de páginas y autoridad la realiza el servidor al publicar.</p>
        {release.publishedAt && <p>Publicado: <time dateTime={release.publishedAt}>{new Date(release.publishedAt).toLocaleString("es-PE")}</time></p>}
        <div className={styles.stackedActions}>
          {canPublish && <button className={styles.primary} type="button" disabled={busy || orderChanged} onClick={() => setConfirmation("publish")}>Publicar {release.supersedesReleaseId ? "reemplazo" : "publicación"}</button>}
          {canWithdraw && <button className={styles.secondary} type="button" disabled={busy} onClick={() => setConfirmation("withdraw")}>Retirar publicación</button>}
          {canReplace && <button className={styles.secondary} type="button" disabled={busy} onClick={makeReplacement}>Crear reemplazo en borrador</button>}
        </div>
        {release.status === "WITHDRAWN" && <p className={styles.muted}>La publicación retirada conserva sus páginas para inspección privada, pero no puede editarse ni republicarse.</p>}
      </section></aside>
    </div>
    {readerOpen && pages && <Reader pages={pages} onClose={() => setReaderOpen(false)} />}
    <dialog className={styles.confirmDialog} ref={confirmRef} onClose={() => setConfirmation(null)} aria-label={confirmation === "withdraw" ? "Confirmar retiro" : "Confirmar publicación"}>
      <h2>{confirmation === "withdraw" ? "¿Retirar esta publicación?" : release.supersedesReleaseId ? "¿Publicar el reemplazo?" : "¿Publicar el capítulo?"}</h2>
      <p>{confirmation === "withdraw" ? "Sus páginas quedarán disponibles solo para inspección editorial privada." : release.supersedesReleaseId ? "El servidor retirará la publicación original y publicará el reemplazo en una sola operación." : "El servidor comprobará las páginas antes de publicarlo."}</p>
      <div className={styles.actions}><button className={styles.secondary} type="button" onClick={() => confirmRef.current?.close()}>Cancelar</button><button className={styles.primary} type="button" onClick={confirmTransition}>Confirmar</button></div>
    </dialog>
  </main>;
}
