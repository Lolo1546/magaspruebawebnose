import Link from "next/link";

import { EmptyState, NoResults } from "@/components/feedback/FeedbackState";
import type { PublicCommunitiesPage } from "@/data/communities.public";

import { CommunityCard } from "./CommunityCard";
import { createCommunitiesHref, hasCommunitiesFilters, type CommunitiesFilters } from "./communities-catalog";
import styles from "./CommunitiesResults.module.css";

export function CommunitiesResults({ filters, result }: { filters: CommunitiesFilters; result: PublicCommunitiesPage }) {
  if (!result.total) {
    if (hasCommunitiesFilters(filters)) {
      return <NoResults description="Prueba otro nombre de comunidad." primaryAction={<Link className={styles.clearLink} href="/comunidades">Limpiar filtros</Link>} title="No encontramos comunidades" />;
    }
    return <EmptyState description="Las comunidades públicas aparecerán aquí cuando exista contenido disponible." title="Directorio aún vacío" />;
  }

  return (
    <section aria-labelledby="all-communities-title" className={styles.results}>
      <div className={styles.sectionHeading}><div><p>Directorio público</p><h2 id="all-communities-title">Comunidades</h2></div><span>Página {result.page} de {result.pageCount}</span></div>
      <ul aria-label="Comunidades públicas" className={styles.communityList} data-view={filters.view}>
        {result.items.map((community) => <li key={community.id}><CommunityCard community={community} view={filters.view} /></li>)}
      </ul>
      {result.pageCount > 1 ? (
        <nav aria-label="Paginación de comunidades" className={styles.pagination}>
          {result.page > 1 ? <Link href={createCommunitiesHref(filters, { page: result.page - 1 })}>Anterior</Link> : <span aria-disabled="true">Anterior</span>}
          <span aria-live="polite">Página {result.page} de {result.pageCount}</span>
          {result.page < result.pageCount ? <Link href={createCommunitiesHref(filters, { page: result.page + 1 })}>Siguiente</Link> : <span aria-disabled="true">Siguiente</span>}
        </nav>
      ) : null}
    </section>
  );
}
