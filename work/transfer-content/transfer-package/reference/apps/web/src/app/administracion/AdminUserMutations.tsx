"use client";

import { useEffect, useRef, useState } from "react";
import {
  ADMIN_DIRECT_PERMISSIONS,
  ADMIN_GLOBAL_ROLES,
  type AdminUser,
  type AdminUserMutation,
} from "@/data/admin";
import {
  AdminClientError,
  fetchAdminUser,
  mutateAdminUser,
} from "@/data/admin.client";
import styles from "./AdminShell.module.css";

const focusableSelector = [
  "a[href]",
  "button",
  "input",
  "select",
  "textarea",
  "[tabindex]",
].join(",");

function isFocusable(element: HTMLElement): boolean {
  if (
    element.tabIndex < 0 ||
    element.hidden ||
    element.hasAttribute("disabled") ||
    element.matches(":disabled") ||
    element.getAttribute("aria-hidden") === "true" ||
    (element instanceof HTMLInputElement && element.type === "hidden")
  ) {
    return false;
  }

  let current: HTMLElement | null = element;
  while (current) {
    if (
      current.hidden ||
      current.hasAttribute("inert") ||
      current.getAttribute("aria-hidden") === "true"
    ) {
      return false;
    }
    const style = window.getComputedStyle(current);
    if (
      style.display === "none" ||
      style.visibility === "hidden" ||
      style.visibility === "collapse"
    ) {
      return false;
    }
    current = current.parentElement;
  }
  return true;
}

const errorMessages: Readonly<Record<string, string>> = {
  ADMIN_SELF_TARGET_FORBIDDEN: "No puedes modificar tu propia cuenta.",
  ADMIN_TARGET_INVALID_STATUS:
    "El estado actual de la cuenta ya no permite esta operación.",
  ADMIN_ROLE_ALREADY_ASSIGNED: "La cuenta ya tiene asignado ese rol global.",
  ADMIN_ROLE_NOT_ASSIGNED: "La cuenta ya no tiene asignado ese rol global.",
  ADMIN_PERMISSION_ALREADY_GRANTED:
    "La cuenta ya tiene concedido directamente ese permiso.",
  ADMIN_PERMISSION_NOT_GRANTED:
    "La cuenta ya no tiene una concesión directa de ese permiso.",
  ADMIN_DIRECT_PERMISSION_FOR_ADMIN_FORBIDDEN:
    "Las cuentas ADMIN no reciben nuevas concesiones directas.",
  LAST_ACTIVE_ADMIN_REQUIRED:
    "Debe permanecer al menos otra cuenta ADMIN activa.",
  ADMIN_MUTATION_CONFLICT:
    "Otro cambio administrativo entró en conflicto. Revisa el estado actual.",
  ADMIN_SUSPENSION_SANCTION_CONFLICT:
    "El estado actual de la suspensión cambió. Revisa la cuenta.",
};

function mutationLabel(mutation: AdminUserMutation): string {
  if (mutation.family === "account") {
    return mutation.command === "suspend"
      ? "Suspender cuenta"
      : "Restaurar cuenta";
  }
  const verb = mutation.command === "grant" ? "Conceder" : "Revocar";
  return `${verb} ${mutation.key}`;
}

function mutationDescription(mutation: AdminUserMutation): string {
  if (mutation.family === "role") {
    const lastAdmin =
      mutation.command === "revoke" && mutation.key === "ADMIN"
        ? " El servidor rechazará la operación si debe conservarse el último ADMIN activo."
        : "";
    return `${mutation.command === "grant" ? "Se concederá" : "Se revocará"} el rol global ${mutation.key}.${lastAdmin}`;
  }
  if (mutation.family === "permission") {
    return `${mutation.command === "grant" ? "Se concederá" : "Se revocará"} directamente el permiso ${mutation.key}.`;
  }
  if (mutation.command === "suspend") {
    return "La cuenta quedará suspendida y todas sus sesiones activas serán revocadas. Las sesiones antiguas dejarán de funcionar. Si es ADMIN, el servidor conservará al menos otro ADMIN activo.";
  }
  return "La cuenta volverá a estar activa. Las sesiones antiguas seguirán revocadas y la persona deberá iniciar sesión de nuevo.";
}

