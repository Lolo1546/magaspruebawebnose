"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/Button";
import {
  createCommunityComment,
  editCommunityComment,
  fetchCommunityPostComments,
  requestCommunityCommentDeletion,
  type CommunityDeletionRequestInput,
} from "@/data/community-content.client";
import type {
  PublicCommunityPost,
  PublicCommunityPostComment,
  PublicCommunityPostCommentsPage,
} from "@/data/communities.public";

import { communityContentErrorMessage } from "./community-content-ui";
import styles from "./CommunityContent.module.css";
import pageStyles from "./CommunityDetailPage.module.css";

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Fecha no disponible";
  return new Intl.DateTimeFormat("es-PE", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(date);
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase();
}

function CommentAuthor({
  author,
}: {
  author: PublicCommunityPostComment["author"];
}) {
  const label = author.displayName ?? author.username;
  const style = author.avatarUrl
    ? { backgroundImage: `url(${JSON.stringify(author.avatarUrl)})` }
    : undefined;
  return (
    <>
      <span
        aria-hidden="true"
        className={pageStyles.authorAvatar}
        data-has-media={author.avatarUrl ? true : undefined}
        style={style}
      >
        {author.avatarUrl ? null : label ? initials(label) : ""}
      </span>
      <div>
        <p>
          {label ?? (
            <span aria-label="Autor sin identidad pública">
              Sin identidad pública
            </span>
          )}
        </p>
        {author.username && author.displayName ? (
          <span>@{author.username}</span>
        ) : null}
      </div>
    </>
  );
}

function DeletionForm({
  onCancel,
  onSubmit,
  pending,
}: {
  onCancel: () => void;
  onSubmit: (input: CommunityDeletionRequestInput) => Promise<void>;
  pending: boolean;
}) {
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  return (
    <form
      className={styles.inlineForm}
      onSubmit={(event) => {
        event.preventDefault();
        const clean = reason.trim();
        if (clean && !pending)
          void onSubmit({
            reason: clean,
            ...(details.trim() ? { details: details.trim() } : {}),
          });
      }}
    >
      <label className={styles.field}>
        Motivo
        <input
          maxLength={2000}
          onChange={(event) => setReason(event.target.value)}
          required
          value={reason}
        />
      </label>
      <label className={styles.field}>
        Detalles opcionales
        <textarea
          maxLength={2000}
          onChange={(event) => setDetails(event.target.value)}
          value={details}
        />
      </label>
      <div className={styles.formActions}>
        <Button disabled={pending} onClick={onCancel} size="sm" variant="ghost">
          Cancelar
        </Button>
        <Button disabled={pending || !reason.trim()} size="sm" type="submit">
          {pending ? "Enviando…" : "Enviar solicitud"}
        </Button>
      </div>
    </form>
  );
}

function CommentItem({
  canParticipate,
  comment,
  csrfToken,
  currentUsername,
  onChanged,
  onReply,
  reply,
}: {
  canParticipate: boolean;
  comment: PublicCommunityPostComment;
  csrfToken: string | null;
  currentUsername: string | null;
  onChanged: () => Promise<void>;
  onReply?: () => void;
  reply: boolean;
}) {
  const [mode, setMode] = useState<"delete" | "edit" | null>(null);
  const [body, setBody] = useState(comment.body);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const isOwn = Boolean(
    canParticipate &&
    currentUsername &&
    comment.author.username === currentUsername,
  );
  async function run(operation: () => Promise<void>, successMessage?: string) {
    if (!csrfToken || pending) return;
    setPending(true);
    setError(null);
    setSuccess(null);
    try {
      await operation();
      setMode(null);
      setSuccess(successMessage ?? null);
      await onChanged();
    } catch (caught) {
      setError(
        communityContentErrorMessage(
          caught,
          "No pudimos actualizar el comentario.",
        ),
      );
    } finally {
      setPending(false);
    }
  }
  return (
    <article className={reply ? styles.reply : styles.comment}>
      <header className={styles.commentHeader}>
        <CommentAuthor author={comment.author} />
        <time dateTime={comment.createdAt}>
          {formatDate(comment.createdAt)}
        </time>
      </header>
      {mode === "edit" ? (
        <form
          className={styles.inlineForm}
          onSubmit={(event) => {
            event.preventDefault();
            const clean = body.trim();
            if (clean)
              void run(() =>
                editCommunityComment(comment.id, clean, csrfToken ?? ""),
              );
          }}
        >
          <label className={styles.field}>
            Editar comentario
            <textarea
              maxLength={5000}
              onChange={(event) => setBody(event.target.value)}
              required
              value={body}
            />
          </label>
          <div className={styles.formActions}>
            <Button
              disabled={pending}
              onClick={() => {
                setBody(comment.body);
                setMode(null);
              }}
              size="sm"
              variant="ghost"
            >
              Cancelar
            </Button>
            <Button disabled={pending || !body.trim()} size="sm" type="submit">
              {pending ? "Guardando…" : "Guardar"}
            </Button>
          </div>
        </form>
      ) : (
        <p className={styles.commentBody}>{comment.body}</p>
      )}
      {mode === "delete" ? (
        <DeletionForm
          onCancel={() => setMode(null)}
          onSubmit={(input) =>
            run(
              () =>
                requestCommunityCommentDeletion(
                  comment.id,
                  input,
                  csrfToken ?? "",
                ),
              "Solicitud de eliminación enviada. El comentario seguirá visible mientras se revisa.",
            )
          }
          pending={pending}
        />
      ) : null}
      {mode === null && canParticipate ? (
        <div className={styles.itemActions}>
          {!reply && onReply ? (
            <Button onClick={onReply} size="sm" variant="ghost">
              Responder
            </Button>
          ) : null}
          {isOwn ? (
            <>
              <Button onClick={() => setMode("edit")} size="sm" variant="ghost">
                Editar
              </Button>
              <Button
                onClick={() => setMode("delete")}
                size="sm"
                variant="ghost"
              >
                Solicitar eliminación
              </Button>
            </>
          ) : null}
        </div>
      ) : null}
      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className={styles.success} role="status">
          {success}
        </p>
      ) : null}
    </article>
  );
}

