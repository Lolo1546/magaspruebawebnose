"use client";

import { Pencil, Trash2, X } from "lucide-react";
import Image from "@/components/manga/MangaCoverImage";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  type FormEvent,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";

import { EmptyState } from "@/components/feedback/FeedbackState";
import { Button } from "@/components/ui/Button";
import {
  deleteList,
  ListsMutationError,
  removeListItem,
  updateList,
  type UpdateListInput,
} from "@/data/lists.client";
import type {
  ApiListVisibility,
  UserListDetail,
  UserListItem,
} from "@/data/lists";

import styles from "./ListDetailPage.module.css";

const apiVisibilityByView = {
  private: "PRIVATE",
  public: "PUBLIC",
  unlisted: "UNLISTED",
} as const;

const visibilityOptions: readonly {
  description: string;
  label: string;
  value: ApiListVisibility;
}[] = [
  {
    description: "Solo tú puedes acceder a esta colección.",
    label: "Privada",
    value: "PRIVATE",
  },
  {
    description: "Guarda la configuración para acceso futuro mediante enlace.",
    label: "No listada",
    value: "UNLISTED",
  },
  {
    description: "Guarda la configuración para la futura experiencia pública.",
    label: "Pública",
    value: "PUBLIC",
  },
];

type ConfirmationTarget =
  | { kind: "list" }
  | { item: UserListItem; kind: "item" };

function mutationMessage(error: unknown, fallback: string): string {
  if (!(error instanceof ListsMutationError)) return fallback;
  if (error.status === 401) return "Tu sesión expiró. Inicia sesión de nuevo.";
  if (error.status === 403) return "No pudimos validar la solicitud. Actualiza la página.";
  if (error.status === 404) return "La lista ya no está disponible.";
  if (error.status === 400) return error.message;
  return fallback;
}

function getPageHref(listId: string, page: number): string {
  const path = `/listas/${listId}`;
  return page === 1 ? path : `${path}?page=${page}`;
}

