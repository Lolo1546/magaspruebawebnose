"use client";

import { useEffect, useId, useRef } from "react";
import { Send } from "lucide-react";
import { editorialTextLength } from "@/data/editorial";
import styles from "./MangaComments.module.css";

export function MangaCommentComposer({ body, spoiler, pending, label = "Tu comentario", submitLabel = "Publicar comentario", onBody, onSpoiler, onSubmit, onCancel }: {
  body: string; spoiler: boolean; pending: boolean; label?: string; submitLabel?: string;
  onBody: (body: string) => void; onSpoiler: (spoiler: boolean) => void; onSubmit: () => void; onCancel?: () => void;
}) {
  const id = useId();
  const textarea = useRef<HTMLTextAreaElement>(null);
  const focusOnMount = !!onCancel;
  useEffect(() => { if (focusOnMount) textarea.current?.focus(); }, [focusOnMount]);
  const length = editorialTextLength(body.trim());
  const invalid = length > 5000;
  return <form className={styles.composer} aria-busy={pending} onSubmit={(event) => { event.preventDefault(); if (!pending && length > 0 && !invalid) onSubmit(); }} onKeyDown={(event) => { if (event.key === "Escape" && !pending && onCancel) { event.preventDefault(); onCancel(); } }}>
    <label htmlFor={id}>{label}</label>
    <textarea ref={textarea} id={id} value={body} onChange={(event) => onBody(event.target.value)} disabled={pending} rows={3} aria-describedby={`${id}-length`} aria-invalid={invalid} />
    <div className={styles.composerFooter}>
      <label className={styles.spoilerLabel}><input type="checkbox" checked={spoiler} onChange={(event) => onSpoiler(event.target.checked)} disabled={pending} /> Contiene spoilers</label>
      <span id={`${id}-length`} className={invalid ? styles.invalid : undefined}>{length.toLocaleString("es")} / 5.000</span>
    </div>
    <div className={styles.actions}>
      {onCancel ? <button type="button" disabled={pending} onClick={onCancel}>Cancelar</button> : null}
      <button type="submit" disabled={pending || !length || invalid}><Send size={15} aria-hidden="true" />{pending ? "Enviando…" : submitLabel}</button>
    </div>
  </form>;
}
