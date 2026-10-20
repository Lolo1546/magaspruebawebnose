"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { MessageSquare } from "lucide-react";
import { EmptyState, ErrorState } from "@/components/feedback/FeedbackState";
import { InlineAlert } from "@/components/feedback/InlineAlert";
import { Skeleton } from "@/components/feedback/Skeleton";
import type { MangaComment, MangaCommentRoot, MangaCommentsAccess, CommentPageInfo } from "@/data/manga-comments";
import { mergeComments } from "@/data/manga-comments";
import { createMangaComment, fetchMangaCommentOwnership, fetchMangaComments, fetchMangaCommentsAccess, fetchMangaReplies, mangaCommentsErrorMessage, mutateMangaComment } from "@/data/manga-comments.client";
import { MangaCommentComposer } from "./MangaCommentComposer";
import { MangaCommentItem } from "./MangaCommentItem";
import { MangaCommentDialogs, type CommentDialogAction } from "./MangaCommentDialogs";
import styles from "./MangaComments.module.css";

type SectionProps = { slug: string; viewerId?: string | null; csrfToken?: string | null };
const readonlyAccess: MangaCommentsAccess = { canParticipate: false, canModerate: false };

export function MangaCommentsSection(props: SectionProps) {
  // A new Manga or session gets a separate lifecycle; old responses cannot own new state.
  return <Discussion key={`${props.slug}:${props.viewerId ?? "guest"}:${props.csrfToken ?? ""}`} {...props} />;
}

