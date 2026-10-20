"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/Button";
import type {
  CommunityMembershipRole,
  SelfCommunityMembership,
} from "@/data/community-memberships";
import {
  CommunityMembershipMutationError,
  joinCommunity,
  leaveCommunity,
} from "@/data/community-memberships.client";

import styles from "./CommunityMembershipAction.module.css";

type LocalBlock = "account" | "removed" | "suspended" | null;

const roleLabels: Readonly<Record<CommunityMembershipRole, string>> = {
  OWNER: "Propietario",
  ADMIN: "Administrador",
  MODERATOR: "Moderador",
  MEMBER: "Miembro",
};

function mutationErrorMessage(
  error: unknown,
): { block: LocalBlock; message: string; ownerLocked: boolean } {
  if (!(error instanceof CommunityMembershipMutationError)) {
    return {
      block: null,
      message: "No pudimos actualizar tu membresía. Inténtalo de nuevo.",
      ownerLocked: false,
    };
  }

  switch (error.code) {
    case "ACCOUNT_NOT_ELIGIBLE":
      return {
        block: "account",
        message: "Tu cuenta todavía no es elegible para esta acción. Completa la verificación requerida.",
        ownerLocked: false,
      };
    case "COMMUNITY_MEMBERSHIP_SUSPENDED":
      return {
        block: "suspended",
        message: "Tu membresía en esta comunidad está suspendida.",
        ownerLocked: false,
      };
    case "COMMUNITY_MEMBERSHIP_REMOVED":
      return {
        block: "removed",
        message: "La reincorporación a esta comunidad no está disponible.",
        ownerLocked: false,
      };
    case "COMMUNITY_OWNER_CANNOT_LEAVE":
      return {
        block: null,
        message: "El propietario no puede salir de la comunidad mediante esta acción.",
        ownerLocked: true,
      };
    case "COMMUNITY_MEMBERSHIP_INVARIANT_VIOLATION":
      return {
        block: null,
        message: "El estado de tu membresía es inconsistente. Actualiza la página antes de reintentar.",
        ownerLocked: false,
      };
    case "COMMUNITY_MEMBERSHIP_CONFLICT":
      return {
        block: null,
        message: "Tu membresía cambió al mismo tiempo. Actualiza la página y vuelve a intentarlo.",
        ownerLocked: false,
      };
    case "CSRF_VALIDATION_FAILED":
      return {
        block: null,
        message: "No pudimos validar la solicitud. Actualiza la página antes de reintentar.",
        ownerLocked: false,
      };
    default:
      return {
        block: null,
        message:
          error.status === 404
            ? "La comunidad ya no está disponible."
            : "No pudimos actualizar tu membresía. Inténtalo de nuevo.",
        ownerLocked: false,
      };
  }
}

export function CommunityMembershipAction({
  csrfToken,
  initialMembership,
  membershipUnavailable,
  slug,
}: {
  readonly csrfToken: string | null;
  readonly initialMembership: SelfCommunityMembership | null;
  readonly membershipUnavailable: boolean;
  readonly slug: string;
}) {
  const router = useRouter();
  const pendingRef = useRef(false);
  const [membership, setMembership] = useState(initialMembership);
  const [isPending, setIsPending] = useState(false);
  const [block, setBlock] = useState<LocalBlock>(null);
  const [ownerLocked, setOwnerLocked] = useState(
    initialMembership?.role === "OWNER",
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const isOwner = ownerLocked || membership?.role === "OWNER";
  const isBlocked = block !== null;
  const membershipLabel = membership
    ? isOwner
      ? "Propietario"
      : roleLabels[membership.role]
    : null;

  async function join() {
    if (!csrfToken) {
      router.push("/login");
      return;
    }
    if (pendingRef.current || isBlocked || membership) return;

    pendingRef.current = true;
    setIsPending(true);
    setErrorMessage(null);
    setStatusMessage(null);
    try {
      const joinedMembership = await joinCommunity(slug, csrfToken);
      setMembership(joinedMembership);
      setOwnerLocked(joinedMembership.role === "OWNER");
      setStatusMessage("Te uniste a la comunidad.");
      router.refresh();
    } catch (error) {
      if (
        error instanceof CommunityMembershipMutationError &&
        (error.code === "AUTHENTICATION_REQUIRED" || error.status === 401)
      ) {
        router.push("/login");
        return;
      }
      const presentation = mutationErrorMessage(error);
      setBlock(presentation.block);
      setOwnerLocked((current) => current || presentation.ownerLocked);
      setErrorMessage(presentation.message);
    } finally {
      pendingRef.current = false;
      setIsPending(false);
    }
  }

  async function leave() {
    if (!csrfToken) {
      router.push("/login");
      return;
    }
    if (pendingRef.current || isBlocked || !membership || isOwner) return;

    pendingRef.current = true;
    setIsPending(true);
    setErrorMessage(null);
    setStatusMessage(null);
    try {
      await leaveCommunity(slug, csrfToken);
      setMembership(null);
      setStatusMessage("Saliste de la comunidad.");
      router.refresh();
    } catch (error) {
      if (
        error instanceof CommunityMembershipMutationError &&
        (error.code === "AUTHENTICATION_REQUIRED" || error.status === 401)
      ) {
        router.push("/login");
        return;
      }
      const presentation = mutationErrorMessage(error);
      setBlock(presentation.block);
      setOwnerLocked((current) => current || presentation.ownerLocked);
      setErrorMessage(presentation.message);
    } finally {
      pendingRef.current = false;
      setIsPending(false);
    }
  }

  if (membershipUnavailable) {
    return (
      <div className={styles.action}>
        <p className={styles.error} role="alert">
          No pudimos cargar el estado de tu membresía.
        </p>
        <Button onClick={() => router.refresh()} variant="secondary">
          Reintentar
        </Button>
      </div>
    );
  }

  return (
    <div className={styles.action}>
      {membership ? (
        <span
          aria-label={membershipLabel ?? undefined}
          aria-live="polite"
          className={styles.role}
          role="status"
        >
          {membershipLabel}
        </span>
      ) : null}

      {isOwner ? null : membership ? (
        <Button
          aria-busy={isPending}
          disabled={isPending || isBlocked}
          onClick={() => void leave()}
          variant="secondary"
        >
          {isPending ? "Saliendo…" : "Salir de la comunidad"}
        </Button>
      ) : (
        <Button
          aria-busy={isPending}
          disabled={isPending || isBlocked}
          onClick={() => void join()}
        >
          {isPending ? "Uniéndose…" : "Unirse"}
        </Button>
      )}

      {statusMessage ? (
        <p aria-live="polite" className={styles.feedback} role="status">
          {statusMessage}
        </p>
      ) : null}
      {errorMessage ? (
        <p className={styles.error} role="alert">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
