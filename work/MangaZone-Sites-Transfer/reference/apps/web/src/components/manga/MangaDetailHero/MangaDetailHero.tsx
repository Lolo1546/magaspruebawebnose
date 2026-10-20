import { BookOpen, Heart, Library, UsersRound } from "lucide-react";
import Image from "@/components/manga/MangaCoverImage";
import Link from "next/link";

import { PageContainer } from "@/components/layout/PageContainer";
import { Rating } from "@/components/manga/Rating";
import { Chip, type ChipVariant } from "@/components/ui/Chip";
import type { MangaDetail } from "@/data/manga-detail";

import { MangaListAction } from "./MangaListAction";
import styles from "./MangaDetailHero.module.css";

type MangaDetailHeroProps = {
  readonly listsCsrfToken?: string | null;
  readonly manga: MangaDetail;
};

const statusVariants: Record<MangaDetail["status"], ChipVariant> = {
  "En curso": "success",
  Completado: "default",
  Pausado: "warning",
};

export function MangaDetailHero({
  listsCsrfToken = null,
  manga,
}: MangaDetailHeroProps) {
  const firstChapterHref = manga.firstChapterHref ?? null;

  return (
    <section className={styles.hero}>
      <div aria-hidden="true" className={styles.backdrop}>
        <Image alt="" fill sizes="100vw" src={manga.cover} />
      </div>
      <div aria-hidden="true" className={styles.backdropOverlay} />

      <PageContainer className={styles.heroContainer}>
        <div className={styles.coverColumn}>
          <div className={styles.cover}>
            <Image
              alt={`Portada de ${manga.title}`}
              fill
              priority
              sizes="(max-width: 540px) 116px, (max-width: 760px) 140px, (max-width: 1180px) 220px, 250px"
              src={manga.cover}
            />
          </div>
          {firstChapterHref && (
            <Link className={styles.primaryCoverAction} href={firstChapterHref}>
              <BookOpen aria-hidden="true" size={18} />
              Leer desde el inicio
            </Link>
          )}
        </div>

        <div className={styles.copy}>
          <p className={styles.eyebrow}>
            {manga.type} <span aria-hidden="true">·</span> {manga.status}
          </p>
          <h1>{manga.title}</h1>
          <p className={styles.originalTitle}>{manga.originalTitle}</p>

          <div aria-label="Géneros y estado" className={styles.chips}>
            {manga.genres.map((genre, index) => (
              <Chip key={genre} variant={index === 0 ? "danger" : "glass"}>
                {genre}
              </Chip>
            ))}
            <Chip variant={statusVariants[manga.status]}>{manga.status}</Chip>
          </div>

          <p className={styles.description}>{manga.summary}</p>

          <div className={styles.actions}>
            {firstChapterHref && (
              <Link className={styles.primaryAction} href={firstChapterHref}>
                <BookOpen aria-hidden="true" size={18} />
                Leer
              </Link>
            )}
            <button disabled type="button">
              <Library aria-hidden="true" size={18} />
              Biblioteca · próximamente
            </button>
            <button
              aria-label="Favoritos disponibles próximamente"
              disabled
              type="button"
            >
              <Heart aria-hidden="true" size={18} />
            </button>
            <MangaListAction
              csrfToken={listsCsrfToken}
              manga={{ cover: manga.cover, id: manga.id, title: manga.title }}
            />
          </div>
          <p className={styles.previewNote}>
            Biblioteca y favoritos permanecen como vista previa; las listas ya
            guardan cambios reales.
          </p>
        </div>

        <aside aria-label="Estadísticas del manga" className={styles.stats}>
          <Rating score={manga.score} votesLabel={manga.votesLabel} />
          <dl className={styles.statGrid}>
            <div>
              <dt>Capítulos</dt>
              <dd>{manga.latestChapter ?? manga.chapters.length}</dd>
            </div>
            <div>
              <dt>Lectores</dt>
              <dd>{manga.readersLabel}</dd>
            </div>
            {manga.rankLabel && (
              <div>
                <dt>Ranking</dt>
                <dd>{manga.rankLabel}</dd>
              </div>
            )}
            {manga.year > 0 && (
              <div>
                <dt>Publicación</dt>
                <dd>{manga.year}</dd>
              </div>
            )}
          </dl>
          <dl className={styles.facts}>
            <div>
              <dt>Autor</dt>
              <dd>{manga.author}</dd>
            </div>
            <div>
              <dt>Artista</dt>
              <dd>{manga.artist}</dd>
            </div>
          </dl>
          <span className={styles.readerSummary}>
            <UsersRound aria-hidden="true" size={16} />
            {manga.readersLabel}
          </span>
        </aside>
      </PageContainer>
    </section>
  );
}