function Discussion({ slug, viewerId = null, csrfToken = null }: SectionProps) {
  const [rows, setRows] = useState<MangaCommentRoot[]>([]);
  const [totalPublished, setTotalPublished] = useState(0);
  const [page, setPage] = useState<CommentPageInfo>({ hasMore: false, nextCursor: null });
  const [access, setAccess] = useState(readonlyAccess);
  const [owned, setOwned] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [reading, setReading] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [mutationError, setMutationError] = useState("");
  const [body, setBody] = useState("");
  const [spoiler, setSpoiler] = useState(false);
  const [target, setTarget] = useState<{ comment: MangaComment; mode: "reply" | "edit"; invoker: HTMLElement | null } | null>(null);
  const [targetBody, setTargetBody] = useState("");
  const [targetSpoiler, setTargetSpoiler] = useState(false);
  const [dialog, setDialog] = useState<CommentDialogAction | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const live = useRef(true);
  const busy = useRef(false);
  const readBusy = useRef(false);
  const epoch = useRef(0);
  const controller = useRef<AbortController | null>(null);
  const accessRef = useRef(readonlyAccess);

  useEffect(() => {
    live.current = true;
    const abort = new AbortController(); controller.current = abort;
    const token = ++epoch.current;
    async function initial() {
      const permission = viewerId ? fetchMangaCommentsAccess(abort.signal).catch(() => readonlyAccess) : Promise.resolve(readonlyAccess);
      try {
        const [result, granted] = await Promise.all([fetchMangaComments(slug, null, abort.signal), permission]);
        if (!live.current || token !== epoch.current) return;
        let ownedIds: string[] = [];
        if (granted.canParticipate && csrfToken) {
          const ids = result.items.flatMap((root) => [root.id, ...root.replies.map((reply) => reply.id)]);
          if (ids.length) {
            try {
              const overlay = await fetchMangaCommentOwnership(slug, ids, csrfToken, abort.signal);
              ownedIds = overlay.ownedCommentIds;
            } catch { if (live.current && token === epoch.current) setNotice("No pudimos verificar tus comentarios propios. Puedes actualizar la discusión para reintentarlo."); }
          }
        }
        if (!live.current || token !== epoch.current) return;
        accessRef.current = granted; setAccess(granted); setOwned(new Set(ownedIds)); setRows(result.items); setPage(result.pageInfo); setTotalPublished(result.totalPublished); setLoading(false);
      } catch {
        if (live.current && token === epoch.current) { setLoading(false); setError("No pudimos cargar todos los datos de la discusión."); }
      }
    }
    void initial();
    return () => { live.current = false; abort.abort(); controller.current?.abort(); };
  }, [slug, viewerId, csrfToken]);

  async function readMore(root?: MangaCommentRoot, reset = false) {
    if (readBusy.current || busy.current) return;
    readBusy.current = true; setReading(true); setError("");
    controller.current?.abort(); const abort = new AbortController(); controller.current = abort;
    const token = ++epoch.current;
    try {
      if (reset && viewerId) {
        const granted = await fetchMangaCommentsAccess(abort.signal).catch(() => readonlyAccess);
        if (!live.current || token !== epoch.current) return;
        accessRef.current = granted; setAccess(granted);
      }
      const cursor = reset ? null : root ? root.repliesPageInfo.nextCursor : page.nextCursor;
      let ids: string[];
      if (root) {
        const result = await fetchMangaReplies(root.id, cursor, abort.signal);
        if (!live.current || token !== epoch.current) return;
        ids = result.items.map((row) => row.id);
        setRows((current) => current.map((row) => row.id === root.id ? { ...row, replies: mergeComments(row.replies, result.items).sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id)), repliesPageInfo: result.pageInfo } : row));
      } else {
        const result = await fetchMangaComments(slug, cursor, abort.signal);
        if (!live.current || token !== epoch.current) return;
        ids = result.items.flatMap((row) => [row.id, ...row.replies.map((reply) => reply.id)]);
        setRows((current) => reset ? result.items : mergeComments(current, result.items)); setPage(result.pageInfo); setTotalPublished(result.totalPublished);
      }
      if (accessRef.current.canParticipate && csrfToken) {
        if (ids.length) {
          const overlay = await fetchMangaCommentOwnership(slug, ids, csrfToken, abort.signal);
          if (live.current && token === epoch.current) setOwned((current) => new Set([...current, ...overlay.ownedCommentIds]));
        }
      }
    } catch { if (live.current && token === epoch.current) setError("No pudimos actualizar la discusión. Inténtalo de nuevo."); }
    finally { readBusy.current = false; if (live.current && token === epoch.current) { setReading(false); setLoading(false); } }
  }

  function updateComment(comment: MangaComment) {
    setRows((current) => current.map((root) => root.id === comment.id ? { ...root, ...comment } : { ...root, replies: root.replies.map((reply) => reply.id === comment.id ? comment : reply) }));
  }

  async function write(kind: "create" | "target" | "dialog", reason = "") {
    if (busy.current || readBusy.current || !csrfToken || !accessRef.current.canParticipate) return;
    busy.current = true; setPending(true); setMutationError(""); setNotice("");
    controller.current?.abort(); const token = ++epoch.current; setReading(false);
    const submittedTarget = target; const submittedDialog = dialog;
    try {
      const result = kind === "create" ? await createMangaComment(slug, { body: body.trim(), isSpoiler: spoiler }, csrfToken)
        : kind === "target" && submittedTarget ? submittedTarget.mode === "reply"
          ? await createMangaComment(slug, { body: targetBody.trim(), isSpoiler: targetSpoiler, parentCommentId: submittedTarget.comment.id }, csrfToken)
          : await mutateMangaComment(submittedTarget.comment.id, "edit", { body: targetBody.trim(), isSpoiler: targetSpoiler }, csrfToken)
        : kind === "dialog" && submittedDialog ? await mutateMangaComment(submittedDialog.comment.id, submittedDialog.command, submittedDialog.command === "remove" ? {} : { reason }, csrfToken) : null;
      if (!result || !live.current || token !== epoch.current) return;
      const comment = result.comment;
      const previous = kind === "dialog" ? submittedDialog?.comment : kind === "target" && submittedTarget?.mode === "edit" ? submittedTarget.comment : null;
      setTotalPublished((count) => Math.max(0, count + Number(comment.status === "PUBLISHED") - Number(previous?.status === "PUBLISHED")));
      if (kind === "create") {
        setRows((current) => [{ ...comment, replies: [], repliesPageInfo: { hasMore: false, nextCursor: null } }, ...current]); setBody(""); setSpoiler(false); setOwned((current) => new Set([...current, comment.id]));
      } else if (kind === "target" && submittedTarget?.mode === "reply") {
        setRows((current) => current.map((root) => root.id === comment.parentCommentId ? { ...root, replies: mergeComments(root.replies, [comment]) } : root)); setOwned((current) => new Set([...current, comment.id]));
      } else updateComment(comment);
      if (kind === "target") { setTarget(null); if (submittedTarget?.invoker?.isConnected) submittedTarget.invoker.focus(); else heading.current?.focus(); }
      if (kind === "dialog") setDialog(null);
      setNotice(comment.status === "REMOVED" ? "Comentario eliminado." : comment.status === "HIDDEN" ? "Comentario oculto." : submittedDialog?.command === "unhide" ? "Comentario restaurado." : kind === "target" && submittedTarget?.mode === "edit" ? "Cambios guardados." : "Comentario publicado.");
    } catch (failure) { if (live.current && token === epoch.current) setMutationError(mangaCommentsErrorMessage(failure)); }
    finally { busy.current = false; if (live.current && token === epoch.current) setPending(false); }
  }

  function openTarget(comment: MangaComment, mode: "reply" | "edit") {
    setTarget({ comment, mode, invoker: document.activeElement instanceof HTMLElement ? document.activeElement : null });
    setTargetBody(mode === "edit" ? comment.body ?? "" : ""); setTargetSpoiler(mode === "edit" && comment.isSpoiler); setMutationError("");
  }

  function targetForm(comment: MangaComment) {
    return target?.comment.id === comment.id ? <MangaCommentComposer key={`${target.mode}:${comment.id}`} body={targetBody} spoiler={targetSpoiler} pending={pending} label={target.mode === "edit" ? "Editar tu comentario" : "Tu respuesta"} submitLabel={target.mode === "edit" ? "Guardar cambios" : "Publicar respuesta"} onBody={setTargetBody} onSpoiler={setTargetSpoiler} onSubmit={() => void write("target")} onCancel={() => { const invoker = target.invoker; setTarget(null); if (invoker?.isConnected) invoker.focus(); else heading.current?.focus(); }} /> : null;
  }

  function item(comment: MangaComment) {
    return <><MangaCommentItem key={`${comment.id}:${comment.updatedAt}`} comment={comment} owned={owned.has(comment.id)} canParticipate={access.canParticipate && !!csrfToken} canModerate={access.canModerate && !!csrfToken} pending={pending || reading} onReply={() => openTarget(comment, "reply")} onEdit={() => openTarget(comment, "edit")} onDialog={(action) => { setDialog(action); setMutationError(""); }} />{targetForm(comment)}</>;
  }

  return <section className={styles.panel} aria-labelledby="manga-comments-heading" aria-busy={loading}>
    <h2 id="manga-comments-heading" ref={heading} tabIndex={-1}><MessageSquare size={22} aria-hidden="true" />Comentarios</h2>
    {!loading ? <p className={styles.orientation}>{totalPublished} comentarios publicados, incluidas las respuestas.</p> : null}
    {!viewerId ? <p className={styles.orientation}><Link href={`/login?returnTo=${encodeURIComponent(`/manga/${slug}`)}`}>Inicia sesión</Link> para participar en la conversación.</p> : loading ? null : !access.canParticipate || !csrfToken ? <InlineAlert>Tu cuenta puede leer la discusión, pero no participar actualmente.</InlineAlert> : <MangaCommentComposer body={body} spoiler={spoiler} pending={pending || reading} onBody={setBody} onSpoiler={setSpoiler} onSubmit={() => void write("create")} />}
    {notice ? <InlineAlert tone="success">{notice}</InlineAlert> : null}
    {mutationError && !dialog ? <InlineAlert tone="error">{mutationError}</InlineAlert> : null}
    {loading ? <div role="status" aria-label="Cargando comentarios"><Skeleton height={75} width="100%" /><Skeleton height={75} width="100%" /></div> : null}
    {error ? <ErrorState headingLevel={3} title="Comentarios no disponibles" description={error} primaryAction={<button type="button" disabled={reading || pending} onClick={() => void readMore(undefined, true)}>Reintentar</button>} /> : null}
    {!loading && !error && !rows.length ? <EmptyState headingLevel={3} title="Aún no hay comentarios" description="Comparte tu opinión sobre este manga y marca los spoilers." /> : null}
    <div className={styles.list}>{rows.map((root) => <div key={root.id} className={styles.thread}>{item(root)}{root.replies.length ? <div className={styles.replies}>{root.replies.map((reply) => <div key={reply.id}>{item(reply)}</div>)}</div> : null}{root.repliesPageInfo.hasMore ? <button className={styles.loadMore} type="button" disabled={reading || pending} onClick={() => void readMore(root)}>Cargar más respuestas</button> : null}</div>)}</div>
    {page.hasMore ? <button className={styles.loadMore} type="button" disabled={reading || pending} onClick={() => void readMore()}>{reading ? "Cargando…" : "Cargar más comentarios"}</button> : null}
    {!loading && !error ? <button className={styles.loadMore} type="button" disabled={reading || pending} onClick={() => void readMore(undefined, true)}>Actualizar discusión</button> : null}
    {dialog ? <MangaCommentDialogs action={dialog} pending={pending} error={mutationError} fallback={heading} onClose={() => setDialog(null)} onConfirm={(reason) => void write("dialog", reason)} /> : null}
  </section>;
}
