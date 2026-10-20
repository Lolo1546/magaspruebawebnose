"use client";

import {
  Filter,
  Grid2X2,
  List,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import {
  useId,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { SearchField } from "@/components/ui/SearchField";
import { Select } from "@/components/ui/Select";
import { exploreGenres } from "@/data/explore";

import {
  exploreSortOptions,
  type ExploreFilters,
  type ExploreGenreFilter,
  type ExploreStatusFilter,
  type ExploreTypeFilter,
  type ExploreView,
} from "./explore-catalog";
import styles from "./ExploreControls.module.css";

type ExploreControlsProps = {
  children: ReactNode;
  filters: ExploreFilters;
  resultCount: number;
};

type ActiveFilter = {
  key: "genre" | "q" | "status" | "type";
  label: string;
};

const typeOptions: readonly { label: string; value: ExploreTypeFilter }[] = [
  { label: "Todos", value: "all" },
  { label: "Manga", value: "Manga" },
  { label: "Manhwa", value: "Manhwa" },
  { label: "Manhua", value: "Manhua" },
  { label: "Webtoon", value: "Webtoon" },
  { label: "Novela", value: "Novela" },
  { label: "Comic", value: "Comic" },
  { label: "One shot", value: "One shot" },
  { label: "Doujinshi", value: "Doujinshi" },
  { label: "OEL", value: "OEL" },
];

const statusOptions: readonly {
  label: string;
  value: ExploreStatusFilter;
}[] = [
  { label: "Todos", value: "all" },
  { label: "En curso", value: "En curso" },
  { label: "Completado", value: "Completado" },
  { label: "Pausado", value: "Pausado" },
];

export function ExploreControls({
  children,
  filters,
  resultCount,
}: ExploreControlsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filterPanelId = useId();
  const [filtersOpen, setFiltersOpen] = useState(false);

  function navigate(
    updates: Readonly<Record<string, string | null>>,
    resetPage = true,
  ) {
    const params = new URLSearchParams(searchParams.toString());

    for (const [key, value] of Object.entries(updates)) {
      if (!value || value === "all" || value === "grid" || value === "popular") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    }

    if (resetPage) params.delete("page");

    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const value = formData.get("q");
    navigate({ q: typeof value === "string" ? value.trim() : null });
  }

  function setView(view: ExploreView) {
    navigate({ view }, false);
  }

  const activeFilters: ActiveFilter[] = [
    ...(filters.q ? [{ key: "q" as const, label: `“${filters.q}”` }] : []),
    ...(filters.type !== "all"
      ? [{ key: "type" as const, label: filters.type }]
      : []),
    ...(filters.status !== "all"
      ? [{ key: "status" as const, label: filters.status }]
      : []),
    ...(filters.genre !== "all"
      ? [{ key: "genre" as const, label: filters.genre }]
      : []),
  ];

  return (
    <section aria-label="Controles del catálogo" className={styles.experience}>
      <div className={styles.toolbar}>
        <form className={styles.searchForm} onSubmit={submitSearch} role="search">
          <SearchField
            defaultValue={filters.q}
            key={filters.q}
            label="Buscar en el catálogo"
            maxLength={80}
            name="q"
            placeholder="Título, género o formato"
            visuallyHideLabel
          />
          <Button aria-label="Buscar" size="sm" type="submit" variant="secondary">
            <Search aria-hidden="true" size={17} />
            <span className={styles.searchButtonLabel}>Buscar</span>
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

        <Button
          aria-controls={filterPanelId}
          aria-expanded={filtersOpen}
          className={styles.mobileFilterButton}
          onClick={() => setFiltersOpen((open) => !open)}
          size="sm"
          variant="secondary"
        >
          <Filter aria-hidden="true" size={17} />
          Filtros
        </Button>

        <Select
          aria-label="Ordenar catálogo"
          className={styles.sortSelect}
          label="Ordenar catálogo"
          onChange={(event) => navigate({ sort: event.target.value })}
          value={filters.sort}
          visuallyHideLabel
        >
          {exploreSortOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>

        <div aria-label="Vista del catálogo" className={styles.viewToggle} role="group">
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

      {activeFilters.length ? (
        <div aria-label="Filtros activos" className={styles.activeFilters}>
          <span className={styles.activeLabel}>Filtros activos</span>
          {activeFilters.map((filter) => (
            <button
              aria-label={`Quitar filtro ${filter.label}`}
              className={styles.activeFilterButton}
              key={filter.key}
              onClick={() => navigate({ [filter.key]: null })}
              type="button"
            >
              <Chip variant="danger">
                {filter.label}
                <X aria-hidden="true" size={13} />
              </Chip>
            </button>
          ))}
          <button
            className={styles.clearAll}
            onClick={() =>
              navigate({ genre: null, q: null, status: null, type: null })
            }
            type="button"
          >
            Limpiar todos
          </button>
        </div>
      ) : null}

      <div className={styles.catalogLayout}>
        <aside
          className={styles.filterPanel}
          data-open={filtersOpen || undefined}
          id={filterPanelId}
        >
          <div className={styles.filterHeading}>
            <div>
              <span className={styles.filterEyebrow}>Afinar catálogo</span>
              <h2>Filtros</h2>
            </div>
            <SlidersHorizontal aria-hidden="true" size={19} />
          </div>

          <FilterButtons
            label="Formato"
            onChange={(value) => navigate({ type: value })}
            options={typeOptions}
            value={filters.type}
          />
          <FilterButtons
            label="Estado"
            onChange={(value) => navigate({ status: value })}
            options={statusOptions}
            value={filters.status}
          />

          <div className={styles.filterGroup}>
            <h3>Género</h3>
            <Select
              label="Género"
              onChange={(event) =>
                navigate({ genre: event.target.value as ExploreGenreFilter })
              }
              value={filters.genre}
              visuallyHideLabel
            >
              <option value="all">Todos los géneros</option>
              {exploreGenres.map((genre) => (
                <option key={genre} value={genre}>
                  {genre}
                </option>
              ))}
            </Select>
          </div>
        </aside>

        <div className={styles.resultsColumn}>
          <p aria-live="polite" className={styles.resultSummary}>
            {resultCount === 1
              ? "1 obra encontrada"
              : `${resultCount} obras encontradas`}
          </p>
          {children}
        </div>
      </div>
    </section>
  );
}

type FilterButtonsProps<T extends string> = {
  label: string;
  onChange: (value: T) => void;
  options: readonly { label: string; value: T }[];
  value: T;
};

function FilterButtons<T extends string>({
  label,
  onChange,
  options,
  value,
}: FilterButtonsProps<T>) {
  return (
    <div className={styles.filterGroup}>
      <h3>{label}</h3>
      <div aria-label={label} className={styles.filterButtons} role="group">
        {options.map((option) => (
          <button
            aria-pressed={option.value === value}
            key={option.value}
            onClick={() => onChange(option.value)}
            type="button"
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
