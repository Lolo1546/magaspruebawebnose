"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type CSSProperties, type KeyboardEvent, type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import MangaCoverImage from "@/components/manga/MangaCoverImage";
import {
  coverFileError,
  coverUploadError,
  createCoverUploadIntent,
  putCoverUpload,
  finalizeCoverUpload,
  createEditorialManga,
  EditorialClientError,
  fetchEditorialMangaClient,
  hideEditorialManga,
  lookupEditorial,
  publishEditorialManga,
  updateEditorialManga,
} from "@/data/editorial.client";
import {
  createPayload,
  demographyLabels,
  editorialTextLength,
  emptyEditorialForm,
  mangaToForm,
  publicationRequirements,
  ratingLabels,
  statusLabels,
  updatePayload,
  validateEditorialForm,
  type EditorialFieldErrors,
  type ContributionType,
  type EditorialFormState,
  type EditorialLookupItem,
  type EditorialManga,
} from "@/data/editorial";
import { contributionTypeLabels, mangaTypeLabels } from "@/types/manga-metadata";
import styles from "./MangaEditor.module.css";

type DialogKind = "publish" | "hide" | "duplicate" | null;
type MutationKind = "save" | "publish" | "hide" | "cover" | null;
type SaveState = "saved" | "dirty" | "saving" | "error";
const focusable = "a[href],button,input,select,textarea,[tabindex]";

function visibleFocusable(root: HTMLElement): HTMLElement[] {
  return [...root.querySelectorAll<HTMLElement>(focusable)].filter((element) => {
    if (element.tabIndex < 0 || element.hidden || element.hasAttribute("disabled") || element.getAttribute("aria-hidden") === "true") return false;
    let current: HTMLElement | null = element;
    while (current) {
      const style = window.getComputedStyle(current);
      if (current.hidden || current.hasAttribute("inert") || current.getAttribute("aria-hidden") === "true" || style.display === "none" || style.visibility === "hidden" || style.visibility === "collapse") return false;
      current = current.parentElement;
    }
    return true;
  });
}

function EditorDialog({ title, description, children, onClose, initialFocusRef, locked = false }: { title: string; description: string; children: ReactNode; onClose: () => void; initialFocusRef?: React.RefObject<HTMLElement | null>; locked?: boolean }) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusFrame = requestAnimationFrame(() => {
      const dialog = dialogRef.current;
      if (!dialog) return;
      (initialFocusRef?.current ?? visibleFocusable(dialog)[0] ?? dialog)?.focus();
    });
    return () => {
      cancelAnimationFrame(focusFrame);
      const opener = openerRef.current;
      requestAnimationFrame(() => { if (opener?.isConnected) opener.focus(); });
    };
  }, [initialFocusRef]);
  function keyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") { event.preventDefault(); if (!locked) onClose(); return; }
    if (event.key !== "Tab" || !dialogRef.current) return;
    const items = visibleFocusable(dialogRef.current);
    if (!items.length) { event.preventDefault(); dialogRef.current.focus(); return; }
    const first = items[0]; const last = items.at(-1)!;
    if (items.length === 1 || (!event.shiftKey && document.activeElement === last)) { event.preventDefault(); first.focus(); }
    else if (event.shiftKey && (document.activeElement === first || !dialogRef.current.contains(document.activeElement))) { event.preventDefault(); last.focus(); }
  }
  return createPortal(<div className={styles.backdrop} data-editorial-dialog-portal="true" onMouseDown={(event) => { if (!locked && event.target === event.currentTarget) onClose(); }}><div aria-busy={locked || undefined} aria-describedby="editor-dialog-description" aria-labelledby="editor-dialog-title" aria-modal="true" className={styles.dialog} onKeyDown={keyDown} ref={dialogRef} role="dialog" tabIndex={-1}><header><small>Revisión editorial</small><h2 id="editor-dialog-title">{title}</h2><p id="editor-dialog-description">{description}</p></header>{children}</div></div>, document.body);
}

