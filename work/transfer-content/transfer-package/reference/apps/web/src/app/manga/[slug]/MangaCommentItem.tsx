"use client";

import { useState } from "react";
import { Eye, MessageSquare, Pencil, Shield, Trash2, Undo2, UserRound } from "lucide-react";
import type { MangaComment } from "@/data/manga-comments";
import type { CommentDialogAction } from "./MangaCommentDialogs";
import styles from "./MangaComments.module.css";

export function MangaCommentItem({ comment, owned, canParticipate, canModerate, pending, onReply, onEdit, onDialog }: {
  comment: MangaComment; owned: boolean; canParticipate: boolean; canModerate: boolean; pending: boolean;
  onReply: () => void; onEdit: () => void; onDialog: (action: CommentDialogAction) => void;
}) {
  const [revealed, setRevealed] = useState(false);
  const published = comment.status === "PUBLISHED";
  return <article className={styles.comment} aria-label={`Comentario de ${comment.author.displayName ?? comment.author.username ?? "usuario"}`}>
    <div className={styles.author}>
      <UserRound size={18} aria-hidden="true" />
      {comment.author.username ? <a href={`/perfil/${encodeURIComponent(comment.author.username)}`}>{comment.author.displayName ?? comment.author.username}</a> : <span>{comment.author.displayName ?? "Usuario"}</span>}
      <time dateTime={comment.createdAt}>{new Date(comment.createdAt).toLocaleDateString("es", { day: "numeric", month: "short", year: "numeric" })}</time>
      {comment.editedAt ? <span title={new Date(comment.editedAt).toLocaleString("es")}>Editado</span> : null}
    </div>
    {!published ? <p className={styles.placeholder}>{comment.status === "HIDDEN" ? "Comentario oculto" : "Comentario eliminado"}</p> : comment.isSpoiler && !revealed ? <button className={styles.spoiler} type="button" onClick={() => setRevealed(true)}><Eye size={16} aria-hidden="true" /> Mostrar spoiler</button> : <>
      <p className={styles.body}>{comment.body}</p>
      {comment.isSpoiler ? <button type="button" className={styles.textButton} onClick={() => setRevealed(false)}>Ocultar spoiler</button> : null}
    </>}
    <div className={styles.actions}>
      {canParticipate && published && !comment.parentCommentId ? <button type="button" disabled={pending} onClick={onReply}><MessageSquare size={14} aria-hidden="true" /> Responder</button> : null}
      {canParticipate && owned && published ? <button type="button" disabled={pending} onClick={onEdit}><Pencil size={14} aria-hidden="true" /> Editar</button> : null}
      {canParticipate && owned && comment.status !== "REMOVED" ? <button type="button" disabled={pending} onClick={(event) => onDialog({ comment, command: "remove", invoker: event.currentTarget })}><Trash2 size={14} aria-hidden="true" /> Eliminar</button> : null}
      {canModerate && comment.status !== "REMOVED" ? <button type="button" disabled={pending} onClick={(event) => onDialog({ comment, command: published ? "hide" : "unhide", invoker: event.currentTarget })}>{published ? <Shield size={14} aria-hidden="true" /> : <Undo2 size={14} aria-hidden="true" />}{published ? "Ocultar" : "Restaurar"}</button> : null}
    </div>
  </article>;
}
