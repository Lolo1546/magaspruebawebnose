import { CalendarDays, Star } from "lucide-react";
import Image from "@/components/manga/MangaCoverImage";
import Link from "next/link";

import { NoResults } from "@/components/feedback/FeedbackState";
import { MangaCardGrid } from "@/components/manga/MangaCard";
import { Chip } from "@/components/ui/Chip";
import type { ExploreManga } from "@/data/explore";

import {
  createExploreHref,
  type ExploreFilters,
  type ExplorePageResult,
} from "./explore-catalog";
import styles from "./ExploreResults.module.css";

type ExploreResultsProps = {
  filters: ExploreFilters;
  result: ExplorePageResult;
};

export function ExploreResults({ filters, result }: ExploreResultsProps) {
  if (!result.total) {
    const hasActiveFilters =
      !!filters.q ||
      filters.genre !== "all" ||
      filters.status !== "all" ||
      filters.type !== "all";

    if (hasActiveFilters) {
      return (
        <NoResults
          className={styles.noResults}
          description="Prueba otra búsqueda o vuelve al catálogo completo para descubrir más historias."
          primaryAction={
            <Link className={styles.clearLink} href="/explorar">
              Limpiar filtros
            </Link>
          }
          title="No encontramos coincidencias"
        />
      );
    } else {
      return (
        <NoResults
          className={styles.noResults}
          description="El catálogo de MangaZone está vacío en este momento. Vuelve más tarde."
          title="Catálogo vacío"
        />
      );
    }
  }

  return (
    <section aria-labelledby="explore-results-title">
      <div className={styles.heading}>
        <div>
          <p className={styles.eyebrow}>Selección actual</p>
          <h2 id="explore-results-title">Catálogo</h2>
        </div>
        <span>
          Página {result.page} de {result.pageCount}
        </span>
      </div>

      {filters.view === "grid" ? (
        <MangaCardGrid ariaLabel="Resultados del catálogo" items={result.items} />
      ) : (
        <ExploreList items={result.items} />
      )}

      {result.pageCount > 1 ? (
        <nav aria-label="Paginación del catálogo" className={styles.pagination}>
          {Array.from({ length: result.pageCount }, (_, index) => index + 1).map(
            (page) => (
              <Link
                aria-current={page === result.page ? "page" : undefined}
                href={createExploreHref(filters, { page })}
                key={page}
              >
                <span className={styles.visuallyHidden}>Ir a la página </span>
                {page}
              </Link>
            ),
          )}
        </nav>
      ) : null}
    </section>
  );
}

function ExploreList({ items }: { items: readonly ExploreManga[] }) {
  return (
    <ul aria-label="Resultados del catálogo" className={styles.list}>
      {items.map((item) => (
        <li key={item.id}>
          <article className={styles.listCard}>
            <Link
              aria-label={`Ver ficha de ${item.title}`}
              className={styles.listLink}
              href={`/manga/${item.slug}`}
            >
              <span className={styles.cover}>
                <Image
                  alt={`Portada de demostración de ${item.title}`}
                  fill
                  sizes="(max-width: 540px) 74px, 96px"
                  src={item.cover}
                />
              </span>
              <span className={styles.listBody}>
                <span className={styles.listTopline}>
                  <Chip variant="glass">{item.type}</Chip>
                  <span className={styles.score}>
                    <Star aria-hidden="true" fill="currentColor" size={13} />
                    {item.score.toFixed(1)}
                  </span>
                </span>
                <span className={styles.listTitle}>{item.title}</span>
                <span className={styles.genres}>{item.genres.join(" · ")}</span>
                <span className={styles.listMeta}>
                  <span>{item.status}</span>
                  <span>
                    <CalendarDays aria-hidden="true" size={14} />
                    {item.year}
                  </span>
                  <span>Cap. {item.latestChapter}</span>
                </span>
              </span>
            </Link>
          </article>
        </li>
      ))}
    </ul>
  );
}
