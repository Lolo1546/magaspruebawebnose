import { ArrowRight, BookOpen } from "lucide-react";
import Image from "@/components/manga/MangaCoverImage";
import Link from "next/link";

import { EmptyState, NoResults } from "@/components/feedback/FeedbackState";
import { MangaCard } from "@/components/manga/MangaCard";
import { Chip, type ChipVariant } from "@/components/ui/Chip";
import { libraryStatusLabels, type LibraryStatus } from "@/data/library";

import type { LibraryFilters, LibraryItem } from "./library-catalog";
import styles from "./LibraryResults.module.css";

const statusVariants: Readonly<Record<LibraryStatus, ChipVariant>> = {
  completed: "success",
  dropped: "danger",
  paused: "warning",
  planned: "default",
  reading: "gold",
};

export function LibraryResults({
  filters,
  items,
}: {
  filters: LibraryFilters;
  items: readonly LibraryItem[];
}) {
  if (!items.length) {
    if (!filters.q && filters.status === "all") {
      return (
        <EmptyState
          description="Cuando guardes una obra aparecerá aquí con su estado y progreso de lectura."
          primaryAction={<Link className={styles.clearLink} href="/explorar">Explorar catálogo</Link>}
          title="Tu biblioteca está vacía"
        />
      );
    }

    return (
      <NoResults
        description="Prueba otro estado o vuelve a mostrar toda tu colección local."
        primaryAction={<Link className={styles.clearLink} href="/biblioteca">Limpiar filtros</Link>}
        title="No hay lecturas que coincidan"
      />
    );
  }

  return filters.view === "grid" ? <LibraryGrid items={items} /> : <LibraryList items={items} />;
}

function ContinueLink({ item }: { item: LibraryItem }) {
  const href = `/manga/${item.manga.slug}`;

  return (
    <Link
      aria-label={`Ver ficha de ${item.manga.title}`}
      className={styles.continueLink}
      href={href}
    >
      Ver ficha
      <ArrowRight aria-hidden="true" size={15} />
    </Link>
  );
}

function CollectionDetail({ item }: { item: LibraryItem }) {
  return (
    <div className={styles.collectionDetail}>
      <div className={styles.statusRow}>
        <Chip variant={statusVariants[item.entry.status]}>
          {libraryStatusLabels[item.entry.status]}
        </Chip>
        <ContinueLink item={item} />
      </div>
    </div>
  );
}

function LibraryGrid({ items }: { items: readonly LibraryItem[] }) {
  return (
    <ul aria-label="Mangas de tu biblioteca" className={styles.grid}>
      {items.map((item) => (
        <li className={styles.gridItem} key={item.manga.slug}>
          <MangaCard item={item.manga} />
          <CollectionDetail item={item} />
        </li>
      ))}
    </ul>
  );
}

function LibraryList({ items }: { items: readonly LibraryItem[] }) {
  return (
    <ul aria-label="Mangas de tu biblioteca" className={styles.list}>
      {items.map((item) => (
        <li key={item.manga.slug}>
          <article className={styles.listItem}>
            <Link className={styles.coverLink} href={`/manga/${item.manga.slug}`}>
              <Image
                alt={`Portada de ${item.manga.title}`}
                fill
                sizes="72px"
                src={item.manga.cover}
              />
            </Link>
            <div className={styles.listCopy}>
              <span className={styles.meta}>{item.manga.type} · {item.manga.genre}</span>
              <h2><Link href={`/manga/${item.manga.slug}`}>{item.manga.title}</Link></h2>
              <CollectionDetail item={item} />
            </div>
            <BookOpen aria-hidden="true" className={styles.rowIcon} size={22} />
          </article>
        </li>
      ))}
    </ul>
  );
}
