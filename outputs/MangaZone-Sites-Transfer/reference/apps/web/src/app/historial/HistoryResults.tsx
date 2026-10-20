"use client";

import { ArrowRight, Clock3, ShieldCheck } from "lucide-react";
import Image from "@/components/manga/MangaCoverImage";
import Link from "next/link";

import { EmptyState, NoResults } from "@/components/feedback/FeedbackState";
import { ReadingProgress } from "@/components/manga/ReadingProgress";
import { READER_PAGE_COUNT } from "@/data/reader";

import type { HistoryFilters } from "./history-catalog";
import styles from "./HistoryResults.module.css";
import type { HistoryItem, HistoryResponse } from "@/data/reading.server";
import { usePathname, useSearchParams } from "next/navigation";
import { createUpdatedSearchHref } from "@/utils/search-params";
import { useMemo } from "react";

function groupItemsByLocalTime(items: readonly HistoryItem[]) {
  const groups = new Map<string, HistoryItem[]>();
  const now = new Date();

  // start of today
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // start of yesterday
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  // start of this week (monday)
  const thisWeek = new Date(today);
  const day = thisWeek.getDay();
  thisWeek.setDate(thisWeek.getDate() - day + (day === 0 ? -6 : 1));

  // start of this month
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  for (const item of items) {
    const readAt = new Date(item.reading.lastReadAt);
    let label = "Anteriores";

    if (readAt >= today) {
      label = "Hoy";
    } else if (readAt >= yesterday) {
      label = "Ayer";
    } else if (readAt >= thisWeek) {
      label = "Esta semana";
    } else if (readAt >= thisMonth) {
      label = "Este mes";
    }

    const group = groups.get(label) ?? [];
    group.push(item);
    groups.set(label, group);
  }

  // Preserve order: Hoy > Ayer > Esta semana > Este mes > Anteriores
  const order = ["Hoy", "Ayer", "Esta semana", "Este mes", "Anteriores"];
  return Array.from(groups.entries())
    .sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0]))
    .map(([label, entries]) => ({ label, entries }));
}

export function HistoryResults({
  filters,
  apiData,
}: {
  filters: HistoryFilters;
  apiData: HistoryResponse | null;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const items = apiData?.items;

  const groupedItems = useMemo(() => groupItemsByLocalTime(items ?? []), [items]);

  if (!items || !items.length) {
    if (!filters.q && filters.period === "all") {
      return (
        <EmptyState
          description="Las lecturas recientes aparecerán aquí cuando exista historial real de cuenta."
          primaryAction={<Link className={styles.clearLink} href="/explorar">Explorar catálogo</Link>}
          title="Aún no hay historial"
        />
      );
    }

    return (
      <NoResults
        description="Cambia el periodo o vuelve a mostrar toda la cronología local."
        primaryAction={<Link className={styles.clearLink} href="/historial">Limpiar filtros</Link>}
        title="No hay lecturas que coincidan"
      />
    );
  }

  return (
    <div className={styles.layout}>
      <div className={styles.timeline}>
        {groupedItems.map((group, index) => {
          const headingId = `history-group-${index}`;
          return (
            <section aria-labelledby={headingId} key={group.label}>
              <div className={styles.groupHeading}>
                <span aria-hidden="true" />
                <h2 id={headingId}>{group.label}</h2>
                <small>{group.entries.length} {group.entries.length === 1 ? "lectura" : "lecturas"}</small>
              </div>
              <ul className={styles.entries}>
                {group.entries.map((item) => <HistoryRow item={item} key={`${item.manga.id}-${item.chapter.id}`} />)}
              </ul>
            </section>
          );
        })}
        {apiData && apiData.totalPages > 1 && (
            <div className={styles.pager}>
              <Link
                aria-disabled={apiData.page <= 1}
                className={apiData.page <= 1 ? styles.disabledLink : ''}
                href={createUpdatedSearchHref(pathname, searchParams.toString(), { page: String(apiData.page - 1) }, {})}
                onClick={(e) => { if (apiData.page <= 1) e.preventDefault(); }}
              >
                Anterior
              </Link>
              <span>Página {apiData.page} de {apiData.totalPages}</span>
              <Link
                aria-disabled={apiData.page >= apiData.totalPages}
                className={apiData.page >= apiData.totalPages ? styles.disabledLink : ''}
                href={createUpdatedSearchHref(pathname, searchParams.toString(), { page: String(apiData.page + 1) }, {})}
                onClick={(e) => { if (apiData.page >= apiData.totalPages) e.preventDefault(); }}
              >
                Siguiente
              </Link>
            </div>
          )}
      </div>

      <aside aria-label="Información del historial" className={styles.summary}>
        <ShieldCheck aria-hidden="true" size={23} />
        <h2>Historial real de cuenta</h2>
        <p>Tus lecturas sincronizadas en todos tus dispositivos.</p>
        <dl>
          <div><dt>Lecturas visibles</dt><dd>{(items ?? []).length}</dd></div>
          <div><dt>Capítulos completos</dt><dd>{(items ?? []).filter((item) => item.reading.progressPercent === 100).length}</dd></div>
        </dl>
      </aside>
    </div>
  );
}

function HistoryRow({ item }: { item: HistoryItem }) {
  const readerHref = item.release?.id
    ? `/manga/${item.manga.slug}/capitulo/${item.chapter.readerKey}?release=${item.release.id}&page=${item.reading.lastPageNumber}`
    : `/manga/${item.manga.slug}/capitulo/${item.chapter.readerKey}?page=${item.reading.lastPageNumber}`;

  return (
    <li>
      <article className={styles.entry}>
        <Link className={styles.cover} href={`/manga/${item.manga.slug}`}>
          <Image alt={`Portada de ${item.manga.title}`} fill sizes="68px" src={item.manga.coverUrl || '/demo/cover-placeholder.svg'} />
        </Link>
        <div className={styles.copy}>
          <div className={styles.topline}>
            <span><Clock3 aria-hidden="true" size={13} />Última lectura: {new Date(item.reading.lastReadAt).toLocaleDateString()}</span>
          </div>
          <h3><Link href={`/manga/${item.manga.slug}`}>{item.manga.title}</Link></h3>
          <p>Capítulo {item.chapter.label} · página {item.reading.lastPageNumber}</p>
          <ReadingProgress
            current={item.reading.lastPageNumber}
            label={`Progreso del capítulo ${item.chapter.label}`}
            percentage={item.reading.progressPercent}
            total={Math.max(item.reading.lastPageNumber, READER_PAGE_COUNT)} // total can be just a visual approx or not shown if we don't know total
            unitLabel="Página"
          />
        </div>
        <Link aria-label={`Continuar ${item.manga.title}, capítulo ${item.chapter.label}`} className={styles.continueLink} href={readerHref}>
          Continuar <ArrowRight aria-hidden="true" size={16} />
        </Link>
      </article>
    </li>
  );
}
