import { UsersRound } from "lucide-react";
import Link from "next/link";

import { NoResults } from "@/components/feedback/FeedbackState";
import type { MangaDetail } from "@/data/manga-detail";
import type { ApiChapterIndexResponse } from "./api.server";
import type { MangaDetailQuery } from "./manga-detail-query";
import { PublicChapters } from "./PublicChapters";
import styles from "./MangaDetailPanels.module.css";

type MangaDetailPanelProps = {
  readonly manga: MangaDetail;
  readonly query: MangaDetailQuery;
  readonly chapterIndex: ApiChapterIndexResponse;
  readonly readingUserId?: string | null;
};

export function MangaDetailPanel({
  manga,
  query,
  chapterIndex,
  readingUserId = null,
}: MangaDetailPanelProps) {
  switch (query.tab) {
    case "groups":
      return <GroupsPanel manga={manga} />;
    case "reviews":
      return (
        <section className={styles.panel} aria-labelledby="reviews-heading">
          <PanelHeading id="reviews-heading" title="Reseñas" />
          <NoResults
            description="Las reseñas de esta obra todavía no están disponibles."
            title="Sin reseñas"
          />
        </section>
      );
    case "related":
      return (
        <section className={styles.panel} aria-labelledby="related-heading">
          <PanelHeading id="related-heading" title="Relacionados" />
          <NoResults
            description="Todavía no hay obras relacionadas disponibles."
            title="Sin relacionados"
          />
        </section>
      );
    case "info":
      return <InfoPanel manga={manga} />;
    default:
      return (
        <PublicChapters
          key={`${readingUserId}:${manga.slug}:${query.chapterQuery}:${query.group}:${query.chapterSort}`}
          readingUserId={readingUserId}
          manga={manga}
          query={query}
          initialIndex={chapterIndex}
        />
      );
  }
}

function PanelHeading({
  description,
  id,
  title,
}: {
  description?: string;
  id: string;
  title: string;
}) {
  return (
    <header className={styles.panelHeading}>
      <h2 id={id}>{title}</h2>
      {description && <p>{description}</p>}
    </header>
  );
}

function GroupsPanel({ manga }: { manga: MangaDetail }) {
  return (
    <section className={styles.panel} aria-labelledby="groups-heading">
      <PanelHeading
        id="groups-heading"
        title="Grupos vinculados"
        description="Grupos con publicaciones disponibles de este manga."
      />
      {manga.groups.length ? (
        <div className={styles.groupList}>
          {manga.groups.map((group) => (
            <article className={styles.groupCard} key={group.slug}>
              <span aria-hidden="true" className={styles.groupLogo}>
                <UsersRound size={24} />
              </span>
              <div>
                <h3>
                  <Link href={`/grupos/${encodeURIComponent(group.slug)}`}>
                    {group.name}
                  </Link>
                </h3>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <NoResults
          description="Todavía no hay grupos con publicaciones disponibles."
          title="Sin grupos vinculados"
        />
      )}
    </section>
  );
}

function InfoPanel({ manga }: { manga: MangaDetail }) {
  const facts = [
    ["Título original", manga.originalTitle],
    ["Tipo", manga.type],
    ["Estado", manga.status],
    ["Clasificación", manga.classification],
    ["Autor", manga.author],
    ["Artista", manga.artist],
  ] as const;

  return (
    <section className={styles.panel} aria-labelledby="info-heading">
      <PanelHeading id="info-heading" title="Información completa" />
      <dl className={styles.infoList}>
        {facts.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