function Lookup({ kind, onPick, excludeIds, disabled = false }: { kind: "genres" | "creators"; onPick: (item: EditorialLookupItem) => void; excludeIds?: readonly string[]; disabled?: boolean }) {
  const [q, setQ] = useState("");
  const [items, setItems] = useState<EditorialLookupItem[]>([]);
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const [active, setActive] = useState(0);
  useEffect(() => {
    if (!q.trim() || disabled) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setState("loading");
      lookupEditorial(kind, q.trim()).then((result) => { if (!controller.signal.aborted) { setItems(result.items.filter(({ id }) => !excludeIds?.includes(id))); setActive(0); setState("idle"); } }).catch(() => { if (!controller.signal.aborted) setState("error"); });
    }, 300);
    return () => { controller.abort(); window.clearTimeout(timer); };
  }, [disabled, excludeIds, kind, q]);
  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") { event.preventDefault(); setActive((value) => Math.min(value + 1, items.length - 1)); }
    if (event.key === "ArrowUp") { event.preventDefault(); setActive((value) => Math.max(value - 1, 0)); }
    if (event.key === "Enter" && state === "idle" && items[active]) { event.preventDefault(); onPick(items[active]); reset(); }
    if (event.key === "Escape") reset();
  }
  function reset() { setQ(""); setItems([]); setState("idle"); setActive(0); }
  const label = kind === "genres" ? "Buscar género" : "Buscar creator";
  return <div className={styles.lookup}><label>{label}<input aria-activedescendant={state === "idle" && items[active] ? `${kind}-${items[active].id}` : undefined} aria-autocomplete="list" aria-controls={`${kind}-results`} aria-expanded={Boolean(q)} autoComplete="off" disabled={disabled} onChange={(event) => { setQ(event.target.value); setItems([]); setActive(0); setState(event.target.value.trim() ? "loading" : "idle"); }} onKeyDown={onKeyDown} placeholder="Escribe para buscar…" role="combobox" type="search" value={q} /></label>{q && <div className={styles.results} id={`${kind}-results`} role="listbox">{state === "loading" && <p aria-live="polite">Buscando…</p>}{state === "error" && <p role="alert">No se pudo completar la búsqueda.</p>}{state === "idle" && !items.length && <p>Sin resultados.</p>}{state === "idle" && items.map((item, index) => <button aria-selected={index === active} className={index === active ? styles.activeResult : undefined} id={`${kind}-${item.id}`} key={item.id} onClick={() => { onPick(item); reset(); }} role="option" type="button">{item.name}</button>)}</div>}</div>;
}

const requirementLabels: Record<string, string> = { title: "Título", description: "Sinopsis", type: "Tipo", demography: "Demografía", contentRating: "Clasificación", status: "Estado", genres: "Género", creators: "Contribución" };
function friendlyError(error: unknown): string {
  if (!(error instanceof EditorialClientError)) return "No pudimos completar la operación. Inténtalo de nuevo.";
  const messages: Record<string, string> = {
    EDITORIAL_MANGA_DUPLICATE: "Existe otra ficha con el mismo título o alias.",
    EDITORIAL_MANGA_STALE_VERSION: "La ficha cambió en el servidor. Recarga antes de continuar.",
    EDITORIAL_MANGA_INVALID_TRANSITION: "La transición ya no está disponible para el estado actual.",
    EDITORIAL_MANGA_ADULT_UNSUPPORTED: "Las fichas ADULT legacy no pueden modificarse ni publicarse.",
    EDITORIAL_MANGA_NOT_READY: "El servidor indica que faltan requisitos de publicación.",
  };
  if (error.status === 400) return "El servidor rechazó los datos enviados. Revisa el formulario y vuelve a intentarlo.";
  if (error.status === 401 || error.status === 403) return "Tu sesión ya no tiene autoridad para esta operación.";
  return error.code ? messages[error.code] ?? "La operación entró en conflicto con el estado actual." : "No se pudo contactar con el servidor editorial.";
}

