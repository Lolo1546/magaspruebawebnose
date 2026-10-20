"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { RefObject } from "react";
import { InlineAlert } from "@/components/feedback/InlineAlert";
import { editorialTextLength } from "@/data/editorial";
import type { MangaComment } from "@/data/manga-comments";
import styles from "./MangaComments.module.css";

export type CommentDialogAction = { comment: MangaComment; command: "remove" | "hide" | "unhide"; invoker: HTMLElement };

function available(element: HTMLElement): boolean {
  if (!element.isConnected || element.tabIndex < 0 || element.matches(":disabled")) return false;
  for (let node: HTMLElement | null = element; node; node = node.parentElement) {
    const style = getComputedStyle(node);
    if (node.hidden || node.hasAttribute("inert") || node.getAttribute("aria-hidden") === "true" || style.display === "none" || ["hidden", "collapse"].includes(style.visibility)) return false;
  }
  return true;
}

export function MangaCommentDialogs({ action, pending, error, fallback, onClose, onConfirm }: {
  action: CommentDialogAction; pending: boolean; error: string; fallback: RefObject<HTMLHeadingElement | null>;
  onClose: () => void; onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");
  const dialog = useRef<HTMLDivElement>(null);
  const initial = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const reasonId = useId();
  const closeRef = useRef(onClose);
  const pendingRef = useRef(pending);
  useEffect(() => { closeRef.current = onClose; pendingRef.current = pending; }, [onClose, pending]);
  useEffect(() => {
    const panel = dialog.current;
    const fallbackElement = fallback.current;
    initial.current?.focus();
    const controls = () => [...(panel?.querySelectorAll<HTMLElement>("button,textarea,input,select,a[href],[tabindex]") ?? [])].filter(available);
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); if (!pendingRef.current) closeRef.current(); return; }
      if (event.key !== "Tab") return;
      const items = controls();
      const first = items[0]; const last = items.at(-1);
      if (!first) { event.preventDefault(); panel?.focus(); return; }
      if (items.length === 1 || !panel?.contains(document.activeElement) || (event.shiftKey ? document.activeElement === first : document.activeElement === last)) {
        event.preventDefault(); (event.shiftKey ? last : first)?.focus();
      }
    };
    const focusin = (event: FocusEvent) => { if (event.target instanceof Node && !panel?.contains(event.target)) (controls()[0] ?? panel)?.focus(); };
    document.addEventListener("keydown", keydown);
    document.addEventListener("focusin", focusin);
    return () => {
      document.removeEventListener("keydown", keydown);
      document.removeEventListener("focusin", focusin);
      if (available(action.invoker)) action.invoker.focus(); else if (fallbackElement?.isConnected) fallbackElement.focus();
    };
  }, [action.invoker, fallback]);
  const isModeration = action.command !== "remove";
  const length = editorialTextLength(reason.trim());
  const title = action.command === "remove" ? "Eliminar comentario" : action.command === "hide" ? "Ocultar comentario" : "Restaurar comentario";
  return <div className={styles.overlay}>
    <div ref={dialog} role="dialog" aria-modal="true" aria-labelledby={titleId} aria-busy={pending} tabIndex={-1} className={styles.dialog}>
      <h3 id={titleId}>{title}</h3>
      <p>{isModeration ? "La razón se guardará en la auditoría privada, no en la discusión pública." : "Esta acción es definitiva. Las respuestas se conservarán sin mostrar el texto eliminado."}</p>
      <form onSubmit={(event) => { event.preventDefault(); if (!pending && (!isModeration || (length > 0 && length <= 2000))) onConfirm(reason.trim()); }}>
        {isModeration ? <><label htmlFor={reasonId}>Razón de moderación</label><textarea id={reasonId} value={reason} onChange={(event) => setReason(event.target.value)} disabled={pending} rows={3} aria-describedby={`${reasonId}-length`} /><span id={`${reasonId}-length`}>{length} / 2.000</span></> : null}
        {error ? <InlineAlert tone="error">{error}</InlineAlert> : null}
        <div className={styles.actions}><button ref={initial} type="button" disabled={pending} onClick={onClose}>Cancelar</button><button type="submit" disabled={pending || (isModeration && (!length || length > 2000))}>{pending ? "Guardando…" : title}</button></div>
      </form>
    </div>
  </div>;
}
