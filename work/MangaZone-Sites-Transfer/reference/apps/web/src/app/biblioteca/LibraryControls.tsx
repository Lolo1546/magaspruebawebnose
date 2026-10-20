"use client";

import { Grid2X2, List, Search, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { FormEvent, ReactNode } from "react";

import { Button } from "@/components/ui/Button";
import { SearchField } from "@/components/ui/SearchField";
import { Select } from "@/components/ui/Select";
import { libraryStatusLabels } from "@/data/library";
import { createUpdatedSearchHref } from "@/utils/search-params";

import {
  librarySortOptions,
  type LibraryFilters,
  type LibraryStatusFilter,
  type LibraryView,
} from "./library-catalog";
import styles from "./LibraryControls.module.css";

const navigationDefaults = { sort: "recent", status: "all", view: "grid" };
const statusOptions: readonly { label: string; value: LibraryStatusFilter }[] = [
  { label: "Todos", value: "all" },
  ...Object.entries(libraryStatusLabels).map(([value, label]) => ({
    label,
    value: value as LibraryStatusFilter,
  })),
];

export function LibraryControls({
  children,
  filters,
  resultCount,
}: {
  children: ReactNode;
  filters: LibraryFilters;
  resultCount: number;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

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

  function setView(view: LibraryView) {
    navigate({ view });
  }

  return (
    <section aria-label="Controles de biblioteca" className={styles.experience}>
      <div className={styles.toolbar}>
        <form className={styles.searchForm} onSubmit={submitSearch} role="search">
          <SearchField
            defaultValue={filters.q}
            key={filters.q}
            label="Buscar en tu biblioteca"
            maxLength={80}
            name="q"
            placeholder="Buscar título, género o formato"
            visuallyHideLabel
          />
          <Button aria-label="Buscar" size="sm" type="submit" variant="secondary">
            <Search aria-hidden="true" size={17} />
            <span className={styles.searchLabel}>Buscar</span>
          </Button>
          {filters.q ? (
            <Button
              aria-label="Limpiar búsqueda"
              onClick={() => navigate({ q: null })}
              size="sm"
              variant="icon"
            >
              <X aria-hidden="true" size={17} />
            </Button>
          ) : null}
        </form>

        <Select
          className={styles.sortSelect}
          label="Ordenar biblioteca"
          onChange={(event) => navigate({ sort: event.target.value })}
          value={filters.sort}
          visuallyHideLabel
        >
          {librarySortOptions.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </Select>

        <div aria-label="Vista de biblioteca" className={styles.viewToggle} role="group">
          <button
            aria-label="Vista de cuadrícula"
            aria-pressed={filters.view === "grid"}
            onClick={() => setView("grid")}
            type="button"
          >
            <Grid2X2 aria-hidden="true" size={17} />
          </button>
          <button
            aria-label="Vista de lista"
            aria-pressed={filters.view === "list"}
            onClick={() => setView("list")}
            type="button"
          >
            <List aria-hidden="true" size={18} />
          </button>
        </div>
      </div>

      <div aria-label="Estado de lectura" className={styles.statusFilters} role="group">
        {statusOptions.map((option) => (
          <button
            aria-pressed={filters.status === option.value}
            key={option.value}
            onClick={() => navigate({ status: option.value })}
            type="button"
          >
            {option.label}
          </button>
        ))}
      </div>

      <p aria-live="polite" className={styles.resultSummary}>
        {resultCount === 1 ? "1 manga visible" : `${resultCount} mangas visibles`}
      </p>
      {children}
    </section>
  );
}
