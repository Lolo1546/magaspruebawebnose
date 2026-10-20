"use client";

import { ChevronLeft, ChevronRight, Eye, RotateCcw, ShieldCheck, X } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";

import {
  restoreCommunityComment,
  restoreCommunityPost,
} from "@/data/community-content.client";
import {
  fetchCommunityModerationDetail,
} from "@/data/community-moderation.client";
import type {
  CommunityModerationContent,
  CommunityModerationDetail,
  CommunityModerationFilters,
  CommunityModerationList,
} from "@/data/community-moderation";

import styles from "./CommunityModerationPanel.module.css";

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

function authorName(item: CommunityModerationContent): string {
  return item.author.displayName ?? item.author.username ?? "Usuario eliminado";
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("es-PE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function filterHref(
  filters: CommunityModerationFilters,
  update: Partial<CommunityModerationFilters>,
): string {
  const next = { ...filters, ...update };
  const params = new URLSearchParams();
  if (next.type) params.set("type", next.type);
  if (next.community) params.set("community", next.community);
  if (next.page > 1) params.set("page", String(next.page));
  const query = params.toString();
  return `/moderacion/comunidades${query ? `?${query}` : ""}`;
}

export function CommunityModerationPanel({
  csrfToken,
  filters,
  initialData,
}: {
  csrfToken: string;
  filters: CommunityModerationFilters;
  initialData: CommunityModerationList;
}) {
  const router = useRouter();
  const [isNavigating, startNavigation] = useTransition();
  const [selected, setSelected] = useState<CommunityModerationDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const reasonRef = useRef<HTMLTextAreaElement>(null);
  const restoreInvokerRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (confirming) reasonRef.current?.focus();
  }, [confirming, pending]);

  function navigate(update: Partial<CommunityModerationFilters>) {
    setSelected(null);
    startNavigation(() => router.push(filterHref(filters, update)));
  }

  async function selectItem(item: CommunityModerationContent) {
    setDetailLoading(true);
    setDetailError(null);
    try {
      setSelected(await fetchCommunityModerationDetail(item.type, item.id));
    } catch {
      setSelected(null);
      setDetailError("No pudimos cargar el detalle. Inténtalo nuevamente.");
    } finally {
      setDetailLoading(false);
    }
  }

  function closeDetail() {
    setSelected(null);
    setDetailError(null);
    setConfirming(false);
  }

  function openConfirmation(event: ReactMouseEvent<HTMLButtonElement>) {
    restoreInvokerRef.current = event.currentTarget;
    setReason("");
    setReasonError(null);
    setMutationError(null);
    setConfirming(true);
  }

  function closeConfirmation(restoreFocus: boolean) {
    setConfirming(false);
    if (restoreFocus && restoreInvokerRef.current?.isConnected) {
      restoreInvokerRef.current.focus();
    }
    restoreInvokerRef.current = null;
  }

  function handleDialogKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape" && !pending) {
      event.preventDefault();
      closeConfirmation(true);
      return;
    }
    if (event.key !== "Tab") return;

    const focusable = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>(dialogFocusableSelector),
    ).filter(isDialogFocusable);
    const first = focusable[0];
    const last = focusable.at(-1);
    if (!first || !last) return;

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  async function restore() {
    if (!selected || pending) return;
    const trimmed = reason.trim();
    if (trimmed.length < 1 || trimmed.length > 2000) {
      setReasonError("Escribe un motivo de 1 a 2000 caracteres.");
      return;
    }
    setPending(true);
    setReasonError(null);
    setMutationError(null);
    try {
      if (selected.item.type === "POST") {
        await restoreCommunityPost(selected.item.id, trimmed, csrfToken);
      } else {
        await restoreCommunityComment(selected.item.id, trimmed, csrfToken);
      }
      closeConfirmation(false);
      setSelected(null);
      router.refresh();
    } catch {
      closeConfirmation(false);
      setSelected(null);
      setMutationError(
        "El contenido cambió o no pudo restaurarse. Actualizamos la lista para que puedas revisarla.",
      );
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  const noAuthority = initialData.communities.length === 0;
  return (
    <main className={styles.page}>
      <header className={styles.hero}>
        <div>
          <p className={styles.eyebrow}><ShieldCheck size={16} /> Moderación de contenido</p>
          <h1>Contenido oculto</h1>
          <p>Inspecciona y restaura publicaciones o comentarios dentro de tus comunidades.</p>
        </div>
        <div className={styles.countCard}>
          <Eye aria-hidden="true" />
          <span><strong>{initialData.pagination.total}</strong> ocultos</span>
        </div>
      </header>

      <section aria-label="Filtros de contenido oculto" className={styles.filters}>
        <label>
          Tipo
          <select
            disabled={isNavigating}
            onChange={(event) => navigate({
              type: event.target.value === "POST" || event.target.value === "COMMENT"
                ? event.target.value
                : undefined,
              page: 1,
            })}
            value={filters.type ?? ""}
          >
            <option value="">Todo</option>
            <option value="POST">Publicaciones</option>
            <option value="COMMENT">Comentarios</option>
          </select>
        </label>
        <label>
          Comunidad
          <select
            disabled={isNavigating || noAuthority}
            onChange={(event) => navigate({ community: event.target.value || undefined, page: 1 })}
            value={filters.community ?? ""}
          >
            <option value="">Todas mis comunidades</option>
            {initialData.communities.map((community) => (
              <option key={community.slug} value={community.slug}>{community.name}</option>
            ))}
          </select>
        </label>
      </section>

      {mutationError && <p className={styles.bannerError} role="alert">{mutationError}</p>}

      <div className={styles.workspace}>
        <section aria-busy={isNavigating} aria-label="Contenido oculto" className={styles.list}>
          {noAuthority ? (
            <div className={styles.state}>
              <h2>Sin comunidades para moderar</h2>
              <p>No tienes actualmente autoridad de moderación en ninguna comunidad.</p>
            </div>
          ) : initialData.items.length === 0 ? (
            <div className={styles.state}>
              <h2>No hay contenido oculto</h2>
              <p>No encontramos resultados para los filtros seleccionados.</p>
            </div>
          ) : (
            initialData.items.map((item) => (
              <button
                className={styles.row}
                key={`${item.type}:${item.id}`}
                onClick={() => void selectItem(item)}
                type="button"
              >
                <span className={styles.rowTop}>
                  <span className={styles.badge}>{item.type === "POST" ? "Publicación" : "Comentario"}</span>
                  <span>{formatDate(item.updatedAt)}</span>
                </span>
                <strong>{item.title ?? item.context?.postTitle ?? "Comentario"}</strong>
                <span className={styles.preview}>{item.body}</span>
                <span className={styles.meta}>{authorName(item)} · {item.community.name}</span>
              </button>
            ))
          )}

          {initialData.pagination.pageCount > 1 && (
            <nav aria-label="Paginación de contenido oculto" className={styles.pagination}>
              <button
                disabled={isNavigating || filters.page <= 1}
                onClick={() => navigate({ page: filters.page - 1 })}
                type="button"
              ><ChevronLeft /> Anterior</button>
              <span>Página {filters.page} de {initialData.pagination.pageCount}</span>
              <button
                disabled={isNavigating || filters.page >= initialData.pagination.pageCount}
                onClick={() => navigate({ page: filters.page + 1 })}
                type="button"
              >Siguiente <ChevronRight /></button>
            </nav>
          )}
        </section>

        <aside aria-label="Detalle de moderación" className={[styles.detail, selected && styles.detailOpen].filter(Boolean).join(" ")}>
          <button aria-label="Cerrar detalle" className={styles.closeButton} onClick={closeDetail} type="button"><X /></button>
          {detailLoading ? (
            <div aria-busy="true" className={styles.state} role="status"><span className={styles.spinner} /> Cargando detalle</div>
          ) : detailError ? (
            <p className={styles.bannerError} role="alert">{detailError}</p>
          ) : selected ? (
            <>
              <div className={styles.detailHeading}>
                <span className={styles.badge}>{selected.item.type === "POST" ? "Publicación" : "Comentario"}</span>
                <h2>{selected.item.title ?? "Comentario oculto"}</h2>
                <p>{authorName(selected.item)} · {selected.item.community.name}</p>
              </div>
              {selected.item.context && (
                <div className={styles.context}><span>Publicación de contexto</span><strong>{selected.item.context.postTitle}</strong></div>
              )}
              <div className={styles.content}><h3>Contenido completo</h3><p>{selected.item.body}</p></div>
              <div className={styles.history}>
                <h3>Historial de moderación</h3>
                {selected.history.length === 0 ? <p>Sin acciones registradas.</p> : (
                  <ol>{selected.history.map((action, index) => (
                    <li key={`${action.createdAt}:${index}`}>
                      <strong>{action.action === "RESTORE_CONTENT" ? "Restaurado" : "Ocultado"}</strong>
                      <span>{action.actor?.displayName ?? action.actor?.username ?? "Moderador eliminado"} · {formatDate(action.createdAt)}</span>
                      <p>{action.reason}</p>
                    </li>
                  ))}</ol>
                )}
              </div>
              <button className={styles.primaryButton} onClick={openConfirmation} type="button"><RotateCcw /> Restaurar contenido</button>
            </>
          ) : (
            <div className={styles.state}><Eye /><h2>Selecciona un elemento</h2><p>Verás aquí su contenido y el historial de moderación.</p></div>
          )}
        </aside>
      </div>

      {confirming && selected && (
        <div className={styles.dialogBackdrop}>
          <div
            aria-labelledby="restore-title"
            aria-modal="true"
            className={styles.dialog}
            onKeyDown={handleDialogKeyDown}
            role="dialog"
          >
            <h2 id="restore-title">Restaurar {selected.item.type === "POST" ? "publicación" : "comentario"}</h2>
            <p><strong>{authorName(selected.item)}</strong> · {selected.item.community.name}</p>
            <p>El contenido volverá a ser visible públicamente.</p>
            <label htmlFor="restore-reason">Motivo de la restauración</label>
            <textarea
              aria-describedby="restore-help"
              id="restore-reason"
              maxLength={2000}
              onChange={(event) => setReason(event.target.value)}
              ref={reasonRef}
              rows={5}
              value={reason}
            />
            <span id="restore-help">Obligatorio, máximo 2000 caracteres.</span>
            {reasonError && <p className={styles.fieldError} role="alert">{reasonError}</p>}
            <div className={styles.dialogActions}>
              <button disabled={pending} onClick={() => closeConfirmation(true)} type="button">Cancelar</button>
              <button className={styles.primaryButton} disabled={pending} onClick={() => void restore()} type="button">
                {pending ? "Restaurando…" : "Restaurar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
