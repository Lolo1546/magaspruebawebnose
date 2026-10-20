import { BookMarked, Clock3, ScrollText } from "lucide-react";

import { PageContainer } from "@/components/layout/PageContainer";
import { MangaDetailHero } from "@/components/manga/MangaDetailHero";
import type { MangaDetail } from "@/data/manga-detail";
import type { ApiChapterIndexResponse } from "./api.server";

import type { MangaDetailQuery } from "./manga-detail-query";
import { MangaDetailPanel } from "./MangaDetailPanels";
import { MangaDetailTabs } from "./MangaDetailTabs";
import { MangaCommentsSection } from "./MangaCommentsSection";
import styles from "./MangaDetailPage.module.css";

type MangaDetailPageViewProps = {
  readonly listsCsrfToken?: string | null;
  readonly readingUserId?: string | null;
  readonly manga: MangaDetail;
  readonly query: MangaDetailQuery;
  readonly chapterIndex: ApiChapterIndexResponse;
};

export function MangaDetailPageView({
  listsCsrfToken = null,
  readingUserId = null,
  manga,
  query,
  chapterIndex,
}: MangaDetailPageViewProps) {
  return (
    <>
      <MangaDetailHero listsCsrfToken={listsCsrfToken} manga={manga} />
      <PageContainer className={styles.page}>
        <MangaDetailTabs activeTab={query.tab} slug={manga.slug} />

        <div className={styles.contentLayout}>
          <MangaDetailPanel manga={manga} query={query} chapterIndex={chapterIndex} readingUserId={readingUserId} />

          <aside aria-label="Información complementaria" className={styles.sidebar}>
            <section className={styles.sideCard}>
              <h2>Alias</h2>
              <div className={styles.aliases}>
                {manga.aliases.map((alias) => (
                  <span key={alias}>{alias}</span>
                ))}
              </div>
            </section>

            <section className={styles.sideCard}>
              <h2>Ficha rápida</h2>
              <dl className={styles.quickFacts}>
                <div>
                  <dt>
                    <BookMarked aria-hidden="true" size={15} /> Tipo
                  </dt>
                  <dd>{manga.type}</dd>
                </div>
                <div>
                  <dt>
                    <ScrollText aria-hidden="true" size={15} /> Clasificación
                  </dt>
                  <dd>{manga.classification}</dd>
                </div>
                <div>
                  <dt>
                    <Clock3 aria-hidden="true" size={15} /> Estado
                  </dt>
                  <dd>{manga.status}</dd>
                </div>
              </dl>
            </section>

          </aside>
        </div>
        <MangaCommentsSection slug={manga.slug} viewerId={readingUserId} csrfToken={listsCsrfToken} />
      </PageContainer>
    </>
  );
}
