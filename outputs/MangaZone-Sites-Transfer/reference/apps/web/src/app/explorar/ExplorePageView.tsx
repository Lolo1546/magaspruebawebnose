import { Compass } from "lucide-react";

import { PageContainer } from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";
import { exploreGenres } from "@/data/explore"; // keep genres for stats

import { ExploreControls } from "./ExploreControls";
import { type ExploreFilters, type ExplorePageResult } from "./explore-catalog";
import { ExploreResults } from "./ExploreResults";
import styles from "./ExplorePage.module.css";

type ExplorePageViewProps = {
  filters: ExploreFilters;
  catalogPage: ExplorePageResult;
};

export function ExplorePageView({ filters, catalogPage }: ExplorePageViewProps) {
  return (
    <PageContainer className={styles.page}>
      <PageHero
        description="Busca nuevas historias y afina el catálogo por formato, estado o género. Los filtros quedan en la URL para que puedas compartir tu selección."
        eyebrow="Catálogo MangaZone"
        stats={[
          { label: "obras disponibles", value: catalogPage.total },
          { label: "géneros", value: exploreGenres.length },
          { label: "formatos", value: 3 },
        ]}
        title="Explorar"
        visual={<Compass className={styles.heroIcon} strokeWidth={1.1} />}
      />

      <ExploreControls filters={filters} resultCount={catalogPage.total}>
        <ExploreResults filters={filters} result={catalogPage} />
      </ExploreControls>
    </PageContainer>
  );
}