export function ListManagement({
  csrfToken,
  list,
}: {
  csrfToken: string;
  list: UserListDetail;
}) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [confirmation, setConfirmation] = useState<ConfirmationTarget | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const destructivePendingRef = useRef(false);
  const [isDestructivePending, setIsDestructivePending] = useState(false);

  async function confirmDestructiveAction() {
    if (!confirmation || destructivePendingRef.current) return;
    destructivePendingRef.current = true;
    setIsDestructivePending(true);
    setActionError(null);

    try {
      if (confirmation.kind === "list") {
        await deleteList(list.id, csrfToken);
        setConfirmation(null);
        router.push("/listas");
        router.refresh();
      } else {
        await removeListItem(list.id, confirmation.item.manga.id, csrfToken);
        setConfirmation(null);
        router.refresh();
      }
    } catch (error) {
      const message = mutationMessage(error, "No pudimos completar la acción. Inténtalo de nuevo.");
      setActionError(message);
      if (error instanceof ListsMutationError && error.status === 401) {
        router.push("/login");
      }
    } finally {
      destructivePendingRef.current = false;
      setIsDestructivePending(false);
    }
  }

  return (
    <section className={styles.collection}>
      <div className={styles.sectionHeading}>
        <div>
          <p className={styles.eyebrow}>Contenido de la lista</p>
          <h2>Obras guardadas</h2>
          <p>La lista conserva el orden definido por el servicio.</p>
        </div>
        <Button onClick={() => setIsEditing(true)} variant="secondary">
          <Pencil aria-hidden="true" size={16} />
          Editar / gestionar
        </Button>
      </div>

      {actionError && !confirmation ? (
        <p className={styles.actionError} role="alert">{actionError}</p>
      ) : null}

      {list.items.length ? (
        <ol className={styles.items} start={(list.pagination.page - 1) * list.pagination.pageSize + 1}>
          {list.items.map((item) => (
            <li className={styles.item} key={item.manga.id}>
              <div className={styles.itemCover}>
                {item.manga.coverUrl ? (
                  <Image
                    alt={`Portada de ${item.manga.title}`}
                    fill
                    sizes="72px"
                    src={item.manga.coverUrl}
                  />
                ) : null}
              </div>
              <div className={styles.itemCopy}>
                <Link href={`/manga/${item.manga.slug}`}>{item.manga.title}</Link>
                <time dateTime={item.addedAt}>
                  Añadido {new Intl.DateTimeFormat("es-ES", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(item.addedAt))}
                </time>
              </div>
              <Button
                aria-label={`Quitar ${item.manga.title} de la lista`}
                onClick={() => {
                  setActionError(null);
                  setConfirmation({ item, kind: "item" });
                }}
                size="sm"
                variant="secondary"
              >
                <Trash2 aria-hidden="true" size={15} />
                Quitar
              </Button>
            </li>
          ))}
        </ol>
      ) : (
        <EmptyState
          description={list.itemCount ? "No hay obras en esta página." : "Añade mangas desde su ficha cuando esa integración esté disponible."}
          title={list.itemCount ? "Página sin obras" : "Esta lista está vacía"}
        />
      )}

      {list.pagination.pageCount > 1 ? (
        <nav aria-label="Paginación de obras" className={styles.pagination}>
          {list.pagination.page > 1 ? (
            <Link href={getPageHref(list.id, list.pagination.page - 1)}>Anterior</Link>
          ) : <span />}
          <span>Página {list.pagination.page} de {list.pagination.pageCount}</span>
          {list.pagination.page < list.pagination.pageCount ? (
            <Link href={getPageHref(list.id, list.pagination.page + 1)}>Siguiente</Link>
          ) : <span />}
        </nav>
      ) : null}

      {isEditing ? (
        <EditListDialog
          csrfToken={csrfToken}
          list={list}
          onClose={() => setIsEditing(false)}
          onDelete={() => {
            setIsEditing(false);
            setActionError(null);
            setConfirmation({ kind: "list" });
          }}
        />
      ) : null}

      {confirmation ? (
        <ConfirmationDialog
          errorMessage={actionError}
          isPending={isDestructivePending}
          onCancel={() => {
            if (!destructivePendingRef.current) {
              setConfirmation(null);
              setActionError(null);
            }
          }}
          onConfirm={confirmDestructiveAction}
          target={confirmation}
        />
      ) : null}
    </section>
  );
}

