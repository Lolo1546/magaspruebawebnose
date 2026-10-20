import { UsersRound } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";
import pageStyles from "@/components/social/SocialDirectoryPage.module.css";
import type { PublicCommunitiesPage } from "@/data/communities.public";
import type { CommunitiesFilters } from "./communities-catalog";
import { CommunitiesControls } from "./CommunitiesControls";
import { CommunitiesResults } from "./CommunitiesResults";

export function CommunitiesPageView({ filters, result }: { filters: CommunitiesFilters; result: PublicCommunitiesPage }) {
  return (
    <PageContainer className={pageStyles.page}>
      <PageHero
        description="Explora espacios públicos de lectores, sus publicaciones y las obras de manga relacionadas."
        eyebrow="Espacios para compartir"
        stats={[{ label: "comunidades", value: result.total }, { label: "página", value: result.page }, { label: "por página", value: result.pageSize }]}
        title="Comunidades públicas"
        visual={<UsersRound className={pageStyles.heroIcon} strokeWidth={1.1} />}
      />
      <CommunitiesControls filters={filters} resultCount={result.items.length}>
        <CommunitiesResults filters={filters} result={result} />
      </CommunitiesControls>
    </PageContainer>
  );
}
