import { History } from "lucide-react";

import type { HistoryResponse } from "@/data/reading.server";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";

import { HistoryControls } from "./HistoryControls";
import type { HistoryFilters } from "./history-catalog";
import { HistoryResults } from "./HistoryResults";
import styles from "./HistoryPage.module.css";

export function HistoryPageView({ filters, apiData }: { filters: HistoryFilters, apiData: HistoryResponse | null }) {
  const items = apiData?.items ?? [];
  const completed = items.filter((item) => item.reading.progressPercent === 100).length;

  return (
    <PageContainer className={styles.page}>
      <PageHero
        description="Recorre una cronología real de tus lecturas recientes. La actividad se guarda automáticamente."
        eyebrow="Actividad de lectura"
        stats={[
          { label: "sesiones", value: apiData?.total ?? 0 },
          { label: "capítulos terminados", value: completed },
        ]}
        title="Historial"
        visual={<History className={styles.heroIcon} strokeWidth={1.1} />}
      />

      <HistoryControls filters={filters} resultCount={apiData?.total ?? 0}>
        <HistoryResults filters={filters} apiData={apiData} />
      </HistoryControls>
    </PageContainer>
  );
}
