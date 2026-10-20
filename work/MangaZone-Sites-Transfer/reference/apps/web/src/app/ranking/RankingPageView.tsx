import { Trophy } from "lucide-react";

import { PageContainer } from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";
import { rankingCategoryLabels, rankingPeriodLabels } from "@/data/ranking";

import { getRankingItems, type RankingFilters } from "./ranking-catalog";
import { RankingControls } from "./RankingControls";
import styles from "./RankingPage.module.css";
import { RankingResults } from "./RankingResults";

export function RankingPageView({ filters }: { filters: RankingFilters }) {
  const items = getRankingItems(filters);

  return (
    <PageContainer className={styles.page}>
      <PageHero
        description="Descubre las obras más leídas, mejor valoradas y con mayor crecimiento dentro de una clasificación local de demostración."
        eyebrow="Lo más destacado de MangaZone"
        stats={[
          { label: "obras clasificadas", value: items.length },
          { label: "categoría", value: rankingCategoryLabels[filters.category] },
          { label: "periodo", value: rankingPeriodLabels[filters.period] },
        ]}
        title="Ranking"
        visual={<Trophy className={styles.heroIcon} strokeWidth={1.1} />}
      />

      <RankingControls filters={filters} />
      <RankingResults filters={filters} items={items} />
    </PageContainer>
  );
}
