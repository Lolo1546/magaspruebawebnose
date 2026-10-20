import Link from "next/link";

import { EmptyState, NoResults } from "@/components/feedback/FeedbackState";
import type { UserList } from "@/data/lists";

import { ListCard } from "./ListCard";
import type { ListsFilters } from "./lists-catalog";
import styles from "./ListsResults.module.css";

export function ListsResults({
  filters,
  lists,
}: {
  filters: ListsFilters;
  lists: readonly UserList[];
}) {
  if (!lists.length) {
    if (!filters.q && filters.visibility === "all") {
      return (
        <EmptyState
          description="Crea tu primera colección para organizar mangas por tema, estado de ánimo o cualquier criterio personal."
          primaryAction={<Link className={styles.clearLink} href="/explorar">Explorar catálogo</Link>}
          title="Aún no tienes listas"
        />
      );
    }

    return (
      <NoResults
        description="Prueba otra búsqueda o vuelve a mostrar todas tus listas."
        primaryAction={<Link className={styles.clearLink} href="/listas">Limpiar filtros</Link>}
        title="No hay listas que coincidan"
      />
    );
  }

  return (
    <ul aria-label="Listas personalizadas" className={styles.results} data-view={filters.view}>
      {lists.map((list) => (
        <li key={list.id}>
          <ListCard list={list} view={filters.view} />
        </li>
      ))}
    </ul>
  );
}
