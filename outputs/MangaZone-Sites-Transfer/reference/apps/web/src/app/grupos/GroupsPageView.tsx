import { BadgeCheck } from "lucide-react";

import { PageContainer } from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";
import pageStyles from "@/components/social/SocialDirectoryPage.module.css";
import type { ScanlationGroupsPage } from "@/data/scanlation-groups";
import { formatCompactCount } from "@/utils/format-compact-count";

import { GroupsControls } from "./GroupsControls";
import type { GroupsFilters } from "./groups-catalog";
import { GroupsResults } from "./GroupsResults";

export function GroupsPageView({
  filters,
  result,
}: {
  filters: GroupsFilters;
  result: ScanlationGroupsPage;
}) {
  return (
    <PageContainer className={pageStyles.page}>
      <PageHero
        description="Descubre equipos de scanlation verificados, sus publicaciones y los idiomas en los que trabajan."
        eyebrow="Directorio de scanlation"
        stats={[
          {
            label: "grupos verificados",
            value: formatCompactCount(result.total),
          },
          {
            label: "página actual",
            value: `${result.page} / ${result.pageCount}`,
          },
          { label: "resultados por página", value: result.pageSize },
        ]}
        title="Grupos públicos"
        visual={
          <BadgeCheck className={pageStyles.heroIcon} strokeWidth={1.1} />
        }
      />

      <GroupsControls filters={filters} resultCount={result.total}>
        <GroupsResults filters={filters} result={result} />
      </GroupsControls>
    </PageContainer>
  );
}
