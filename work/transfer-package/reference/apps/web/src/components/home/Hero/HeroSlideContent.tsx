import { BookOpen, Info, Plus } from "lucide-react";
import Link from "next/link";

import type { HeroSlide } from "@/types/home";

import styles from "./Hero.module.css";

type HeroSlideContentProps = {
  slide: HeroSlide;
};

export function HeroSlideContent({ slide }: HeroSlideContentProps) {
  return (
    <div className={styles.content}>
      <div className={styles.contextRow}>
        <span className={styles.contextDot} aria-hidden="true" />
        <span>{slide.context}</span>
        <span className={styles.contextDivider} aria-hidden="true" />
        <span>{slide.type}</span>
      </div>

      <h1 className={styles.title}>{slide.title}</h1>

      <ul className={styles.genres} aria-label="Géneros">
        {slide.genres.map((genre) => (
          <li key={genre}>{genre}</li>
        ))}
      </ul>

      <p className={styles.description}>{slide.description}</p>

      <dl className={styles.stats} aria-label={`Datos de ${slide.title}`}>
        <div>
          <dt>Puntuación</dt>
          <dd>{slide.score.toFixed(1)}</dd>
        </div>
        <div>
          <dt>Capítulos</dt>
          <dd>{slide.chapters}</dd>
        </div>
        <div className={styles.readersStat}>
          <dt>Lectores</dt>
          <dd>{slide.readers}</dd>
        </div>
        <div>
          <dt>Estado</dt>
          <dd>{slide.status}</dd>
        </div>
      </dl>

      <div className={styles.actions}>
        <Link className={styles.primaryAction} href={`/manga/${slide.slug}`}>
          <BookOpen aria-hidden="true" size={17} strokeWidth={2} />
          Leer ahora
        </Link>
        <button
          aria-label="Mi lista estará disponible cuando exista una sesión real"
          className={styles.disabledAction}
          disabled
          title="Disponible cuando exista una sesión real"
          type="button"
        >
          <Plus aria-hidden="true" size={17} strokeWidth={2} />
          Mi lista
        </button>
        <Link className={styles.infoAction} href={`/manga/${slide.slug}`}>
          <Info aria-hidden="true" size={17} strokeWidth={2} />
          Más información
        </Link>
      </div>
    </div>
  );
}
