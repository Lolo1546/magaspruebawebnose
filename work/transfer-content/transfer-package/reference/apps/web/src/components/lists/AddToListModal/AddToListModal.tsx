"use client";

import { BookmarkPlus, LockKeyhole, Plus, Search, X } from "lucide-react";
import Image from "@/components/manga/MangaCoverImage";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";

import { Button } from "@/components/ui/Button";
import {
  addListItem,
  createList,
  fetchListsForManga,
  ListsMutationError,
  removeListItem,
} from "@/data/lists.client";
import type { UserListMembership } from "@/data/lists";

import styles from "./AddToListModal.module.css";

export type AddToListManga = {
  readonly cover: string;
  readonly id: string;
  readonly title: string;
};

type MembershipChanges = {
  readonly toAdd: string[];
  readonly toRemove: string[];
};

export function getMembershipChanges(
  initialSet: ReadonlySet<string>,
  finalSet: ReadonlySet<string>,
): MembershipChanges {
  return {
    toAdd: [...finalSet].filter((listId) => !initialSet.has(listId)),
    toRemove: [...initialSet].filter((listId) => !finalSet.has(listId)),
  };
}

function setsAreEqual(a: ReadonlySet<string>, b: ReadonlySet<string>): boolean {
  return a.size === b.size && [...a].every((value) => b.has(value));
}

function requestErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof ListsMutationError)) return fallback;
  if (error.status === 400) return error.message;
  if (error.status === 401) return "Tu sesión expiró. Inicia sesión de nuevo.";
  if (error.status === 403) {
    return "No pudimos validar la solicitud. Actualiza la página.";
  }
  if (error.status === 404) return "Una de las listas ya no está disponible.";
  return fallback;
}

const visibilityLabels = {
  private: "Privada",
  public: "Pública",
  unlisted: "No listada",
} as const;

