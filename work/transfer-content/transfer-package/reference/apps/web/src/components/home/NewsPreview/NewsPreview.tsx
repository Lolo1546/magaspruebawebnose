import { ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { HomeEmptyState } from "@/components/home/HomeEmptyState";
import { Chip } from "@/components/ui/Chip";
import { SectionHeader } from "@/components/ui/SectionHeader";
import type { NewsItem } from "@/types/home";

import styles from "./NewsPreview.module.css";

type NewsPreviewProps = {
  items: readonly NewsItem[];
};

export function NewsPreview({ items }: NewsPreviewProps) {
  return (
    <section aria-label="Noticias" className={styles.section} id="noticias-home">
      <SectionHeader
        action={<Link href="/noticias">Ver noticias →</Link>}
        subtitle="Contenido ficticio para validar la interfaz"
        title="Noticias"
      />

      {items.length === 0 ? (
        <HomeEmptyState message="No hay noticias disponibles." />
      ) : (
        <div className={styles.grid}>
          {items.map((item) => (
            <article className={styles.card} key={item.id}>
              <Link
                aria-label={`Leer ${item.title}`}
                className={styles.link}
                href="/noticias"
              >
                <span className={styles.imageFrame}>
                  <Image
                    alt={`Imagen demo para ${item.title}`}
                    className={styles.image}
                    fill
                    loading="lazy"
                    sizes="(max-width: 760px) 100vw, (max-width: 1180px) 50vw, 34vw"
                    src={item.image}
                  />
                  <span
                    aria-hidden="true"
                    className={`${styles.imageTone} ${styles[item.imageTone]}`}
                  />
                  <Chip className={styles.category} variant="danger">
                    {item.category}
                  </Chip>
                  <span className={styles.demoMark}>DEMO</span>
                </span>
                <span className={styles.body}>
                  <span className={styles.title}>{item.title}</span>
                  <span className={styles.footer}>
                    <span>{item.publishedAtLabel}</span>
                    <span className={styles.readMore}>
                      Leer <ArrowRight aria-hidden="true" size={13} />
                    </span>
                  </span>
                </span>
              </Link>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