function friendlyError(error: unknown): string {
  if (error instanceof AdminClientError && error.code) {
    return (
      errorMessages[error.code] ??
      "No se pudo completar la operación administrativa."
    );
  }
  return "No se pudo completar la operación administrativa.";
}

export function AdminUserMutations({
  user,
  currentUsername,
  csrfToken,
  onRefreshed,
}: {
  readonly user: AdminUser;
  readonly currentUsername: string | null;
  readonly csrfToken: string;
  readonly onRefreshed: (user: AdminUser) => void;
}) {
  const [mutation, setMutation] = useState<AdminUserMutation | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const reasonRef = useRef<HTMLTextAreaElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLButtonElement | null>(null);
  const regionRef = useRef<HTMLElement>(null);
  const selfTarget = user.username === currentUsername;
  const deleted = user.status === "DELETED";
  const canGrant = user.status === "ACTIVE";
  const canRevoke = !deleted;

  useEffect(() => {
    if (mutation) reasonRef.current?.focus();
  }, [mutation]);

  useEffect(() => {
    if (!submitting) return;
    const frame = requestAnimationFrame(() => {
      if (!dialogRef.current?.contains(document.activeElement)) {
        reasonRef.current?.focus();
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [submitting]);

  function open(
    event: React.MouseEvent<HTMLButtonElement>,
    next: AdminUserMutation,
  ) {
    openerRef.current = event.currentTarget;
    setReason("");
    setError(null);
    setSuccess(null);
    setMutation(next);
  }

  function close(restoreFocus = true, force = false) {
    if (submitting && !force) return;
    const opener = openerRef.current;
    setMutation(null);
    setReason("");
    setError(null);
    openerRef.current = null;
    if (restoreFocus) {
      requestAnimationFrame(() => {
        if (opener?.isConnected) opener.focus();
        else regionRef.current?.focus();
      });
    }
  }

  function handleDialogKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape" && !submitting) {
      event.preventDefault();
      close();
      return;
    }
    if (event.key !== "Tab") return;
    const controls = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>(focusableSelector),
    ).filter(isFocusable);
    const first = controls[0];
    const last = controls.at(-1);
    if (!first || !last) return;
    if (first === last) {
      event.preventDefault();
      first.focus();
    } else if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  async function refreshCurrentUser() {
    if (!user.username) return;
    const refreshed = await fetchAdminUser(user.username);
    onRefreshed(refreshed.user);
  }

  async function submit() {
    if (!mutation || submitting || !user.username) return;
    const normalizedReason = reason.trim();
    if (!normalizedReason || normalizedReason.length > 2000) {
      setError(
        "El motivo es obligatorio y debe tener entre 1 y 2000 caracteres.",
      );
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      const result = await mutateAdminUser(
        user.username,
        mutation,
        normalizedReason,
        csrfToken,
      );
      onRefreshed(result.user);
      try {
        await refreshCurrentUser();
      } catch {
        // The committed mutation response is already the canonical safe DTO.
      }
      setSubmitting(false);
      const completedLabel = mutationLabel(mutation);
      close(true, true);
      setSuccess(`${completedLabel}: cambio confirmado.`);
    } catch (caught) {
      setError(friendlyError(caught));
      if (caught instanceof AdminClientError && caught.status === 409) {
        try {
          await refreshCurrentUser();
        } catch {
          // Preserve the original safe error and the entered reason.
        }
      }
      setSubmitting(false);
    }
  }

  const actionsUnavailable = selfTarget || !user.username;

  return (
    <section
      ref={regionRef}
      className={styles.userMutations}
      tabIndex={-1}
      aria-label="Administrar cuenta seleccionada"
    >
      {selfTarget ? (
        <p className={styles.mutationNotice}>
          No puedes aplicar mutaciones administrativas sobre tu propia cuenta.
        </p>
      ) : null}
      {deleted ? (
        <p className={styles.mutationNotice}>
          Esta cuenta eliminada es de solo lectura.
        </p>
      ) : null}
      <div className={styles.mutationSections}>
        <section>
          <h3>Roles globales</h3>
          <div className={styles.badgeList}>
            {user.roles.length ? (
              user.roles.map((role) => (
                <span className={styles.badge} key={role}>
                  {role}
                </span>
              ))
            ) : (
              <span>Sin roles asignados</span>
            )}
          </div>
          <div className={styles.mutationActions}>
            {ADMIN_GLOBAL_ROLES.map((role) => {
              const assigned = user.roles.includes(role);
              const available = assigned ? canRevoke : canGrant;
              return available && !actionsUnavailable ? (
                <button
                  key={role}
                  type="button"
                  onClick={(event) =>
                    open(event, {
                      family: "role",
                      command: assigned ? "revoke" : "grant",
                      key: role,
                    })
                  }
                >
                  {assigned ? "Revocar" : "Conceder"} {role}
                </button>
              ) : null;
            })}
          </div>
        </section>
        <section>
          <h3>Permisos directos</h3>
          <div className={styles.badgeList}>
            {user.directPermissionGrants.length ? (
              user.directPermissionGrants.map((permission) => (
                <span className={styles.badge} key={permission}>
                  {permission}
                </span>
              ))
            ) : (
              <span>Ninguna concesión directa</span>
            )}
          </div>
          <div className={styles.mutationActions}>
            {ADMIN_DIRECT_PERMISSIONS.map((permission) => {
              const assigned = user.directPermissionGrants.includes(permission);
              const available = assigned
                ? canRevoke
                : canGrant && !user.roles.includes("ADMIN");
              return available && !actionsUnavailable ? (
                <button
                  key={permission}
                  type="button"
                  onClick={(event) =>
                    open(event, {
                      family: "permission",
                      command: assigned ? "revoke" : "grant",
                      key: permission,
                    })
                  }
                >
                  {assigned ? "Revocar" : "Conceder"} {permission}
                </button>
              ) : null;
            })}
          </div>
          {user.roles.includes("ADMIN") && canGrant ? (
            <p className={styles.mutationHint}>
              Una cuenta ADMIN no necesita nuevas concesiones directas; las
              concesiones heredadas siguen siendo revocables.
            </p>
          ) : null}
        </section>
        <section className={styles.sensitiveActions}>
          <h3>Acciones de cuenta</h3>
          {!actionsUnavailable && user.status === "ACTIVE" ? (
            <button
              type="button"
              onClick={(event) =>
                open(event, { family: "account", command: "suspend" })
              }
            >
              Suspender cuenta
            </button>
          ) : null}
          {!actionsUnavailable && user.status === "SUSPENDED" ? (
            <button
              type="button"
              onClick={(event) =>
                open(event, { family: "account", command: "restore" })
              }
            >
              Restaurar cuenta
            </button>
          ) : null}
          {!selfTarget &&
          !["ACTIVE", "SUSPENDED"].includes(user.status) ? (
            <p>El estado actual no admite suspensión ni restauración.</p>
          ) : null}
        </section>
      </div>
      {success ? (
        <p role="status" className={styles.mutationSuccess}>
          {success}
        </p>
      ) : null}
      {mutation ? (
        <div
          className={styles.dialogBackdrop}
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !submitting) close();
          }}
        >
          <div
            ref={dialogRef}
            className={styles.dialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-user-mutation-title"
            aria-describedby="admin-user-mutation-description"
            onKeyDown={handleDialogKeyDown}
          >
            <h2 id="admin-user-mutation-title">{mutationLabel(mutation)}</h2>
            <p id="admin-user-mutation-description">
              Usuario: <strong>@{user.username}</strong>.{" "}
              {mutationDescription(mutation)}
            </p>
            <label htmlFor="admin-user-mutation-reason">Motivo requerido</label>
            <textarea
              ref={reasonRef}
              id="admin-user-mutation-reason"
              value={reason}
              maxLength={2000}
              required
              readOnly={submitting}
              aria-invalid={Boolean(error)}
              aria-describedby={
                error
                  ? "admin-user-mutation-error admin-user-mutation-count"
                  : "admin-user-mutation-count"
              }
              onChange={(event) => setReason(event.target.value)}
            />
            <small id="admin-user-mutation-count">
              {reason.length}/2000 caracteres
            </small>
            {error ? (
              <p
                id="admin-user-mutation-error"
                role="alert"
                className={styles.feedback}
              >
                {error}
              </p>
            ) : null}
            <div className={styles.dialogActions}>
              <button
                type="button"
                aria-disabled={submitting}
                onClick={() => {
                  if (!submitting) close();
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={submitting}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => void submit()}
              >
                {submitting ? "Procesando..." : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
