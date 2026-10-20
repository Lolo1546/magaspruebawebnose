"use client";

import { Search, Trash2, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { FormEvent, ReactNode } from "react";

import { Button } from "@/components/ui/Button";
import { SearchField } from "@/components/ui/SearchField";
import { Select } from "@/components/ui/Select";
import { createUpdatedSearchHref } from "@/utils/search-params";

import {
  historyPeriodOptions,
  historySortOptions,
  type HistoryFilters,
} from "./history-catalog";
import styles from "./HistoryControls.module.css";
import { getLocalTodayBounds, getLocalWeekBounds, getLocalMonthBounds } from "@/utils/local-time";

const navigationDefaults = { period: "all", sort: "recent" };

export function HistoryControls({
  children,
  filters,
  resultCount,
}: {
  children: ReactNode;
  filters: HistoryFilters;
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
    navigate({ q: typeof value === "string" ? value.trim() : null, page: null });
  }

  return (
    <section aria-label="Controles del historial" className={styles.experience}>
      <div className={styles.toolbar}>
        <form className={styles.searchForm} onSubmit={submitSearch} role="search">
          <SearchField
            defaultValue={filters.q}
            key={filters.q}
            label="Buscar en tu historial"
            maxLength={80}
            name="q"
            placeholder="Buscar manga o capítulo"
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
          label="Periodo"
          onChange={(event) => {
            const period = event.target.value;
            let bounds = { from: null as string | null, to: null as string | null };

            if (period === "today") bounds = getLocalTodayBounds();
            else if (period === "week") bounds = getLocalWeekBounds();
            else if (period === "month") bounds = getLocalMonthBounds();

            // Selecting any filter resets to page 1
            navigate({ period, from: bounds.from, to: bounds.to, page: null });
          }}
          value={filters.period}
          visuallyHideLabel
        >
          {historyPeriodOptions.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </Select>
        <Select
          className={styles.select}
          label="Ordenar historial"
          onChange={(event) => navigate({ sort: event.target.value, page: null })}
          value={filters.sort}
          visuallyHideLabel
        >
          {historySortOptions.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </Select>
        <Button aria-describedby="history-clear-note" disabled size="sm" variant="secondary">
          <Trash2 aria-hidden="true" size={16} />
          Limpiar
        </Button>
      </div>
      <p className={styles.previewNote} id="history-clear-note">
        La limpieza del historial estará disponible cuando exista persistencia de cuenta.
      </p>
      <p aria-live="polite" className={styles.resultSummary}>
        {resultCount === 1 ? "1 lectura visible" : `${resultCount} lecturas visibles`}
      </p>
      {children}
    </section>
  );
}
