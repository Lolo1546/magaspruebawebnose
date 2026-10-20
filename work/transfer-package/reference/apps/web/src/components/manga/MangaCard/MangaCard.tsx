import { Star } from "lucide-react";
import Image from "@/components/manga/MangaCoverImage";
import Link from "next/link";

import { Chip, type ChipVariant } from "@/components/ui/Chip";
import type { MangaCardData } from "@/types/home";

import styles from "./MangaCard.module.css";

type MangaCardProps = {
  item: MangaCardData;
};

type MangaCardGridProps = {
  ariaLabel: string;
  items: readonly MangaCardData[];
};

const statusVariants: Record<NonNullable<MangaCardData["status"]>, ChipVariant> = {
  "En curso": "success",
  Completado: "default",
  Pausado: "warning",
};

export function MangaCard({ item }: MangaCardProps) {
  return (
    <article className={styles.card}>
      <Link
        aria-label={`Ver ficha de ${item.title}`}
        className={styles.cardLink}
        href={`/manga/${item.slug}`}
      >
        <span className={styles.cover}>
          <Image
            alt={`Portada de demostración de ${item.title}`}
            className={styles.coverImage}
            fill
            sizes="(max-width: 760px) 50vw, (max-width: 1180px) 25vw, 17vw"
            src={item.cover}
          />
          <span
            aria-hidden="true"
            className={`${styles.coverTone} ${styles[item.coverTone]}`}
          />
          <span className={styles.coverTopline}>
            <Chip className={styles.typeChip} variant="glass">
              {item.type}
            </Chip>
            {item.score !== undefined ? (
              <span className={styles.score}>
                <Star aria-hidden="true" fill="currentColor" size={12} />
                {item.score.toFixed(1)}
              </span>
            ) : null}
          </span>
        </span>

        <span className={styles.body}>
          <span className={styles.title}>{item.title}</span>

          {item.genre ? <span className={styles.genre}>{item.genre}</span> : null}

          <span className={styles.meta}>
            {item.status ? (
              <Chip
                className={styles.statusChip}
                variant={statusVariants[item.status]}
              >
                <span className={styles.statusDot} aria-hidden="true" />
                {item.status}
              </Chip>
            ) : null}

            {item.addedLabel ? (
              <span className={styles.addedLabel}>{item.addedLabel}</span>
            ) : item.latestChapter !== undefined ? (
              <span className={styles.latestChapter}>
                Cap. {item.latestChapter}
              </span>
            ) : null}
          </span>
        </span>
      </Link>
    </article>
  );
}

export function MangaCardGrid({ ariaLabel, items }: MangaCardGridProps) {
  return (
    <ul aria-label={ariaLabel} className={styles.grid}>
      {items.map((item) => (
        <li key={item.id}>
          <MangaCard item={item} />
        </li>
      ))}
    </ul>
  );
}
