import { Star } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { Chip, type ChipVariant } from "@/components/ui/Chip";
import type { RecentUpdate } from "@/types/home";

import styles from "./RecentUpdates.module.css";

type UpdateCardProps = {
  update: RecentUpdate;
};

const statusVariants: Record<RecentUpdate["status"], ChipVariant> = {
  "En curso": "success",
  Completado: "default",
  Pausado: "warning",
};

export function UpdateCard({ update }: UpdateCardProps) {
  return (
    <article className={styles.card}>
      <Link
        aria-label={`Ver ficha de ${update.title}`}
        className={styles.coverLink}
        href={`/manga/${update.slug}`}
      >
        <Image
          alt={`Portada de demostración de ${update.title}`}
          className={styles.coverImage}
          fill
          sizes="(max-width: 760px) 50vw, (max-width: 1180px) 25vw, 17vw"
          src={update.cover}
        />
        <span
          aria-hidden="true"
          className={`${styles.coverTone} ${styles[update.coverTone]}`}
        />
        <span className={styles.coverMeta}>
          <Chip className={styles.typeChip} variant="glass">
            {update.type}
          </Chip>
          <span className={styles.score}>
            <Star aria-hidden="true" fill="currentColor" size={12} />
            {update.score.toFixed(1)}
          </span>
        </span>
      </Link>

      <div className={styles.cardBody}>
        <h3 className={styles.cardTitle}>
          <Link href={`/manga/${update.slug}`}>{update.title}</Link>
        </h3>

        <div className={styles.metadata}>
          <Chip className={styles.statusChip} variant={statusVariants[update.status]}>
            <span className={styles.statusDot} aria-hidden="true" />
            {update.status}
          </Chip>
          <span className={styles.genre}>{update.genre}</span>
        </div>

        <ol className={styles.chapterList} aria-label={`Últimos capítulos de ${update.title}`}>
          {update.chapters.map((chapter) => (
            <li key={chapter.number}>
              <Link
                className={styles.chapterLink}
                href={`/manga/${update.slug}/capitulo/${chapter.number}`}
              >
                <span className={styles.chapterTitle}>
                  Capítulo {chapter.number}
                  {chapter.label ? ` · ${chapter.label}` : ""}
                </span>
                {chapter.isNew ? (
                  <span className={styles.newBadge}>NUEVO</span>
                ) : null}
                <time className={styles.chapterTime}>{chapter.publishedAtLabel}</time>
              </Link>
            </li>
          ))}
        </ol>
      </div>
    </article>
  );
}
