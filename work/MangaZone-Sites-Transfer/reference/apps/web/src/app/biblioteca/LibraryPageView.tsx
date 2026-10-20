import { BookMarked } from "lucide-react";

import { PageContainer } from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";

import { LibraryControls } from "./LibraryControls";
import { type LibraryFilters, type LibraryItem } from "./library-catalog";
import type { ApiLibraryStats } from "./api.server";
import { LibraryResults } from "./LibraryResults";
import styles from "./LibraryPage.module.css";

export function LibraryPageView({ filters, items, stats }: { filters: LibraryFilters; items: LibraryItem[]; stats: ApiLibraryStats }) {

  return (
    <PageContainer className={styles.page}>
      <PageHero
        description="Tu espacio de lectura: consulta el estado de cada obra y vuelve a su ficha."
        eyebrow="Colección personal"
        stats={[
          { label: "guardados", value: stats.total },
          { label: "leyendo", value: stats.reading },
          { label: "pendientes", value: stats.planned },
          { label: "completados", value: stats.completed },
        ]}
        title="Biblioteca"
        visual={<BookMarked className={styles.heroIcon} strokeWidth={1.1} />}
      />

      <LibraryControls filters={filters} resultCount={items.length}>
        <LibraryResults filters={filters} items={items} />
      </LibraryControls>
    </PageContainer>
  );
}
