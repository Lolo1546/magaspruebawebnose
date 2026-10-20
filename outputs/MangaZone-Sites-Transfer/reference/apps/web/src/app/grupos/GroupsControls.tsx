"use client";

import { Grid2X2, List, Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import type { FormEvent, ReactNode } from "react";

import styles from "@/components/social/DirectoryControls.module.css";
import { Button } from "@/components/ui/Button";
import { SearchField } from "@/components/ui/SearchField";
import { Select } from "@/components/ui/Select";

import {
  createGroupsHref,
  groupSortOptions,
  type GroupsFilters,
  type GroupsView,
} from "./groups-catalog";
import localStyles from "./GroupsControls.module.css";

export function GroupsControls({
  children,
  filters,
  resultCount,
}: {
  children: ReactNode;
  filters: GroupsFilters;
  resultCount: number;
}) {
  const router = useRouter();

  function navigate(updates: Partial<GroupsFilters>) {
    router.push(createGroupsHref(filters, updates), { scroll: false });
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const q = data.get("q");
    const language = data.get("language");
    navigate({
      language: typeof language === "string" ? language.trim() : "",
      page: 1,
      q: typeof q === "string" ? q.trim() : "",
    });
  }

  function setView(view: GroupsView) {
    navigate({ view });
  }

  return (
    <section aria-label="Directorio de grupos" className={styles.experience}>
      <div className={styles.toolbar}>
        <form
          className={`${styles.searchForm} ${localStyles.searchForm}`}
          onSubmit={submitSearch}
          role="search"
        >
          <SearchField
            className={localStyles.field}
            defaultValue={filters.q}
            key={`q-${filters.q}`}
            label="Buscar grupos"
            maxLength={80}
            name="q"
            placeholder="Nombre del grupo"
            visuallyHideLabel
          />
          <SearchField
            className={localStyles.field}
            defaultValue={filters.language}
            key={`language-${filters.language}`}
            label="Idioma del grupo"
            maxLength={35}
            name="language"
            placeholder="Idioma, ej. es-LA"
            visuallyHideLabel
          />
          <Button
            aria-label="Buscar grupos"
            size="sm"
            type="submit"
            variant="secondary"
          >
            <Search aria-hidden="true" size={17} />
            <span className={styles.searchLabel}>Buscar</span>
          </Button>
          {filters.q || filters.language ? (
            <Button
              aria-label="Limpiar búsqueda"
              onClick={() => navigate({ language: "", page: 1, q: "" })}
              size="sm"
              variant="icon"
            >
              <X aria-hidden="true" size={17} />
            </Button>
          ) : null}
        </form>

        <Select
          className={styles.select}
          label="Ordenar grupos"
          onChange={(event) =>
            navigate({
              page: 1,
              sort: event.target.value === "recent" ? "recent" : "name",
            })
          }
          value={filters.sort}
          visuallyHideLabel
        >
          {groupSortOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>

        <div
          aria-label="Vista de grupos"
          className={styles.viewToggle}
          role="group"
        >
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

      <p aria-live="polite" className={styles.resultSummary}>
        {resultCount === 1
          ? "1 grupo verificado"
          : `${resultCount} grupos verificados`}
      </p>
      {children}
    </section>
  );
}
