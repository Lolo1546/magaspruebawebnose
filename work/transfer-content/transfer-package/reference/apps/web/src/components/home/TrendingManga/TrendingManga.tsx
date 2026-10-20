import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { HomeEmptyState } from "@/components/home/HomeEmptyState";
import { SectionHeader } from "@/components/ui/SectionHeader";
import type { TrendingItem } from "@/types/home";

import styles from "./TrendingManga.module.css";

type TrendingMangaProps = {
  items: readonly TrendingItem[];
};

function getTrendDetails(change: number) {
  if (change > 0) {
    return {
      className: styles.positive,
      Icon: ArrowUp,
      label: `Sube ${change} posiciones`,
      text: `${change} posiciones`,
    };
  }

  if (change < 0) {
    return {
      className: styles.negative,
      Icon: ArrowDown,
      label: `Baja ${Math.abs(change)} posiciones`,
      text: `${Math.abs(change)} posiciones`,
    };
  }

  return {
    className: styles.neutral,
    Icon: Minus,
    label: "Sin cambios de posición",
    text: "Sin cambios",
  };
}

export function TrendingManga({ items }: TrendingMangaProps) {
  return (
    <section
      aria-label="Tendencias del día"
      className={styles.section}
      id="tendencias"
    >
      <SectionHeader
        action={<Link href="/ranking">Ver ranking →</Link>}
        subtitle="Movimiento diario · datos demo"
        title="Tendencias del día"
      />

      {items.length === 0 ? (
        <HomeEmptyState message="Todavía no hay tendencias disponibles." />
      ) : (
        <ol className={styles.scroller} aria-label="Ranking demo de tendencias">
          {items.map((item) => {
            const trend = getTrendDetails(item.trendChange);

            return (
              <li className={styles.item} key={item.id}>
                <article className={styles.card}>
                  <Link
                    aria-label={`Número ${item.rank}: ${item.title}. ${trend.label}`}
                    className={styles.cardLink}
                    href={`/manga/${item.slug}`}
                  >
                    <span className={styles.cover}>
                      <Image
                        alt={`Portada de demostración de ${item.title}`}
                        className={styles.coverImage}
                        fill
                        sizes="(max-width: 540px) 148px, 164px"
                        src={item.cover}
                      />
                      <span
                        aria-hidden="true"
                        className={`${styles.coverTone} ${styles[item.coverTone]}`}
                      />
                      <span className={styles.rank} aria-hidden="true">
                        #{item.rank}
                      </span>
                    </span>
                    <span className={styles.body}>
                      <span className={styles.title}>{item.title}</span>
                      <span
                        aria-label={trend.label}
                        className={`${styles.change} ${trend.className}`}
                      >
                        <trend.Icon aria-hidden="true" size={13} strokeWidth={2.4} />
                        {trend.text}
                      </span>
                    </span>
                  </Link>
                </article>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
