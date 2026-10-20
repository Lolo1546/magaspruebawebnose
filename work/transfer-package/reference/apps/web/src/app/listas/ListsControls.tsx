"use client";

import { Grid2X2, List, Plus, Search, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState, type FormEvent, type ReactNode } from "react";

import { Button } from "@/components/ui/Button";
import { SearchField } from "@/components/ui/SearchField";
import { Select } from "@/components/ui/Select";
import { createUpdatedSearchHref } from "@/utils/search-params";

import { CreateListModal } from "./CreateListModal";
import { listsSortOptions, type ListsFilters, type ListsView } from "./lists-catalog";
import styles from "./ListsControls.module.css";

const navigationDefaults = { sort: "recent", view: "grid", visibility: "all" };

export function ListsControls({
  children,
  csrfToken,
  filters,
  resultCount,
}: {
  children: ReactNode;
  csrfToken: string;
  filters: ListsFilters;
  resultCount: number;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const closeCreateModal = useCallback(() => setIsCreateOpen(false), []);

  function navigate(updates: Readonly<Record<string, string | null>>) {
    router.push(
      createUpdatedSearchHref(pathname, searchParams.toString(), updates, navigationDefaults),
      { scroll: false },
    );
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = new FormData(event.currentTarget).get("q");
    navigate({ q: typeof value === "string" ? value.trim() : null });
  }

  function setView(view: ListsView) {
    navigate({ view });
  }

  return (
    <section aria-label="Controles de listas" className={styles.experience}>
      <div className={styles.toolbar}>
        <form className={styles.searchForm} onSubmit={submitSearch} role="search">
          <SearchField
            defaultValue={filters.q}
            key={filters.q}
            label="Buscar listas"
            maxLength={80}
            name="q"
            placeholder="Buscar nombre o descripción"
            visuallyHideLabel
          />
          <Button aria-label="Buscar" size="sm" type="submit" variant="secondary">
            <Search aria-hidden="true" size={17} />
            <span className={styles.searchLabel}>Buscar</span>
          </Button>
          {filters.q ? (
            <Button aria-label="Limpiar búsqueda" onClick={() => navigate({ q: null })} size="sm" variant="icon">
              <X aria-hidden="true" size={17} />
            </Button>
          ) : null}
        </form>

        <Select
          className={styles.select}
          label="Visibilidad"
          onChange={(event) => navigate({ visibility: event.target.value })}
          value={filters.visibility}
          visuallyHideLabel
        >
          <option value="all">Todas</option>
          <option value="public">Públicas</option>
          <option value="private">Privadas</option>
        </Select>
        <Select
          className={styles.select}
          label="Ordenar listas"
          onChange={(event) => navigate({ sort: event.target.value })}
          value={filters.sort}
          visuallyHideLabel
        >
          {listsSortOptions.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </Select>
        <div aria-label="Vista de listas" className={styles.viewToggle} role="group">
          <button aria-label="Vista de cuadrícula" aria-pressed={filters.view === "grid"} onClick={() => setView("grid")} type="button">
            <Grid2X2 aria-hidden="true" size={17} />
          </button>
          <button aria-label="Vista de lista" aria-pressed={filters.view === "list"} onClick={() => setView("list")} type="button">
            <List aria-hidden="true" size={18} />
          </button>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} size="sm">
          <Plus aria-hidden="true" size={17} />
          Nueva lista
        </Button>
      </div>
      <p className={styles.previewNote}>
        La búsqueda, la visibilidad y el orden consultan tus listas guardadas.
      </p>
      <p aria-live="polite" className={styles.resultSummary}>
        {resultCount === 1 ? "1 lista visible" : `${resultCount} listas visibles`}
      </p>
      {children}
      {isCreateOpen ? (
        <CreateListModal csrfToken={csrfToken} onClose={closeCreateModal} />
      ) : null}
    </section>
  );
}
