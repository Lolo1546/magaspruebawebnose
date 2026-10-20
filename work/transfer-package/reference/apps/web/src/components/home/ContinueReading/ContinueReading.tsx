import { Play } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { HomeEmptyState } from "@/components/home/HomeEmptyState";
import { SectionHeader } from "@/components/ui/SectionHeader";
import type { ContinueReadingItem } from "@/types/home";

import styles from "./ContinueReading.module.css";

type ContinueReadingProps = {
  items: readonly ContinueReadingItem[];
};

export function ContinueReading({ items }: ContinueReadingProps) {
  return (
    <section
      aria-label="Continuar leyendo"
      className={styles.section}
      id="continuar-leyendo"
    >
      <SectionHeader
        action={<Link href="/biblioteca">Ver historial →</Link>}
        subtitle="Progreso local de demostración"
        title="Continuar leyendo"
      />

      {items.length === 0 ? (
        <HomeEmptyState message="Cuando exista historial de lectura, podrás retomarlo desde aquí." />
      ) : (
        <ul className={styles.scroller} aria-label="Lecturas demo en progreso">
          {items.map((item) => (
            <li className={styles.item} key={item.id}>
              <article className={styles.card}>
                <Link
                  aria-label={`Continuar ${item.title}, capítulo ${item.chapter}, página ${item.page}`}
                  className={styles.cardLink}
                  href={`/manga/${item.slug}/capitulo/${item.chapter}`}
                >
                  <span className={styles.cover}>
                    <Image
                      alt={`Portada de demostración de ${item.title}`}
                      className={styles.coverImage}
                      fill
                      sizes="68px"
                      src={item.cover}
                    />
                    <span
                      aria-hidden="true"
                      className={`${styles.coverTone} ${styles[item.coverTone]}`}
                    />
                  </span>

                  <span className={styles.content}>
                    <span className={styles.title}>{item.title}</span>
                    <span className={styles.position}>
                      Cap. {item.chapter} · Pág. {item.page}
                    </span>

                    <span className={styles.progressMeta}>
                      <span>Progreso</span>
                      <span>{item.progressPercent}%</span>
                    </span>
                    <span
                      aria-label={`${item.progressPercent}% completado`}
                      aria-valuemax={100}
                      aria-valuemin={0}
                      aria-valuenow={item.progressPercent}
                      className={styles.progressTrack}
                      role="progressbar"
                    >
                      <span
                        className={styles.progressFill}
                        style={{ width: `${item.progressPercent}%` }}
                      />
                    </span>

                    <span className={styles.footer}>
                      <span className={styles.lastRead}>{item.lastReadLabel}</span>
                      <span className={styles.continueAction}>
                        <Play aria-hidden="true" fill="currentColor" size={11} />
                        Continuar
                      </span>
                    </span>
                  </span>
                </Link>
              </article>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
