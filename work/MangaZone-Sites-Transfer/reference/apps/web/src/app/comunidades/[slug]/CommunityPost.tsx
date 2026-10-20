"use client";

import { MessageCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useRef, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import {
  editCommunityPost,
  fetchCommunityPostComments,
  requestCommunityPostDeletion,
  type CommunityDeletionRequestInput,
} from "@/data/community-content.client";
import type {
  PublicCommunityPost,
  PublicCommunityPostCommentsPage,
} from "@/data/communities.public";

import { communityContentErrorMessage } from "./community-content-ui";
import { CommunityComments } from "./CommunityComments";
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

function avatarStyle(url: string | null) {
  return url ? { backgroundImage: `url(${JSON.stringify(url)})` } : undefined;
}

function Author({ author }: { author: PublicCommunityPost["author"] }) {
  const label = author.displayName ?? author.username;
  return (
    <>
      <span
        aria-hidden="true"
        className={pageStyles.authorAvatar}
        data-has-media={author.avatarUrl ? true : undefined}
        style={avatarStyle(author.avatarUrl)}
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

function DeletionRequestForm({
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
        const cleanReason = reason.trim();
        if (!cleanReason || pending) return;
        void onSubmit({
          reason: cleanReason,
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

export function CommunityPost({
  canParticipate,
  csrfToken,
  currentUsername,
  post,
}: {
  canParticipate: boolean;
  csrfToken: string | null;
  currentUsername: string | null;
  post: PublicCommunityPost;
}) {
  const router = useRouter();
  const pendingRef = useRef(false);
  const errorId = useId();
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [initialComments, setInitialComments] =
    useState<PublicCommunityPostCommentsPage | null>(null);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentsError, setCommentsError] = useState<string | null>(null);
  const [mode, setMode] = useState<"delete" | "edit" | null>(null);
  const [title, setTitle] = useState(post.title);
  const [body, setBody] = useState(post.body);
  const [isSpoiler, setIsSpoiler] = useState(post.isSpoiler);
  const [spoilerLabel, setSpoilerLabel] = useState(post.spoilerLabel ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const isOwn = Boolean(
    canParticipate &&
    currentUsername &&
    post.author.username === currentUsername,
  );

  async function runPost(
    operation: () => Promise<void>,
    successMessage?: string,
  ) {
    if (!csrfToken || pendingRef.current) return;
    pendingRef.current = true;
    setPending(true);
    setError(null);
    setSuccess(null);
    try {
      await operation();
      setMode(null);
      setSuccess(successMessage ?? null);
      router.refresh();
    } catch (caught) {
      setError(
        communityContentErrorMessage(
          caught,
          "No pudimos actualizar la publicación.",
        ),
      );
    } finally {
      pendingRef.current = false;
      setPending(false);
    }
  }

  async function toggleComments() {
    if (commentsOpen) {
      setCommentsOpen(false);
      return;
    }
    setCommentsOpen(true);
    if (initialComments || commentsLoading) return;
    setCommentsLoading(true);
    setCommentsError(null);
    try {
      setInitialComments(await fetchCommunityPostComments(post.id, 1, 20));
    } catch (caught) {
      setCommentsError(
        communityContentErrorMessage(
          caught,
          "No pudimos cargar los comentarios.",
        ),
      );
    } finally {
      setCommentsLoading(false);
    }
  }

  return (
    <article className={pageStyles.post}>
      <header className={pageStyles.postHeader}>
        <Author author={post.author} />
        <time dateTime={post.createdAt}>{formatDate(post.createdAt)}</time>
      </header>
      {mode === "edit" ? (
        <form
          aria-describedby={error ? errorId : undefined}
          className={styles.inlineForm}
          onSubmit={(event) => {
            event.preventDefault();
            const nextTitle = title.trim();
            const nextBody = body.trim();
            const nextLabel = spoilerLabel.trim();
            if (
              !nextTitle ||
              !nextBody ||
              (isSpoiler && !nextLabel && !post.spoilerChapterId)
            )
              return;
            void runPost(() =>
              editCommunityPost(
                post.id,
                {
                  title: nextTitle,
                  body: nextBody,
                  isSpoiler,
                  ...(isSpoiler
                    ? {
                        spoilerChapterId: post.spoilerChapterId,
                        spoilerLabel: nextLabel || null,
                      }
                    : { spoilerChapterId: null, spoilerLabel: null }),
                },
                csrfToken ?? "",
              ),
            );
          }}
        >
          <label className={styles.field}>
            Título
            <input
              maxLength={200}
              onChange={(event) => setTitle(event.target.value)}
              required
              value={title}
            />
          </label>
          <label className={styles.field}>
            Contenido
            <textarea
              maxLength={20000}
              onChange={(event) => setBody(event.target.value)}
              required
              value={body}
            />
          </label>
          <label className={styles.check}>
            <input
              checked={isSpoiler}
              onChange={(event) => setIsSpoiler(event.target.checked)}
              type="checkbox"
            />{" "}
            Contiene spoilers
          </label>
          {isSpoiler ? (
            <label className={styles.field}>
              Etiqueta del spoiler
              <input
                maxLength={120}
                onChange={(event) => setSpoilerLabel(event.target.value)}
                placeholder={
                  post.spoilerChapterId ? "Capítulo vinculado" : undefined
                }
                required={!post.spoilerChapterId}
                value={spoilerLabel}
              />
            </label>
          ) : null}
          <div className={styles.formActions}>
            <Button
              disabled={pending}
              onClick={() => setMode(null)}
              size="sm"
              variant="ghost"
            >
              Cancelar
            </Button>
            <Button disabled={pending} size="sm" type="submit">
              {pending ? "Guardando…" : "Guardar cambios"}
            </Button>
          </div>
        </form>
      ) : (
        <>
          <div className={pageStyles.postTitle}>
            {post.isSpoiler ? (
              <Chip variant="warning">
                Spoiler{post.spoilerLabel ? `: ${post.spoilerLabel}` : ""}
              </Chip>
            ) : null}
            <h3>{post.title}</h3>
          </div>
          <p className={pageStyles.postBody}>{post.body}</p>
        </>
      )}
      {mode === "delete" ? (
        <DeletionRequestForm
          onCancel={() => setMode(null)}
          onSubmit={(input) =>
            runPost(
              () =>
                requestCommunityPostDeletion(post.id, input, csrfToken ?? ""),
              "Solicitud de eliminación enviada. La publicación seguirá visible mientras se revisa.",
            )
          }
          pending={pending}
        />
      ) : null}
      <footer className={styles.postFooter}>
        <Button
          aria-expanded={commentsOpen}
          onClick={() => void toggleComments()}
          size="sm"
          variant="ghost"
        >
          <MessageCircle aria-hidden="true" size={15} />{" "}
          {commentsOpen ? "Ocultar" : "Ver"} {post.commentCount}{" "}
          {post.commentCount === 1 ? "comentario" : "comentarios"}
        </Button>
        {isOwn && mode === null ? (
          <>
            <Button onClick={() => setMode("edit")} size="sm" variant="ghost">
              Editar
            </Button>
            <Button onClick={() => setMode("delete")} size="sm" variant="ghost">
              Solicitar eliminación
            </Button>
          </>
        ) : null}
      </footer>
      {error ? (
        <p className={styles.error} id={errorId} role="alert">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className={styles.success} role="status">
          {success}
        </p>
      ) : null}
      {commentsOpen && commentsLoading ? (
        <p className={styles.muted} role="status">
          Cargando comentarios…
        </p>
      ) : null}
      {commentsOpen && commentsError ? (
        <p className={styles.error} role="alert">
          {commentsError}
        </p>
      ) : null}
      {commentsOpen && initialComments ? (
        <CommunityComments
          canParticipate={canParticipate}
          csrfToken={csrfToken}
          currentUsername={currentUsername}
          initialPage={initialComments}
          post={post}
        />
      ) : null}
    </article>
  );
}
