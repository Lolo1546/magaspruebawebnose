import Link from "next/link";

import { EmptyState, NoResults } from "@/components/feedback/FeedbackState";
import type { ScanlationGroupsPage } from "@/data/scanlation-groups";

import { GroupCard } from "./GroupCard";
import {
  createGroupsHref,
  hasGroupsFilters,
  type GroupsFilters,
} from "./groups-catalog";
import styles from "./GroupsResults.module.css";

export function GroupsResults({
  filters,
  result,
}: {
  filters: GroupsFilters;
  result: ScanlationGroupsPage;
}) {
  if (!result.total) {
    if (hasGroupsFilters(filters)) {
      return (
        <NoResults
          description="Prueba otro nombre o código de idioma."
          primaryAction={
            <Link className={styles.clearLink} href="/grupos">
              Limpiar filtros
            </Link>
          }
          title="No encontramos grupos"
        />
      );
    }

    return (
      <EmptyState
        description="Los grupos verificados aparecerán aquí cuando haya contenido público disponible."
        title="Directorio aún vacío"
      />
    );
  }

  return (
    <section aria-labelledby="all-groups-title" className={styles.results}>
      <div className={styles.sectionHeading}>
        <div>
          <p>Directorio público</p>
          <h2 id="all-groups-title">Grupos verificados</h2>
        </div>
        <span>
          Página {result.page} de {result.pageCount}
        </span>
      </div>

      <ul
        aria-label="Grupos públicos"
        className={styles.groupList}
        data-view={filters.view}
      >
        {result.items.map((group) => (
          <li key={group.id}>
            <GroupCard group={group} view={filters.view} />
          </li>
        ))}
      </ul>

      {result.pageCount > 1 ? (
        <nav aria-label="Paginación de grupos" className={styles.pagination}>
          {result.page > 1 ? (
            <Link href={createGroupsHref(filters, { page: result.page - 1 })}>
              Anterior
            </Link>
          ) : (
            <span aria-disabled="true">Anterior</span>
          )}
          <span aria-live="polite">
            Página {result.page} de {result.pageCount}
          </span>
          {result.page < result.pageCount ? (
            <Link href={createGroupsHref(filters, { page: result.page + 1 })}>
              Siguiente
            </Link>
          ) : (
            <span aria-disabled="true">Siguiente</span>
          )}
        </nav>
      ) : null}
    </section>
  );
}