function EditListDialog({
  csrfToken,
  list,
  onClose,
  onDelete,
}: {
  csrfToken: string;
  list: UserListDetail;
  onClose: () => void;
  onDelete: () => void;
}) {
  const router = useRouter();
  const titleId = useId();
  const errorId = useId();
  const nameInputRef = useRef<HTMLInputElement>(null);
  const pendingRef = useRef(false);
  const [name, setName] = useState(list.name);
  const [description, setDescription] = useState(list.description ?? "");
  const [visibility, setVisibility] = useState<ApiListVisibility>(apiVisibilityByView[list.visibility]);
  const [isPending, setIsPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const trimmedName = name.trim();
  const trimmedDescription = description.trim();
  const initialDescription = list.description ?? "";
  const initialVisibility = apiVisibilityByView[list.visibility];
  const isDirty =
    trimmedName !== list.name ||
    trimmedDescription !== initialDescription ||
    visibility !== initialVisibility;
  const isValid = trimmedName.length > 0 && name.length <= 80 && description.length <= 255;

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    nameInputRef.current?.focus();
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !pendingRef.current) onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previousFocus?.focus();
    };
  }, [onClose]);

  function discardChanges() {
    setName(list.name);
    setDescription(initialDescription);
    setVisibility(initialVisibility);
    setErrorMessage(null);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isDirty || !isValid || pendingRef.current) return;

    const payload: UpdateListInput = {
      ...(trimmedName !== list.name ? { name: trimmedName } : {}),
      ...(trimmedDescription !== initialDescription
        ? { description: trimmedDescription || null }
        : {}),
      ...(visibility !== initialVisibility ? { visibility } : {}),
    };

    pendingRef.current = true;
    setIsPending(true);
    setErrorMessage(null);
    try {
      await updateList(list.id, payload, csrfToken);
      onClose();
      router.refresh();
    } catch (error) {
      setErrorMessage(mutationMessage(error, "No pudimos guardar los cambios."));
      if (error instanceof ListsMutationError && error.status === 401) {
        router.push("/login");
      }
    } finally {
      pendingRef.current = false;
      setIsPending(false);
    }
  }

  return (
    <div
      className={styles.backdrop}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !pendingRef.current) onClose();
      }}
    >
      <section
        aria-describedby={errorMessage ? errorId : undefined}
        aria-labelledby={titleId}
        aria-modal="true"
        className={styles.editDialog}
        role="dialog"
      >
        <header className={styles.dialogHeader}>
          <div>
            <p className={styles.eyebrow}>Propiedades</p>
            <h2 id={titleId}>Editar lista</h2>
          </div>
          <Button aria-label="Cerrar edición" disabled={isPending} onClick={onClose} variant="icon">
            <X aria-hidden="true" size={20} />
          </Button>
        </header>

        <form className={styles.editForm} onSubmit={submit}>
          <label htmlFor="edit-list-name">Nombre</label>
          <input id="edit-list-name" maxLength={80} onChange={(event) => setName(event.target.value)} ref={nameInputRef} required value={name} />

          <div className={styles.labelRow}>
            <label htmlFor="edit-list-description">Descripción</label>
            <span>{description.length} / 255</span>
          </div>
          <textarea id="edit-list-description" maxLength={255} onChange={(event) => setDescription(event.target.value)} value={description} />

          <fieldset className={styles.visibilityFieldset}>
            <legend>Visibilidad</legend>
            <div className={styles.visibilityGrid}>
              {visibilityOptions.map((option) => (
                <label data-selected={visibility === option.value} key={option.value}>
                  <input checked={visibility === option.value} name="edit-list-visibility" onChange={() => setVisibility(option.value)} type="radio" value={option.value} />
                  <strong>{option.label}</strong>
                  <span>{option.description}</span>
                </label>
              ))}
            </div>
          </fieldset>

          {errorMessage ? <p className={styles.actionError} id={errorId} role="alert">{errorMessage}</p> : null}

          <footer className={styles.dialogFooter}>
            <Button disabled={isPending} onClick={onDelete} variant="ghost">
              <Trash2 aria-hidden="true" size={16} />
              Eliminar lista
            </Button>
            <span className={styles.dialogFooterSpacer} />
            <Button disabled={!isDirty || isPending} onClick={discardChanges} variant="secondary">Descartar cambios</Button>
            <Button disabled={!isDirty || !isValid || isPending} type="submit">
              {isPending ? "Guardando…" : "Guardar cambios"}
            </Button>
          </footer>
        </form>
      </section>
    </div>
  );
}

function ConfirmationDialog({
  errorMessage,
  isPending,
  onCancel,
  onConfirm,
  target,
}: {
  errorMessage: string | null;
  isPending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  target: ConfirmationTarget;
}) {
  const titleId = useId();
  const isList = target.kind === "list";

  return (
    <div className={styles.backdrop}>
      <section aria-labelledby={titleId} aria-modal="true" className={styles.confirmDialog} role="alertdialog">
        <h2 id={titleId}>{isList ? "Eliminar lista" : "Quitar manga"}</h2>
        <p>
          {isList
            ? "Esta acción eliminará definitivamente la lista y sus relaciones."
            : `¿Quieres quitar ${target.item.manga.title} de esta lista?`}
        </p>
        {errorMessage ? <p className={styles.actionError} role="alert">{errorMessage}</p> : null}
        <div className={styles.confirmActions}>
          <Button disabled={isPending} onClick={onCancel} variant="secondary">Cancelar</Button>
          <Button autoFocus disabled={isPending} onClick={onConfirm}>
            {isPending ? "Procesando…" : isList ? "Eliminar definitivamente" : "Quitar manga"}
          </Button>
        </div>
      </section>
    </div>
  );
}