export function MangaEditor({ csrfToken, initialManga, isAdmin }: { csrfToken: string; initialManga: EditorialManga | null; isAdmin: boolean }) {
  const router = useRouter();
  const [manga, setManga] = useState(initialManga);
  const [form, setForm] = useState<EditorialFormState>(() => initialManga ? mangaToForm(initialManga) : emptyEditorialForm());
  const [baseline, setBaseline] = useState(() => JSON.stringify(initialManga ? mangaToForm(initialManga) : emptyEditorialForm()));
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [mutation, setMutation] = useState<MutationKind>(null);
  const mutationRef = useRef<MutationKind>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [localCover, setLocalCover] = useState<string | null>(null);
  const localCoverRef = useRef<string | null>(null);
  const [coverMessage, setCoverMessage] = useState<string | null>(null);
  const [coverError, setCoverError] = useState(false);
  const [coverSyncRequired, setCoverSyncRequired] = useState(false);
  const coverSyncRef = useRef(false);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const coverNoticeRef = useRef<HTMLDivElement>(null);
  const mountedRef = useRef(true);
  const readGenerationRef = useRef(0);
  const [message, setMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<EditorialFieldErrors>({});
  const [serverMissing, setServerMissing] = useState<string[]>([]);
  const [dialog, setDialog] = useState<DialogKind>(null);
  const [reason, setReason] = useState("");
  const [duplicateAction, setDuplicateAction] = useState<"save" | "publish" | null>(null);
  const [preview, setPreview] = useState<"desktop" | "mobile" | "card">("desktop");
  const [creatorRole, setCreatorRole] = useState<ContributionType>("AUTHOR");
  const reasonRef = useRef<HTMLTextAreaElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const dirty = JSON.stringify(form) !== baseline;
  const mutationPending = mutation !== null || coverSyncRequired;
  const displayedSaveState: SaveState = mutation !== null ? "saving" : saveState === "error" ? "error" : dirty ? "dirty" : "saved";
  const missing = useMemo(() => publicationRequirements(form), [form]);
  const legacyAdult = form.contentRating === "ADULT";
  const reasonLength = editorialTextLength(reason.trim());
  const reasonValid = reasonLength >= 1 && reasonLength <= 2000;
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (dirty || mutationRef.current === "cover" || coverSyncRef.current) event.preventDefault(); };
    window.addEventListener("beforeunload", warn); return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      readGenerationRef.current += 1;
      if (localCoverRef.current) URL.revokeObjectURL(localCoverRef.current);
      localCoverRef.current = null;
    };
  }, []);

  function clearCoverSelection() {
    if (localCoverRef.current) URL.revokeObjectURL(localCoverRef.current);
    localCoverRef.current = null;
    setCoverFile(null); setLocalCover(null);
    if (coverInputRef.current) coverInputRef.current.value = "";
  }
  function selectCover(file?: File) {
    if (mutationRef.current || coverSyncRef.current || dirty || !manga) return;
    clearCoverSelection(); setCoverMessage(null); setCoverError(false);
    if (!file) return;
    const error = coverFileError(file);
    if (error) { setCoverMessage(error); setCoverError(true); return; }
    localCoverRef.current = URL.createObjectURL(file);
    setLocalCover(localCoverRef.current);
    setCoverFile(file);
  }
  async function syncCover() {
    if (!manga) return;
    const generation = ++readGenerationRef.current;
    setCoverMessage("Actualizando la ficha con la portada del servidor…");
    try {
      const result = await fetchEditorialMangaClient(manga.id);
      if (!isCurrentRead(generation)) return;
      acceptServer(result.manga); clearCoverSelection();
      coverSyncRef.current = false; setCoverSyncRequired(false);
      setCoverError(false); setCoverMessage("Ficha sincronizada con la portada del servidor.");
    } catch (error) {
      if (isCurrentRead(generation)) throw error;
    }
  }
  async function uploadCover() {
    if (!manga || !coverFile || dirty || coverSyncRef.current || !beginMutation("cover")) return;
    let finalized = false;
    setCoverError(false); setMessage(null);
    try {
      setCoverMessage("Preparando la subida…");
      const intent = await createCoverUploadIntent(manga.id, coverFile, csrfToken);
      if (!mountedRef.current) return;
      setCoverMessage("Enviando la portada…");
      await putCoverUpload(intent, coverFile);
      if (!mountedRef.current) return;
      setCoverMessage("Validando la imagen en el servidor…");
      // From here a network failure can leave the commit outcome uncertain.
      // Only a canonical read may unlock editing; never automatically finalize twice.
      coverSyncRef.current = true; setCoverSyncRequired(true);
      await finalizeCoverUpload(intent.intentId, csrfToken);
      finalized = true;
      if (!mountedRef.current) return;
      await syncCover();
    } catch (error) {
      if (!mountedRef.current) return;
      if (!finalized && error instanceof EditorialClientError && error.status >= 400 && error.status < 500) {
        coverSyncRef.current = false; setCoverSyncRequired(false);
      }
      clearCoverSelection(); setCoverError(true); setSaveState("error");
      setCoverMessage(coverSyncRef.current ? "La subida puede haberse aplicado, pero la ficha no está sincronizada. Recarga la ficha antes de continuar; no repetiremos finalize." : coverUploadError(error));
      requestAnimationFrame(() => coverNoticeRef.current?.focus());
    } finally { if (mountedRef.current) endMutation(); }
  }
  async function retryCoverSync() {
    if (!coverSyncRef.current || mutationRef.current) return;
    mutationRef.current = "cover"; setMutation("cover");
    try { await syncCover(); }
    catch { if (mountedRef.current) { setCoverError(true); setCoverMessage("No se pudo sincronizar la ficha. Reintenta la lectura antes de continuar."); } }
    finally { if (mountedRef.current) endMutation(); }
  }

  function change<K extends keyof EditorialFormState>(key: K, value: EditorialFormState[K]) {
    if (mutationRef.current || coverSyncRef.current) return;
    setForm((current) => ({ ...current, [key]: value }));
    setSaveState("saved"); setMessage(null);
    if (key === "title" || key === "description" || key === "aliases") setFieldErrors((current) => ({ ...current, [key]: undefined }));
  }
  function beginMutation(kind: Exclude<MutationKind, null>): boolean {
    if (mutationRef.current || coverSyncRef.current) return false;
    // A GET started before this mutation must not overwrite its eventual result.
    readGenerationRef.current += 1;
    mutationRef.current = kind; setMutation(kind); setSaveState("saving"); return true;
  }
  function endMutation() { mutationRef.current = null; setMutation(null); }
  function focusFirstError(errors: EditorialFieldErrors) {
    requestAnimationFrame(() => {
      if (errors.title) titleRef.current?.focus();
      else if (errors.description) descriptionRef.current?.focus();
      else if (errors.aliases) document.querySelector<HTMLInputElement>("[data-editorial-alias]")?.focus();
    });
  }
  function isCurrentRead(generation: number) { return mountedRef.current && generation === readGenerationRef.current; }
  function acceptServer(next: EditorialManga) { readGenerationRef.current += 1; const nextForm = mangaToForm(next); setManga(next); setForm(nextForm); setBaseline(JSON.stringify(nextForm)); setSaveState("saved"); setMessage("Cambios guardados con la versión del servidor."); setFieldErrors({}); setServerMissing([]); }
  async function save(overrideReason?: string) {
    if (mutationRef.current) return;
    if (overrideReason !== undefined && (editorialTextLength(overrideReason) < 1 || editorialTextLength(overrideReason) > 2000)) return;
    if (legacyAdult) { setMessage("La ficha ADULT legacy se conserva sin conversión; el backend no permite editarla."); return; }
    const errors = validateEditorialForm(form);
    if (Object.keys(errors).length) { setFieldErrors(errors); setSaveState("error"); setMessage("Corrige los campos indicados antes de guardar."); focusFirstError(errors); return; }
    if (!beginMutation("save")) return;
    setMessage(null);
    try {
      const result = manga ? await updateEditorialManga(manga.id, updatePayload(manga, form, overrideReason), csrfToken) : await createEditorialManga(createPayload(form, overrideReason), csrfToken);
      acceptServer(result.manga);
      if (!manga) router.replace(`/editorial/mangas/${result.manga.id}`);
      setDialog(null); setDuplicateAction(null); setReason("");
    } catch (error) {
      setSaveState("error"); setMessage(friendlyError(error));
      if (error instanceof EditorialClientError && error.code === "EDITORIAL_MANGA_DUPLICATE" && isAdmin) { setDuplicateAction("save"); setReason(""); setDialog("duplicate"); }
    } finally { endMutation(); }
  }
  async function publish(overrideReason?: string) {
    if (mutationRef.current || !manga || legacyAdult) return;
    if (overrideReason !== undefined && (editorialTextLength(overrideReason) < 1 || editorialTextLength(overrideReason) > 2000)) return;
    if (dirty) { setMessage("Guarda los cambios antes de publicar."); return; }
    if (!beginMutation("publish")) return;
    setMessage(null);
    try { const result = await publishEditorialManga(manga.id, manga.version, csrfToken, overrideReason); acceptServer(result.manga); setDialog(null); setDuplicateAction(null); setReason(""); }
    catch (error) { setSaveState("error"); setMessage(friendlyError(error)); if (error instanceof EditorialClientError) { setServerMissing(error.missingRequirements ?? []); if (error.code === "EDITORIAL_MANGA_DUPLICATE" && isAdmin) { setDuplicateAction("publish"); setDialog("duplicate"); } } }
    finally { endMutation(); }
  }
  async function hide() {
    if (mutationRef.current || !manga || !reasonValid) return;
    if (dirty) { setMessage("Guarda o descarta los cambios antes de ocultar la ficha."); setDialog(null); return; }
    if (!beginMutation("hide")) return;
    try { const result = await hideEditorialManga(manga.id, manga.version, reason.trim(), csrfToken); acceptServer(result.manga); setDialog(null); setReason(""); }
    catch (error) { setSaveState("error"); setMessage(friendlyError(error)); }
    finally { endMutation(); }
  }
  async function reload() {
    if (!manga || mutationRef.current || coverSyncRef.current) return;
    const generation = ++readGenerationRef.current;
    try { const result = await fetchEditorialMangaClient(manga.id); if (isCurrentRead(generation)) acceptServer(result.manga); }
    catch (error) { if (isCurrentRead(generation)) setMessage(friendlyError(error)); }
  }
  function addCreator(item: EditorialLookupItem) {
    if (mutationRef.current) return;
    if (form.creators.some(({ id, contributionType }) => id === item.id && contributionType === creatorRole)) return;
    change("creators", [...form.creators, { ...item, contributionType: creatorRole }]);
  }
  const displayedMissing = serverMissing.length ? serverMissing : missing;
  const coverUrl = manga?.cover?.status === "READY" ? manga.cover.url : null;
  const previewCoverUrl = localCover ?? coverUrl;

  return <main className={styles.page}>
    <header aria-busy={mutationPending || undefined} className={styles.commandBar}><Link aria-disabled={mutationPending || undefined} href="/editorial/mangas" onClick={(event) => { if (mutationPending) event.preventDefault(); }}>← Catálogo editorial</Link><div aria-live="polite" className={styles.saveStatus} data-state={displayedSaveState}><span />{displayedSaveState === "dirty" ? "Cambios sin guardar" : displayedSaveState === "saving" ? "Guardando…" : displayedSaveState === "error" ? "Error" : "Guardado"}</div><button disabled={!dirty || mutationPending || legacyAdult} onClick={() => void save()} type="button">Guardar</button><button className={styles.primary} disabled={!manga || dirty || manga?.editorialStatus !== "DRAFT" || mutationPending || legacyAdult} onClick={() => { if (!mutationRef.current && !coverSyncRef.current) setDialog("publish"); }} title={dirty ? "Guarda los cambios antes de publicar." : undefined} type="button">Publicar</button></header>
    <section className={styles.identity}><div className={styles.cover} key={manga?.cover?.id ?? "no-cover"} style={coverBackground(coverUrl)}>{!coverUrl && <span>Sin portada</span>}</div><div><small>Catálogo editorial · {manga ? "Edición" : "Nueva ficha"}</small><h1>{form.title || "Título sin definir"}</h1><code>{manga?.slug ?? "El slug se generará al crear"}</code><div className={styles.pills}><span>{mangaTypeLabels[form.type]}</span><span>{form.demography ? demographyLabels[form.demography] : "Sin demografía"}</span><span>{form.contentRating}</span><span>{statusLabels[form.status]}</span><span>{manga?.editorialStatus ?? "DRAFT"} · v{manga?.version ?? "—"}</span></div></div></section>
    {message && <div className={styles.notice} role={saveState === "error" ? "alert" : "status"}>{message}{message.includes("cambió en el servidor") && <button onClick={() => void reload()} type="button">Recargar versión actual</button>}</div>}
    {legacyAdult && <div className={styles.warning} role="alert">Esta ficha conserva una clasificación ADULT legacy. Se muestra sin convertirla; las mutaciones permanecen bloqueadas por el contrato actual.</div>}
    {coverMessage && <div aria-live="polite" className={styles.notice} id="editor-cover-notice" ref={coverNoticeRef} role={coverError ? "alert" : "status"} tabIndex={-1}>{coverMessage}{coverSyncRequired && mutation === null && <button onClick={() => void retryCoverSync()} type="button">Reintentar lectura de la ficha</button>}</div>}
    <div className={styles.studio}>
      <nav aria-label="Secciones del editor" className={styles.rail}>{[["01","Información"],["02","Multimedia"],["03","Descubrimiento"],["04","Créditos"],["05","Publicación"]].map(([n,label]) => <a href={`#section-${n}`} key={n}><b>{n}</b>{label}</a>)}</nav>
      <fieldset aria-busy={mutationPending || undefined} className={styles.workspace} disabled={mutationPending}>
        <EditorSection id="01" title="Información"><div className={styles.twoColumns}><div className={styles.stack}><Field error={fieldErrors.title} errorId="editor-title-error" label="Título principal" required><input aria-describedby={fieldErrors.title ? "editor-title-error" : undefined} aria-invalid={Boolean(fieldErrors.title)} onChange={(e) => change("title", e.target.value)} ref={titleRef} value={form.title} /></Field><div><span className={styles.fieldLabel}>Títulos alternativos</span><div className={styles.aliases}>{form.aliases.map((alias, index) => <div className={styles.aliasRow} key={index}><input aria-describedby={fieldErrors.aliases ? "editor-aliases-error" : undefined} aria-invalid={Boolean(fieldErrors.aliases)} aria-label={`Título alternativo ${index + 1}`} data-editorial-alias="true" onChange={(e) => change("aliases", form.aliases.map((item, i) => i === index ? { ...item, alias: e.target.value } : item))} value={alias.alias} /><span title={alias.languageCode ?? "Sin idioma"}>{alias.languageCode ?? "—"}</span><button aria-label={`Eliminar título alternativo ${index + 1}`} onClick={() => change("aliases", form.aliases.filter((_, i) => i !== index))} type="button">×</button></div>)}</div>{fieldErrors.aliases && <span className={styles.fieldError} id="editor-aliases-error" role="alert">{fieldErrors.aliases}</span>}<button className={styles.secondary} onClick={() => change("aliases", [...form.aliases, { alias: "", languageCode: null }])} type="button">Añadir título</button></div><Field error={fieldErrors.description} errorId="editor-description-error" label="Sinopsis" required suffix={`${editorialTextLength(form.description.trim())}/10.000`}><textarea aria-describedby={fieldErrors.description ? "editor-description-error" : undefined} aria-invalid={Boolean(fieldErrors.description)} onChange={(e) => change("description", e.target.value)} ref={descriptionRef} value={form.description} /></Field></div><div className={styles.stack}><Field label="Tipo" required><select onChange={(e) => change("type", e.target.value as EditorialFormState["type"])} value={form.type}>{Object.entries(mangaTypeLabels).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></Field><Field label="Demografía" required><select onChange={(e) => change("demography", (e.target.value || null) as EditorialFormState["demography"])} value={form.demography ?? ""}><option value="">Seleccionar</option>{Object.entries(demographyLabels).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></Field><Field label="Clasificación" required><select disabled={legacyAdult} onChange={(e) => change("contentRating", e.target.value as EditorialFormState["contentRating"])} value={form.contentRating}>{legacyAdult && <option value="ADULT">ADULT · legacy</option>}{Object.entries(ratingLabels).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></Field><Field label="Estado de la obra" required><select onChange={(e) => change("status", e.target.value as EditorialFormState["status"])} value={form.status}>{Object.entries(statusLabels).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></Field></div></div></EditorSection>
        <EditorSection id="02" title="Multimedia"><div className={styles.mediaGrid}><article className={styles.coverUpload}><h3>Portada</h3><div className={styles.mediaCover} key={manga?.cover?.id ?? "no-cover"}>{coverUrl ? <MangaCoverImage alt="Portada guardada" fill sizes="132px" src={coverUrl} /> : "Sin portada"}</div><p>Portada guardada en el servidor. JPEG, PNG o WebP estática, hasta 10 MiB; la validación definitiva ocurre al finalizar.</p><label htmlFor="editor-cover-file">Seleccionar portada</label><input accept="image/jpeg,image/png,image/webp" aria-describedby={coverError ? "editor-cover-help editor-cover-notice" : "editor-cover-help"} aria-invalid={coverError || undefined} disabled={!manga || dirty || mutationPending} id="editor-cover-file" onChange={(event) => selectCover(event.target.files?.[0])} ref={coverInputRef} type="file" /><p id="editor-cover-help">{!manga ? "Guarda el manga antes de subir una portada." : dirty ? "Guarda los cambios antes de actualizar la portada." : "Selecciona una imagen para subir o reemplazar la portada."}</p>{coverFile && <div className={styles.localCover}><p>Vista previa sin guardar: {coverFile.name}</p>{localCover && <div className={styles.mediaCover}><MangaCoverImage alt="Portada local sin guardar" fill sizes="132px" src={localCover} unoptimized /></div>}<div className={styles.coverActions}><button className={styles.secondary} disabled={dirty || mutationPending} onClick={() => void uploadCover()} type="button">Subir portada</button><button className={styles.secondary} disabled={mutationPending} onClick={() => { if (!mutationRef.current && !coverSyncRef.current) { clearCoverSelection(); setCoverMessage(null); setCoverError(false); } }} type="button">Descartar selección</button></div></div>}</article><article><h3>Banner</h3><div className={styles.banner}>Fondo editorial MangaZone</div><p>El banner es recomendado y estará disponible próximamente.</p></article></div></EditorSection>
        <EditorSection id="03" title="Descubrimiento"><div className={styles.fieldGroup}><span className={styles.fieldLabel}>Géneros <em>*</em></span><div className={styles.chips}>{form.genres.map((genre) => <span key={genre.id}>{genre.name}<button aria-label={`Eliminar género ${genre.name}`} onClick={() => { change("genres", form.genres.filter(({ id }) => id !== genre.id)); change("genreIds", form.genreIds.filter((id) => id !== genre.id)); }} type="button">×</button></span>)}</div><Lookup disabled={mutationPending} excludeIds={form.genreIds} kind="genres" onPick={(item) => { change("genres", [...form.genres, { ...item, slug: "" }]); change("genreIds", [...form.genreIds, item.id]); }} /></div><Field label="Slug"><input readOnly value={manga?.slug ?? "Se generará en el servidor"} /></Field></EditorSection>
        <EditorSection id="04" title="Créditos"><div className={styles.credits}>{form.creators.map((creator, index) => <div className={styles.credit} key={`${creator.id}-${creator.contributionType}`}><span><b>{creator.name}</b><small>{contributionTypeLabels[creator.contributionType]}</small></span><button aria-label={`Eliminar ${creator.name} como ${contributionTypeLabels[creator.contributionType]}`} onClick={() => change("creators", form.creators.filter((_, i) => i !== index))} type="button">×</button></div>)}</div><div className={styles.creditAdd}><Lookup disabled={mutationPending} kind="creators" onPick={addCreator} /><label>Contribución<select onChange={(e) => { if (!mutationRef.current && !coverSyncRef.current) setCreatorRole(e.target.value as ContributionType); }} value={creatorRole}>{Object.entries(contributionTypeLabels).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label></div></EditorSection>
        <EditorSection id="05" title="Publicación"><div className={styles.workflow}><article data-active={manga?.editorialStatus === "DRAFT" || !manga}><b>DRAFT</b><p>Ficha editable.</p></article><span>→</span><article data-active={manga?.editorialStatus === "PUBLIC"}><b>PUBLIC</b><p>Visible en catálogo.</p></article><span>→</span><article data-active={manga?.editorialStatus === "HIDDEN"}><b>HIDDEN</b><p>Retirada por ADMIN.</p></article></div>{isAdmin && manga?.editorialStatus === "PUBLIC" && <button className={styles.danger} onClick={() => { if (mutationRef.current || coverSyncRef.current) return; if (dirty) { setMessage("Guarda o descarta los cambios antes de ocultar la ficha."); return; } setReason(""); setDialog("hide"); }} type="button">Ocultar ficha</button>}</EditorSection>
      </fieldset>
      <aside className={styles.previewDock}><div className={styles.previewTabs} role="tablist" aria-label="Vista previa">{(["desktop","mobile","card"] as const).map((view) => <button aria-selected={preview === view} key={view} onClick={() => setPreview(view)} role="tab" type="button">{view === "desktop" ? "Ficha Desktop" : view === "mobile" ? "Ficha Mobile" : "Tarjeta"}</button>)}</div>{localCover && <p role="status">Vista previa sin guardar</p>}<Preview coverUrl={previewCoverUrl} form={form} key={manga?.cover?.id ?? "no-cover"} mode={preview} /><section className={styles.readiness}><header><h2>Publish Readiness</h2><strong>{8 - missing.length}/8</strong></header>{Object.keys(requirementLabels).map((key) => <div className={styles.requirement} data-ok={!displayedMissing.includes(key)} key={key}><span>{displayedMissing.includes(key) ? "○" : "✓"}</span>{requirementLabels[key]}<small>REQUERIDO</small></div>)}<div className={styles.requirement} data-ok={Boolean(coverUrl)}><span>{coverUrl ? "✓" : "○"}</span>Portada<small>RECOMENDADO</small></div><div className={styles.requirement}><span>○</span>Banner próximo<small>RECOMENDADO</small></div><p>La confirmación definitiva ocurre al publicar en el servidor.</p></section></aside>
    </div>
    {dialog === "publish" && <EditorDialog description="Confirma el estado actual antes de solicitar la publicación al servidor." locked={mutationPending} onClose={() => setDialog(null)} title="Revisar antes de publicar"><div className={styles.dialogBody}><Review form={form} cover={Boolean(coverUrl)} /><p>Se enviará la versión {manga?.version}. La portada y el banner no bloquean.</p></div><footer><button disabled={mutationPending} onClick={() => setDialog(null)} type="button">Cancelar</button><button className={styles.primary} disabled={Boolean(missing.length) || mutationPending} onClick={() => void publish()} type="button">{mutation === "publish" ? "Publicando…" : "Confirmar publicación"}</button></footer></EditorDialog>}
    {dialog === "hide" && <EditorDialog description="Esta acción administrativa retira la ficha pública y requiere una razón." initialFocusRef={reasonRef} locked={mutationPending} onClose={() => setDialog(null)} title="Ocultar ficha"><div className={styles.dialogBody}><label>Razón<textarea aria-describedby={!reasonValid && reason ? "editor-reason-error" : undefined} aria-invalid={!reasonValid && Boolean(reason)} disabled={mutationPending} onChange={(e) => setReason(e.target.value)} ref={reasonRef} value={reason} /></label><small>{reasonLength}/2000</small>{!reasonValid && reason && <span className={styles.fieldError} id="editor-reason-error" role="alert">La razón admite entre 1 y 2000 caracteres.</span>}</div><footer><button disabled={mutationPending} onClick={() => setDialog(null)} type="button">Cancelar</button><button className={styles.danger} disabled={!reasonValid || mutationPending} onClick={() => void hide()} type="button">{mutation === "hide" ? "Ocultando…" : "Ocultar ficha"}</button></footer></EditorDialog>}
    {dialog === "duplicate" && <EditorDialog description="El servidor detectó un homónimo. Solo una cuenta ADMIN puede continuar con una justificación." initialFocusRef={reasonRef} locked={mutationPending} onClose={() => setDialog(null)} title="Conflicto de título"><div className={styles.dialogBody}><p>No se exponen datos de la ficha candidata.</p><label>Razón del homónimo<textarea aria-describedby={!reasonValid && reason ? "editor-reason-error" : undefined} aria-invalid={!reasonValid && Boolean(reason)} disabled={mutationPending} onChange={(e) => setReason(e.target.value)} ref={reasonRef} value={reason} /></label><small>{reasonLength}/2000</small>{!reasonValid && reason && <span className={styles.fieldError} id="editor-reason-error" role="alert">La razón admite entre 1 y 2000 caracteres.</span>}</div><footer><button disabled={mutationPending} onClick={() => setDialog(null)} type="button">Cancelar</button><button className={styles.primary} disabled={!reasonValid || mutationPending} onClick={() => duplicateAction === "publish" ? void publish(reason.trim()) : void save(reason.trim())} type="button">{mutationPending ? "Procesando…" : "Continuar como ADMIN"}</button></footer></EditorDialog>}
  </main>;
}

function EditorSection({ id, title, children }: { id: string; title: string; children: ReactNode }) { return <section className={styles.section} id={`section-${id}`}><header><b>{id}</b><div><h2>{title}</h2><p>Metadata editorial persistida por los contratos actuales.</p></div></header>{children}</section>; }
function Field({ label, required, suffix, children, error, errorId }: { label: string; required?: boolean; suffix?: string; children: ReactNode; error?: string; errorId?: string }) { return <label className={styles.field}><span>{label}{required && <em> *</em>}{suffix && <small>{suffix}</small>}</span>{children}{error && <span className={styles.fieldError} id={errorId} role="alert">{error}</span>}</label>; }
function Review({ form, cover }: { form: EditorialFormState; cover: boolean }) { return <div className={styles.review}><article><h3>Información</h3><p>{form.title || "Sin título"}</p><p>{mangaTypeLabels[form.type]} · {form.demography ? demographyLabels[form.demography] : "Sin demografía"}</p></article><article><h3>Descubrimiento</h3><p>{form.genres.map(({ name }) => name).join(", ") || "Sin géneros"}</p></article><article><h3>Créditos</h3><p>{form.creators.length} contribuciones</p></article><article><h3>Multimedia</h3><p>{cover ? "Portada existente" : "Sin portada (no bloquea)"}</p><p>Banner próximo (no bloquea)</p></article></div>; }
function Preview({ form, mode, coverUrl }: { form: EditorialFormState; mode: "desktop" | "mobile" | "card"; coverUrl: string | null }) {
  return <section aria-label={`Vista previa ${mode}`} className={`${styles.preview} ${styles[mode]}`}><div className={styles.previewCover} style={coverBackground(coverUrl)}>{!coverUrl && "Sin portada"}</div><div className={styles.previewBody}><small>{mangaTypeLabels[form.type]} · {form.demography ? demographyLabels[form.demography] : "Sin demografía"}</small><h2>{form.title || "Título sin definir"}</h2>{mode !== "card" && <p>{form.aliases.map(({ alias }) => alias).filter(Boolean).join(" · ")}</p>}<p className={styles.previewMetadata}>{form.contentRating === "ADULT" ? "ADULT · legacy" : ratingLabels[form.contentRating]} · {statusLabels[form.status]}</p><div className={styles.chips}>{form.genres.map(({ id,name }) => <span key={id}>{name}</span>)}</div>{mode !== "card" && <p>{form.description || "La sinopsis aparecerá aquí."}</p>}<div className={styles.previewCredits}>{form.creators.map((creator) => <span key={`${creator.id}-${creator.contributionType}`}>{creator.name} · {contributionTypeLabels[creator.contributionType]}</span>)}</div></div></section>;
}

function coverBackground(url: string | null): CSSProperties | undefined {
  return url ? { backgroundImage: `url(${JSON.stringify(url)})` } : undefined;
}
