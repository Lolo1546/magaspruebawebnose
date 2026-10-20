"use client";

import { Globe2, Link2, LockKeyhole, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/Button";
import {
  createList,
  ListsMutationError,
  type CreateListInput,
} from "@/data/lists.client";
import type { ApiListVisibility } from "@/data/lists";

import styles from "./CreateListModal.module.css";

const visibilityOptions: readonly {
  description: string;
  icon: typeof LockKeyhole;
  label: string;
  value: ApiListVisibility;
}[] = [
  {
    description: "Solo tú podrás acceder a esta lista.",
    icon: LockKeyhole,
    label: "Privada",
    value: "PRIVATE",
  },
  {
    description: "Solo quienes tengan el enlace podrán verla.",
    icon: Link2,
    label: "No listada",
    value: "UNLISTED",
  },
  {
    description: "Visible en tu perfil y compartible.",
    icon: Globe2,
    label: "Pública",
    value: "PUBLIC",
  },
];

const visibilityLabel: Readonly<Record<ApiListVisibility, string>> = {
  PRIVATE: "Privada",
  PUBLIC: "Pública",
  UNLISTED: "No listada",
};

export function CreateListModal({
  csrfToken,
  onClose,
}: {
  csrfToken: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const titleId = useId();
  const descriptionId = useId();
  const errorId = useId();
  const nameInputRef = useRef<HTMLInputElement>(null);
  const pendingRef = useRef(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<ApiListVisibility>("PRIVATE");
  const [isPending, setIsPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const previousFocus = document.activeElement;
    nameInputRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !pendingRef.current) {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      if (previousFocus instanceof HTMLElement) previousFocus.focus();
    };
  }, [onClose]);

  const trimmedName = name.trim();
  const trimmedDescription = description.trim();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!trimmedName || pendingRef.current) return;

    const payload: CreateListInput = {
      name: trimmedName,
      visibility,
      ...(trimmedDescription ? { description: trimmedDescription } : {}),
    };

    setErrorMessage(null);
    pendingRef.current = true;
    setIsPending(true);
    try {
      await createList(payload, csrfToken);
      onClose();
      router.refresh();
    } catch (error) {
      if (error instanceof ListsMutationError && error.status === 401) {
        setErrorMessage("Tu sesión expiró. Inicia sesión para crear la lista.");
        router.push("/login");
      } else if (error instanceof ListsMutationError && error.status === 403) {
        setErrorMessage("No pudimos validar la solicitud. Actualiza la página e inténtalo de nuevo.");
      } else if (error instanceof ListsMutationError && error.status === 400) {
        setErrorMessage("Revisa el nombre, la descripción y la visibilidad.");
      } else {
        setErrorMessage("No pudimos crear la lista. Inténtalo de nuevo.");
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
        if (event.target === event.currentTarget && !isPending) onClose();
      }}
    >
      <section
        aria-describedby={descriptionId}
        aria-labelledby={titleId}
        aria-modal="true"
        className={styles.dialog}
        role="dialog"
      >
        <div className={styles.formSide}>
          <header className={styles.header}>
            <div>
              <span className={styles.kicker}>Nueva colección</span>
              <h2 id={titleId}>Crear lista</h2>
              <p id={descriptionId}>Crea la colección ahora y añade mangas después.</p>
            </div>
            <Button
              aria-label="Cerrar creación de lista"
              disabled={isPending}
              onClick={onClose}
              size="md"
              variant="icon"
            >
              <X aria-hidden="true" size={20} />
            </Button>
          </header>

          <form aria-describedby={errorMessage ? errorId : undefined} onSubmit={submit}>
            <div className={styles.formFields}>
              <div className={styles.fieldGroup}>
                <div className={styles.labelRow}>
                  <label htmlFor="create-list-name">Nombre de la lista</label>
                  <span>{name.length} / 80</span>
                </div>
                <input
                  autoComplete="off"
                  id="create-list-name"
                  maxLength={80}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Ej. Fantasía oscura imprescindible"
                  ref={nameInputRef}
                  required
                  value={name}
                />
                <small>Debe ser claro y fácil de reconocer.</small>
              </div>

              <div className={styles.fieldGroup}>
                <div className={styles.labelRow}>
                  <label htmlFor="create-list-description">Descripción</label>
                  <span>{description.length} / 255</span>
                </div>
                <textarea
                  id="create-list-description"
                  maxLength={255}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Cuenta brevemente qué reúne esta lista…"
                  value={description}
                />
              </div>

              <fieldset className={styles.visibilityGroup}>
                <legend>Visibilidad</legend>
                <div className={styles.visibilityGrid}>
                  {visibilityOptions.map((option) => {
                    const Icon = option.icon;
                    return (
                      <label className={styles.visibilityOption} key={option.value}>
                        <input
                          checked={visibility === option.value}
                          name="visibility"
                          onChange={() => setVisibility(option.value)}
                          type="radio"
                          value={option.value}
                        />
                        <span className={styles.visibilityCard}>
                          <span className={styles.visibilityIcon}>
                            <Icon aria-hidden="true" size={18} />
                          </span>
                          <strong>{option.label}</strong>
                          <small>{option.description}</small>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>

              {errorMessage ? (
                <p className={styles.error} id={errorId} role="alert">
                  {errorMessage}
                </p>
              ) : null}
            </div>

            <footer className={styles.footer}>
              <p>Podrás editar el contenido de la lista en una fase posterior.</p>
              <div className={styles.actions}>
                <Button disabled={isPending} onClick={onClose} variant="secondary">
                  Cancelar
                </Button>
                <Button disabled={!trimmedName || isPending} type="submit">
                  {isPending ? "Creando…" : "Crear lista"}
                </Button>
              </div>
            </footer>
          </form>
        </div>

        <aside aria-label="Vista previa de la lista" className={styles.preview}>
          <span className={styles.previewLabel}>Vista previa</span>
          <article className={styles.previewCard}>
            <div aria-hidden="true" className={styles.previewCover}>
              <i />
              <i />
              <i />
              <i />
              <span>{visibilityLabel[visibility]}</span>
            </div>
            <div className={styles.previewBody}>
              <strong>{trimmedName || "Nombre de tu lista"}</strong>
              <p>
                {trimmedDescription ||
                  "La descripción aparecerá aquí para explicar qué contiene esta colección."}
              </p>
              <span>0 obras</span>
            </div>
          </article>
          <p className={styles.previewTip}>
            La visibilidad controla quién puede encontrar y abrir esta colección.
          </p>
        </aside>
      </section>
    </div>
  );
}
