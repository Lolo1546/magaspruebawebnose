"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useRef, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/Button";
import { createCommunityPost } from "@/data/community-content.client";
import type { SelfCommunityMembership } from "@/data/community-memberships";

import { communityContentErrorMessage } from "./community-content-ui";
import styles from "./CommunityContent.module.css";

export function CommunityPostComposer({
  csrfToken,
  membership,
  membershipUnavailable,
  slug,
}: {
  readonly csrfToken: string | null;
  readonly membership: SelfCommunityMembership | null;
  readonly membershipUnavailable: boolean;
  readonly slug: string;
}) {
  const router = useRouter();
  const errorId = useId();
  const pendingRef = useRef(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [isSpoiler, setIsSpoiler] = useState(false);
  const [spoilerLabel, setSpoilerLabel] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canParticipate = Boolean(
    csrfToken && membership?.status === "ACTIVE" && membership.leftAt === null,
  );

  if (membershipUnavailable) {
    return (
      <p className={styles.participationNote}>
        No pudimos comprobar si puedes publicar. Actualiza la página para
        reintentarlo.
      </p>
    );
  }
  if (!csrfToken) {
    return (
      <p className={styles.participationNote}>
        <Link href="/login">Inicia sesión</Link> para participar en la
        conversación.
      </p>
    );
  }
  if (!canParticipate) {
    return (
      <p className={styles.participationNote}>
        Únete a la comunidad para publicar y comentar.
      </p>
    );
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextTitle = title.trim();
    const nextBody = body.trim();
    const nextLabel = spoilerLabel.trim();
    if (
      !nextTitle ||
      !nextBody ||
      (isSpoiler && !nextLabel) ||
      !csrfToken ||
      pendingRef.current
    )
      return;

    pendingRef.current = true;
    setIsPending(true);
    setError(null);
    try {
      await createCommunityPost(
        slug,
        {
          body: nextBody,
          isSpoiler,
          ...(isSpoiler ? { spoilerLabel: nextLabel } : {}),
          title: nextTitle,
        },
        csrfToken,
      );
      setTitle("");
      setBody("");
      setIsSpoiler(false);
      setSpoilerLabel("");
      router.refresh();
    } catch (caught) {
      setError(
        communityContentErrorMessage(
          caught,
          "No pudimos publicar. Inténtalo de nuevo.",
        ),
      );
    } finally {
      pendingRef.current = false;
      setIsPending(false);
    }
  }

  return (
    <form
      aria-describedby={error ? errorId : undefined}
      className={styles.composer}
      onSubmit={submit}
    >
      <div className={styles.composerHeading}>
        <div>
          <p>Nueva conversación</p>
          <h3>Crear publicación</h3>
        </div>
        <span>{body.length} / 20000</span>
      </div>
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
            placeholder="Ej. Capítulo 24"
            required
            value={spoilerLabel}
          />
        </label>
      ) : null}
      {error ? (
        <p className={styles.error} id={errorId} role="alert">
          {error}
        </p>
      ) : null}
      <div className={styles.formActions}>
        <Button
          disabled={
            isPending ||
            !title.trim() ||
            !body.trim() ||
            (isSpoiler && !spoilerLabel.trim())
          }
          type="submit"
        >
          {isPending ? "Publicando…" : "Publicar"}
        </Button>
      </div>
    </form>
  );
}
