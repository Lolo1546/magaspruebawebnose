import Link from "next/link";

import { HomeEmptyState } from "@/components/home/HomeEmptyState";
import { MangaCardGrid } from "@/components/manga/MangaCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import type { NewCatalogItem } from "@/types/home";

type NewInMangaZoneProps = {
  items: readonly NewCatalogItem[];
};

export function NewInMangaZone({ items }: NewInMangaZoneProps) {
  return (
    <section aria-label="Nuevos en MangaZone" id="nuevos">
      <SectionHeader
        action={<Link href="/explorar">Ver catálogo →</Link>}
        subtitle="Obras añadidas recientemente · datos demo"
        title="Nuevos en MangaZone"
      />

      {items.length === 0 ? (
        <HomeEmptyState message="Todavía no hay nuevas obras en el catálogo." />
      ) : (
        <MangaCardGrid
          ariaLabel="Obras demo añadidas recientemente al catálogo"
          items={items}
        />
      )}
    </section>
  );
}
