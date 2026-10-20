import { Layers3 } from "lucide-react";

import { PageContainer } from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";
import type { UserList } from "@/data/lists";

import { getListsStats, type ListsFilters } from "./lists-catalog";
import { ListsControls } from "./ListsControls";
import { ListsResults } from "./ListsResults";
import styles from "./ListsPage.module.css";

export function ListsPageView({
  csrfToken,
  filters,
  lists,
}: {
  csrfToken: string;
  filters: ListsFilters;
  lists: readonly UserList[];
}) {
  const stats = getListsStats(lists);

  return (
    <PageContainer className={styles.page}>
      <PageHero
        description="Agrupa tus lecturas por tema y organiza colecciones personales que podrás ampliar desde cada manga."
        eyebrow="Colecciones personalizadas"
        stats={[
          { label: "listas", value: stats.total },
          { label: "públicas", value: stats.publicCount },
          { label: "privadas", value: stats.privateCount },
          { label: "obras", value: stats.totalManga },
        ]}
        title="Listas"
        visual={<Layers3 className={styles.heroIcon} strokeWidth={1.1} />}
      />

      <ListsControls csrfToken={csrfToken} filters={filters} resultCount={lists.length}>
        <ListsResults filters={filters} lists={lists} />
      </ListsControls>
    </PageContainer>
  );
}