export function AddToListModal({
  csrfToken,
  manga,
  onClose,
}: {
  readonly csrfToken: string;
  readonly manga: AddToListManga;
  readonly onClose: () => void;
}) {
  const router = useRouter();
  const titleId = useId();
  const descriptionId = useId();
  const searchRef = useRef<HTMLInputElement>(null);
  const savePendingRef = useRef(false);
  const createPendingRef = useRef(false);
  const [viewState, setViewState] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [lists, setLists] = useState<UserListMembership[]>([]);
  const [initialSet, setInitialSet] = useState<Set<string>>(() => new Set());
  const [finalSet, setFinalSet] = useState<Set<string>>(() => new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [showQuickCreate, setShowQuickCreate] = useState(false);
  const [quickName, setQuickName] = useState("");
  const [quickError, setQuickError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const requestMembership = useCallback(
    () => fetchListsForManga(manga.id),
    [manga.id],
  );

  const applyMembership = useCallback((nextLists: UserListMembership[]) => {
    const nextInitial = new Set(
      nextLists.filter((list) => list.containsManga).map((list) => list.id),
    );
    setLists(nextLists);
    setInitialSet(nextInitial);
    setFinalSet(new Set(nextInitial));
    setViewState("ready");
  }, []);

  const loadMembership = useCallback(async () => {
    setViewState("loading");
    setFeedback(null);
    try {
      applyMembership(await requestMembership());
    } catch (error) {
      setViewState("error");
      setFeedback(requestErrorMessage(error, "No pudimos cargar tus listas."));
      if (error instanceof ListsMutationError && error.status === 401) {
        router.push("/login");
      }
    }
  }, [applyMembership, requestMembership, router]);

  useEffect(() => {
    let isActive = true;
    const previousFocus =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    searchRef.current?.focus();
    void requestMembership()
      .then((nextLists) => {
        if (isActive) applyMembership(nextLists);
      })
      .catch((error: unknown) => {
        if (!isActive) return;
        setViewState("error");
        setFeedback(requestErrorMessage(error, "No pudimos cargar tus listas."));
        if (error instanceof ListsMutationError && error.status === 401) {
          router.push("/login");
        }
      });

    function handleKeyDown(event: KeyboardEvent) {
      if (
        event.key === "Escape" &&
        !savePendingRef.current &&
        !createPendingRef.current
      ) {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      isActive = false;
      document.removeEventListener("keydown", handleKeyDown);
      previousFocus?.focus();
    };
  }, [applyMembership, onClose, requestMembership, router]);

  const filteredLists = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLocaleLowerCase("es");
    if (!normalizedQuery) return lists;
    return lists.filter((list) =>
      list.name.toLocaleLowerCase("es").includes(normalizedQuery),
    );
  }, [lists, searchQuery]);

  const isDirty = !setsAreEqual(initialSet, finalSet);
  const trimmedQuickName = quickName.trim();

  function toggleList(listId: string) {
    if (savePendingRef.current) return;
    setFinalSet((current) => {
      const next = new Set(current);
      if (next.has(listId)) next.delete(listId);
      else next.add(listId);
      return next;
    });
    setFeedback(null);
  }

  async function saveMembership() {
    if (!isDirty || savePendingRef.current) return;
    savePendingRef.current = true;
    setIsSaving(true);
    setFeedback(null);

    const { toAdd, toRemove } = getMembershipChanges(initialSet, finalSet);
    const operations = [
      ...toAdd.map((listId) => ({
        kind: "add" as const,
        listId,
        request: addListItem(listId, manga.id, csrfToken),
      })),
      ...toRemove.map((listId) => ({
        kind: "remove" as const,
        listId,
        request: removeListItem(listId, manga.id, csrfToken),
      })),
    ];

    try {
      const results = await Promise.allSettled(
        operations.map((operation) => operation.request),
      );
      const failures: {
        operation: (typeof operations)[number];
        reason: unknown;
      }[] = [];
      results.forEach((result, index) => {
        const operation = operations[index];
        if (result.status === "rejected" && operation) {
          const reason: unknown = result.reason;
          failures.push({ operation, reason });
        }
      });

      if (!failures.length) {
        setInitialSet(new Set(finalSet));
        router.refresh();
        onClose();
        return;
      }

      if (
        failures.some(
          ({ reason }) =>
            reason instanceof ListsMutationError && reason.status === 401,
        )
      ) {
        router.push("/login");
      }

      const appliedCount = results.length - failures.length;
      const failedSummary = failures
        .map(({ operation, reason }) => {
          const listName =
            lists.find((list) => list.id === operation.listId)?.name ??
            operation.listId;
          const action = operation.kind === "add" ? "añadir a" : "quitar de";
          return `${action} ${listName}: ${requestErrorMessage(reason, "falló la solicitud")}`;
        })
        .join(", ");
      try {
        applyMembership(await requestMembership());
        setFeedback(
          `${appliedCount} cambios se aplicaron y ${failures.length} fallaron (${failedSummary}). Actualizamos el estado real para que puedas reintentar.`,
        );
      } catch {
        setFeedback(
          `${appliedCount} cambios se aplicaron y ${failures.length} fallaron (${failedSummary}). No pudimos volver a consultar el estado; cierra y abre el modal antes de reintentar.`,
        );
      }
    } finally {
      savePendingRef.current = false;
      setIsSaving(false);
    }
  }

  async function quickCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!trimmedQuickName || createPendingRef.current) return;

    createPendingRef.current = true;
    setIsCreating(true);
    setQuickError(null);
    try {
      const created = await createList(
        { name: trimmedQuickName, visibility: "PRIVATE" },
        csrfToken,
      );
      const membershipList: UserListMembership = {
        ...created,
        containsManga: false,
      };
      setLists((current) => [
        membershipList,
        ...current.filter((list) => list.id !== membershipList.id),
      ]);
      setFinalSet((current) => new Set(current).add(membershipList.id));
      setQuickName("");
      setShowQuickCreate(false);
      setFeedback("Lista creada y seleccionada. Guarda para añadir el manga.");
    } catch (error) {
      setQuickError(
        requestErrorMessage(error, "No pudimos crear la lista. Inténtalo de nuevo."),
      );
      if (error instanceof ListsMutationError && error.status === 401) {
        router.push("/login");
      }
    } finally {
      createPendingRef.current = false;
      setIsCreating(false);
    }
  }

  return (
    <div
      className={styles.backdrop}
      onMouseDown={(event) => {
        if (
          event.target === event.currentTarget &&
          !savePendingRef.current &&
          !createPendingRef.current
        ) {
          onClose();
        }
      }}
    >
      <section
        aria-describedby={descriptionId}
        aria-labelledby={titleId}
        aria-modal="true"
        className={styles.dialog}
        role="dialog"
      >
        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>Colecciones personales</p>
            <h2 id={titleId}>Añadir a lista</h2>
            <p id={descriptionId}>
              Selecciona una o varias listas para guardar esta obra.
            </p>
          </div>
          <Button
            aria-label="Cerrar selección de listas"
            disabled={isSaving || isCreating}
            onClick={onClose}
            variant="icon"
          >
            <X aria-hidden="true" size={20} />
          </Button>
        </header>

        <div className={styles.mangaStrip}>
          <span className={styles.mangaCover}>
            <Image alt="" fill sizes="54px" src={manga.cover} />
          </span>
          <span>
            <small>Obra seleccionada</small>
            <strong>{manga.title}</strong>
          </span>
          <BookmarkPlus aria-hidden="true" size={22} />
        </div>

        <div className={styles.controls}>
          <label className={styles.searchField}>
            <Search aria-hidden="true" size={17} />
            <span className={styles.srOnly}>Buscar entre tus listas</span>
            <input
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Buscar entre tus listas…"
              ref={searchRef}
              type="search"
              value={searchQuery}
            />
          </label>
          <Button
            onClick={() => {
              setShowQuickCreate((current) => !current);
              setQuickError(null);
            }}
            size="sm"
            variant="secondary"
          >
            <Plus aria-hidden="true" size={16} />
            Crear lista nueva
          </Button>
        </div>

        {showQuickCreate ? (
          <form className={styles.quickCreate} onSubmit={quickCreate}>
            <label htmlFor="quick-list-name">Crear lista privada</label>
            <div>
              <input
                autoComplete="off"
                id="quick-list-name"
                maxLength={80}
                onChange={(event) => setQuickName(event.target.value)}
                placeholder="Nombre de la nueva lista"
                required
                value={quickName}
              />
              <Button
                disabled={!trimmedQuickName || isCreating}
                size="sm"
                type="submit"
              >
                {isCreating ? "Creando…" : "Crear"}
              </Button>
            </div>
            <span>{quickName.length} / 80 · Privada por defecto</span>
            {quickError ? <p role="alert">{quickError}</p> : null}
          </form>
        ) : null}

        <div className={styles.summary}>
          <span>
            {viewState === "ready"
              ? `${filteredLists.length} ${filteredLists.length === 1 ? "lista disponible" : "listas disponibles"}`
              : "Tus listas"}
          </span>
          <span>
            {finalSet.size
              ? `${finalSet.size} ${finalSet.size === 1 ? "seleccionada" : "seleccionadas"}`
              : "Ninguna seleccionada"}
          </span>
        </div>

        <div className={styles.listViewport}>
          {viewState === "loading" ? (
            <p className={styles.stateMessage} role="status">
              Cargando tus listas…
            </p>
          ) : null}
          {viewState === "error" ? (
            <div className={styles.stateMessage}>
              <p role="alert">{feedback}</p>
              <Button onClick={() => void loadMembership()} size="sm" variant="secondary">
                Reintentar
              </Button>
            </div>
          ) : null}
          {viewState === "ready" && !lists.length ? (
            <div className={styles.stateMessage}>
              <strong>Aún no tienes listas</strong>
              <p>Crea una lista privada y quedará seleccionada para esta obra.</p>
            </div>
          ) : null}
          {viewState === "ready" && lists.length && !filteredLists.length ? (
            <div className={styles.stateMessage}>
              <strong>No encontramos listas</strong>
              <p>Prueba con otro nombre. Tu selección actual se conserva.</p>
            </div>
          ) : null}
          {viewState === "ready" ? (
            <ul aria-label="Tus listas" className={styles.listRows}>
              {filteredLists.map((list) => (
                <li key={list.id}>
                  <label className={styles.listRow} data-selected={finalSet.has(list.id)}>
                    <input
                      checked={finalSet.has(list.id)}
                      disabled={isSaving}
                      onChange={() => toggleList(list.id)}
                      type="checkbox"
                    />
                    <span aria-hidden="true" className={styles.previewGrid}>
                      {list.previewItems.slice(0, 4).map((preview) => (
                        <i key={preview.id}>
                          {preview.coverUrl ? (
                            <Image alt="" fill sizes="28px" src={preview.coverUrl} />
                          ) : null}
                        </i>
                      ))}
                    </span>
                    <span className={styles.listCopy}>
                      <strong>{list.name}</strong>
                      <small>{list.itemCount} obras</small>
                    </span>
                    <span className={styles.visibility}>
                      {list.visibility === "private" ? (
                        <LockKeyhole aria-hidden="true" size={12} />
                      ) : null}
                      {visibilityLabels[list.visibility]}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        {feedback && viewState === "ready" ? (
          <p className={styles.feedback} role="status">
            {feedback}
          </p>
        ) : null}

        <footer className={styles.footer}>
          <span>Solo se enviarán las listas que cambiaste.</span>
          <div>
            <Button disabled={isSaving || isCreating} onClick={onClose} variant="secondary">
              Cancelar
            </Button>
            <Button
              disabled={!isDirty || isSaving || isCreating || viewState !== "ready"}
              onClick={() => void saveMembership()}
            >
              {isSaving ? "Guardando…" : "Guardar selección"}
            </Button>
          </div>
        </footer>
      </section>
    </div>
  );
}
