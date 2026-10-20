import Link from "next/link";

import {
  createMangaDetailHref,
  mangaDetailTabs,
  type MangaDetailTab,
} from "./manga-detail-query";
import styles from "./MangaDetailTabs.module.css";

type MangaDetailTabsProps = {
  readonly activeTab: MangaDetailTab;
  readonly slug: string;
};

export function MangaDetailTabs({ activeTab, slug }: MangaDetailTabsProps) {
  return (
    <nav aria-label="Secciones de la ficha" className={styles.tabs}>
      {mangaDetailTabs.map((tab) => (
        <Link
          aria-current={activeTab === tab.value ? "page" : undefined}
          href={createMangaDetailHref(slug, tab.value)}
          key={tab.value}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
