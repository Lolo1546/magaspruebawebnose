"use client";

import { Grid2X2, List, Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import type { FormEvent, ReactNode } from "react";
import styles from "@/components/social/DirectoryControls.module.css";
import { Button } from "@/components/ui/Button";
import { SearchField } from "@/components/ui/SearchField";
import { Select } from "@/components/ui/Select";
import { communitySortOptions, createCommunitiesHref, type CommunitiesFilters, type CommunitiesView } from "./communities-catalog";

export function CommunitiesControls({ children, filters, resultCount }: { children: ReactNode; filters: CommunitiesFilters; resultCount: number }) {
  const router = useRouter();
  function navigate(updates: Partial<CommunitiesFilters>) { router.push(createCommunitiesHref(filters, updates), { scroll: false }); }
  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = new FormData(event.currentTarget).get("q");
    navigate({ page: 1, q: typeof value === "string" ? value.trim() : "" });
  }
  function setView(view: CommunitiesView) { navigate({ view }); }

  return (
    <section aria-label="Directorio de comunidades" className={styles.experience}>
      <div className={styles.toolbar}>
        <form className={styles.searchForm} onSubmit={submitSearch} role="search">
          <SearchField defaultValue={filters.q} key={filters.q} label="Buscar comunidades" maxLength={80} name="q" placeholder="Nombre de la comunidad" visuallyHideLabel />
          <Button aria-label="Buscar comunidades" size="sm" type="submit" variant="secondary"><Search aria-hidden="true" size={17} /><span className={styles.searchLabel}>Buscar</span></Button>
          {filters.q ? <Button aria-label="Limpiar búsqueda" onClick={() => navigate({ page: 1, q: "" })} size="sm" variant="icon"><X aria-hidden="true" size={17} /></Button> : null}
        </form>
        <Select className={styles.select} label="Ordenar comunidades" onChange={(event) => navigate({ page: 1, sort: event.target.value === "recent" ? "recent" : "name" })} value={filters.sort} visuallyHideLabel>
          {communitySortOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </Select>
        <div aria-label="Vista de comunidades" className={styles.viewToggle} role="group">
          <button aria-label="Vista de cuadrícula" aria-pressed={filters.view === "grid"} onClick={() => setView("grid")} type="button"><Grid2X2 aria-hidden="true" size={17} /></button>
          <button aria-label="Vista de lista" aria-pressed={filters.view === "list"} onClick={() => setView("list")} type="button"><List aria-hidden="true" size={18} /></button>
        </div>
      </div>
      <p aria-live="polite" className={styles.resultSummary}>{resultCount === 1 ? "1 comunidad visible" : `${resultCount} comunidades visibles`}</p>
      {children}
    </section>
  );
}
