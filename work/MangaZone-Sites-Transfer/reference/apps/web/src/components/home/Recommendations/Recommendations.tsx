import Link from "next/link";

import { HomeEmptyState } from "@/components/home/HomeEmptyState";
import { MangaCardGrid } from "@/components/manga/MangaCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import type { RecommendationItem } from "@/types/home";

type RecommendationsProps = {
  items: readonly RecommendationItem[];
};

export function Recommendations({ items }: RecommendationsProps) {
  return (
    <section aria-label="Recomendado para ti" id="recomendado">
      <SectionHeader
        action={<Link href="/explorar">Explorar →</Link>}
        subtitle="Selección demo durante desarrollo"
        title="Recomendado para ti"
      />

      {items.length === 0 ? (
        <HomeEmptyState message="Todavía no hay recomendaciones para mostrar." />
      ) : (
        <MangaCardGrid
          ariaLabel="Selección demo de obras recomendadas"
          items={items}
        />
      )}
    </section>
  );
}
