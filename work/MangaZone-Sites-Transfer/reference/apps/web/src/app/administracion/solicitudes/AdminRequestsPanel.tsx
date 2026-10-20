"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import type {
  AdminCreationRequest,
  AdminCreationRequestList,
  AdminRequestKind,
  CreationRequestStatus,
} from "@/data/admin";
import {
  fetchCreationRequestDetail,
  reviewCreationRequest,
} from "@/data/admin.client";
import styles from "../AdminShell.module.css";

type Action = "approve" | "reject" | "request-info";

const dialogFocusableSelector = [
  "a[href]",
  "button",
  "input",
  "select",
  "textarea",
  "[tabindex]",
].join(",");

function isDialogFocusable(element: HTMLElement): boolean {
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

function listHref(
  kind: AdminRequestKind,
  status: CreationRequestStatus,
  page = 1,
): string {
  const query = new URLSearchParams({ type: kind, status });
  if (page > 1) query.set("page", String(page));
  return `/administracion/solicitudes?${query.toString()}`;
}

export function AdminRequestsPanel({
  kind,
  status,
  data,
  csrfToken,
}: {
  readonly kind: AdminRequestKind;
  readonly status: CreationRequestStatus;
  readonly data: AdminCreationRequestList;
  readonly csrfToken: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [command, setCommand] = useState<{
    action: Action;
    id: string;
    name: string;
  } | null>(null);
  const [message, setMessage] = useState("");
  const [internalNote, setInternalNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<AdminCreationRequest | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const messageRef = useRef<HTMLTextAreaElement>(null);
  const openerRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (command) {
      const initialControl =
        command.action === "approve" ? cancelRef.current : messageRef.current;
      initialControl?.focus();
    }
  }, [command]);

  function openCommand(
    event: React.MouseEvent<HTMLButtonElement>,
    next: { action: Action; id: string; name: string },
  ) {
    openerRef.current = event.currentTarget;
    setCommand(next);
  }

  function close(restoreFocus = true) {
    if (submitting) return;
    setCommand(null);
    setMessage("");
    setInternalNote("");
    setError(null);
    if (restoreFocus && openerRef.current?.isConnected) {
      openerRef.current.focus();
    }
    openerRef.current = null;
  }

  function handleDialogKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape" && !submitting) {
      event.preventDefault();
      close();
      return;
    }
    if (event.key !== "Tab") return;
    const controls = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>(
        dialogFocusableSelector,
      ),
    ).filter(isDialogFocusable);
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
  async function submit() {
    if (!command) return;
    if (command.action !== "approve" && !message.trim()) {
      setError("Escribe un mensaje o motivo.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const input =
        command.action === "reject"
          ? { reviewReason: message }
          : command.action === "request-info"
            ? {
                publicMessage: message,
                ...(internalNote.trim() ? { internalNote } : {}),
              }
            : {};
      await reviewCreationRequest(
        kind,
        command.id,
        command.action,
        csrfToken,
        input,
      );
      setSubmitting(false);
      close(false);
      startTransition(() => router.refresh());
    } catch {
      setSubmitting(false);
      close(false);
      setError(
        "No se pudo completar la revisión. Actualiza la cola e inténtalo nuevamente.",
      );
      startTransition(() => router.refresh());
    }
  }

  async function openDetail(id: string) {
    setError(null);
    try {
      setDetail((await fetchCreationRequestDetail(kind, id)).request);
    } catch {
      setError("No se pudo cargar el detalle de la solicitud.");
    }
  }

  return (
    <>
      <header className={styles.heading}>
        <span className={styles.eyebrow}>Flujos canónicos</span>
        <h1 className={styles.title}>Solicitudes</h1>
        <p className={styles.subtitle}>
          Aprobar, rechazar o pedir información usa los mismos contratos de
          moderación existentes.
        </p>
      </header>
      <nav className={styles.tabs} aria-label="Tipo de solicitud">
        <a
          className={kind === "community" ? styles.active : ""}
          href={listHref("community", status)}
        >
          Comunidades
        </a>
        <a
          className={kind === "scanlation-group" ? styles.active : ""}
          href={listHref("scanlation-group", status)}
        >
          Grupos
        </a>
      </nav>
      <section className={styles.panel}>
        <form className={styles.toolbar} method="get">
          <input type="hidden" name="type" value={kind} />
          <label htmlFor="request-status">Estado</label>
          <select id="request-status" name="status" defaultValue={status}>
            <option>PENDING</option>
            <option>NEEDS_INFO</option>
            <option>APPROVED</option>
            <option>REJECTED</option>
          </select>
          <button type="submit">Filtrar</button>
        </form>
        {data.items.length ? (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Propuesta</th>
                  <th>Solicitante</th>
                  <th>Estado</th>
                  <th>Fecha</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((request) => (
                  <tr key={request.id}>
                    <td>
                      <strong>{request.proposedName}</strong>
                      <br />
                      <small>{request.description ?? "Sin descripción"}</small>
                    </td>
                    <td>
                      {request.requester.displayName ??
                        request.requester.username ??
                        "Usuario eliminado"}
                    </td>
                    <td>
                      <span className={styles.badge}>{request.status}</span>
                    </td>
                    <td>
                      {new Date(request.createdAt).toLocaleDateString("es-PE")}
                    </td>
                    <td>
                      <div className={styles.actions}>
                        <button
                          type="button"
                          onClick={() => void openDetail(request.id)}
                        >
                          Ver
                        </button>
                        {request.status === "PENDING" ? (
                          <>
                            <button
                              type="button"
                              onClick={(event) =>
                                openCommand(event, {
                                  action: "approve",
                                  id: request.id,
                                  name: request.proposedName,
                                })
                              }
                            >
                              Aprobar
                            </button>
                            <button
                              type="button"
                              onClick={(event) =>
                                openCommand(event, {
                                  action: "request-info",
                                  id: request.id,
                                  name: request.proposedName,
                                })
                              }
                            >
                              Pedir información
                            </button>
                            <button
                              type="button"
                              onClick={(event) =>
                                openCommand(event, {
                                  action: "reject",
                                  id: request.id,
                                  name: request.proposedName,
                                })
                              }
                            >
                              Rechazar
                            </button>
                          </>
                        ) : (
                          <span>Solo lectura</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className={styles.empty}>No hay solicitudes en este estado.</p>
        )}
        <nav className={styles.pager} aria-label="Paginación">
          <span>
            Página {data.pagination.page} de{" "}
            {Math.max(1, data.pagination.pageCount)}
          </span>
          {data.pagination.page > 1 ? (
            <a href={listHref(kind, status, data.pagination.page - 1)}>
              Anterior
            </a>
          ) : null}
          {data.pagination.page < data.pagination.pageCount ? (
            <a href={listHref(kind, status, data.pagination.page + 1)}>
              Siguiente
            </a>
          ) : null}
        </nav>
      </section>
      {error && !command ? (
        <p role="alert" className={styles.feedback}>
          {error}
        </p>
      ) : null}
      {detail ? (
        <section
          className={`${styles.panel} ${styles.detail}`}
          aria-live="polite"
        >
          <h2>{detail.proposedName}</h2>
          <div className={styles.detailGrid}>
            <div>
              <small>Estado</small>
              {detail.status}
            </div>
            <div>
              <small>Solicitante</small>
              {detail.requester.displayName ??
                detail.requester.username ??
                "Usuario eliminado"}
            </div>
            <div>
              <small>Creada</small>
              {new Date(detail.createdAt).toLocaleString("es-PE")}
            </div>
          </div>
          <p>{detail.description ?? "Sin descripción"}</p>
        </section>
      ) : null}
      {command ? (
        <div
          className={styles.dialogBackdrop}
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) close();
          }}
        >
          <div
            className={styles.dialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-command-title"
            onKeyDown={handleDialogKeyDown}
          >
            <h2 id="admin-command-title">
              {command.action === "approve"
                ? "Aprobar"
                : command.action === "reject"
                  ? "Rechazar"
                  : "Pedir información"}
              : {command.name}
            </h2>
            {command.action !== "approve" ? (
              <>
                <label htmlFor="admin-command-message">
                  {command.action === "reject"
                    ? "Motivo interno"
                    : "Mensaje para el solicitante"}
                </label>
                <textarea
                  ref={messageRef}
                  id="admin-command-message"
                  value={message}
                  maxLength={2000}
                  onChange={(event) => setMessage(event.target.value)}
                />
                {command.action === "request-info" ? (
                  <>
                    <label htmlFor="admin-internal-note">
                      Nota interna opcional
                    </label>
                    <textarea
                      id="admin-internal-note"
                      value={internalNote}
                      maxLength={2000}
                      onChange={(event) => setInternalNote(event.target.value)}
                    />
                  </>
                ) : null}
              </>
            ) : (
              <p>
                Se creará la entidad y su propiedad fundadora según el
                contrato del servidor.
              </p>
            )}
            {error ? (
              <p role="alert" className={styles.feedback}>
                {error}
              </p>
            ) : null}
            <div className={styles.dialogActions}>
              <button
                ref={cancelRef}
                type="button"
                disabled={submitting || pending}
                onClick={() => close()}
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={submitting || pending}
                onClick={() => void submit()}
              >
                {submitting || pending ? "Procesando..." : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