export function CommunityComments({
  canParticipate,
  csrfToken,
  currentUsername,
  initialPage,
  post,
}: {
  canParticipate: boolean;
  csrfToken: string | null;
  currentUsername: string | null;
  initialPage: PublicCommunityPostCommentsPage;
  post: PublicCommunityPost;
}) {
  const router = useRouter();
  const pendingRef = useRef(false);
  const [comments, setComments] = useState<PublicCommunityPostComment[]>([
    ...initialPage.items,
  ]);
  const [page, setPage] = useState(initialPage.page);
  const [pageCount, setPageCount] = useState(initialPage.pageCount);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [body, setBody] = useState("");
  const [pending, setPending] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  async function load(nextPage: number, replace: boolean) {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchCommunityPostComments(post.id, nextPage, 20);
      setComments((current) =>
        replace
          ? [...result.items]
          : [
              ...current,
              ...result.items.filter(
                (item) => !current.some((existing) => existing.id === item.id),
              ),
            ],
      );
      setPage(result.page);
      setPageCount(result.pageCount);
    } catch (caught) {
      setError(
        communityContentErrorMessage(
          caught,
          "No pudimos cargar los comentarios.",
        ),
      );
    } finally {
      setLoading(false);
    }
  }

  async function refresh() {
    await load(1, true);
    router.refresh();
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const clean = body.trim();
    if (!clean || !csrfToken || pendingRef.current) return;
    pendingRef.current = true;
    setPending(true);
    setError(null);
    setSuccess(null);
    try {
      await createCommunityComment(
        post.id,
        { body: clean, ...(replyTo ? { parentCommentId: replyTo } : {}) },
        csrfToken,
      );
      setBody("");
      setReplyTo(null);
      setSuccess(
        "Comentario publicado. La lista se actualizó desde el servidor.",
      );
      await refresh();
    } catch (caught) {
      setError(
        communityContentErrorMessage(
          caught,
          "No pudimos publicar el comentario.",
        ),
      );
    } finally {
      pendingRef.current = false;
      setPending(false);
    }
  }

  const ids = new Set(comments.map((comment) => comment.id));
  const topLevel = comments.filter(
    (comment) =>
      comment.parentCommentId === null || !ids.has(comment.parentCommentId),
  );
  const replies = new Map<string, PublicCommunityPostComment[]>();
  for (const comment of comments)
    if (comment.parentCommentId && ids.has(comment.parentCommentId))
      replies.set(comment.parentCommentId, [
        ...(replies.get(comment.parentCommentId) ?? []),
        comment,
      ]);

  return (
    <section
      aria-label={`Comentarios de ${post.title}`}
      className={styles.comments}
    >
      {loading && page === 0 ? (
        <p className={styles.muted} role="status">
          Cargando comentarios…
        </p>
      ) : null}
      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className={styles.success} role="status">
          {success}
        </p>
      ) : null}
      {!loading && !error && comments.length === 0 ? (
        <p className={styles.muted}>Todavía no hay comentarios.</p>
      ) : null}
      <div className={styles.commentList}>
        {topLevel.map((comment) => (
          <div key={comment.id}>
            <CommentItem
              canParticipate={canParticipate}
              comment={comment}
              csrfToken={csrfToken}
              currentUsername={currentUsername}
              onChanged={refresh}
              onReply={() => setReplyTo(comment.id)}
              reply={false}
            />
            {(replies.get(comment.id) ?? []).map((reply) => (
              <CommentItem
                canParticipate={canParticipate}
                comment={reply}
                csrfToken={csrfToken}
                currentUsername={currentUsername}
                key={reply.id}
                onChanged={refresh}
                reply
              />
            ))}
          </div>
        ))}
      </div>
      {page < pageCount ? (
        <Button
          disabled={loading}
          onClick={() => void load(page + 1, false)}
          size="sm"
          variant="secondary"
        >
          {loading ? "Cargando…" : "Cargar más comentarios"}
        </Button>
      ) : null}
      {canParticipate ? (
        <form className={styles.commentComposer} onSubmit={submit}>
          {replyTo ? (
            <div className={styles.replying}>
              Respondiendo a un comentario{" "}
              <Button
                onClick={() => setReplyTo(null)}
                size="sm"
                variant="ghost"
              >
                Cancelar respuesta
              </Button>
            </div>
          ) : null}
          <label className={styles.field}>
            {replyTo ? "Tu respuesta" : "Añadir comentario"}
            <textarea
              maxLength={5000}
              onChange={(event) => setBody(event.target.value)}
              required
              value={body}
            />
          </label>
          <div className={styles.formActions}>
            <Button disabled={pending || !body.trim()} size="sm" type="submit">
              {pending ? "Publicando…" : replyTo ? "Responder" : "Comentar"}
            </Button>
          </div>
        </form>
      ) : null}
    </section>
  );
}
