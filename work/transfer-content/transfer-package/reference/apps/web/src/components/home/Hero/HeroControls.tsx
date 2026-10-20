import { ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";

import type { HeroSlide } from "@/types/home";

import styles from "./Hero.module.css";

type HeroControlsProps = {
  activeIndex: number;
  cycleKey: number;
  onNext: () => void;
  onPrevious: () => void;
  onSelect: (index: number) => void;
  slides: readonly HeroSlide[];
};

export function HeroControls({
  activeIndex,
  cycleKey,
  onNext,
  onPrevious,
  onSelect,
  slides,
}: HeroControlsProps) {
  return (
    <div className={styles.controls}>
      <div
        aria-label="Seleccionar contenido destacado"
        className={styles.thumbnails}
        role="group"
      >
        {slides.map((slide, index) => (
          <button
            aria-label={`Mostrar ${slide.title}`}
            aria-pressed={index === activeIndex}
            className={styles.thumbnail}
            key={slide.id}
            onClick={() => onSelect(index)}
            type="button"
          >
            <Image
              alt=""
              className={styles.thumbnailImage}
              fill
              sizes="52px"
              src={slide.image}
            />
            <span className={`${styles.thumbnailTone} ${styles[slide.visualTone]}`} />
          </button>
        ))}
      </div>

      <div className={styles.navigation}>
        <button
          aria-label="Mostrar destacado anterior"
          className={styles.arrowButton}
          onClick={onPrevious}
          type="button"
        >
          <ChevronLeft aria-hidden="true" size={18} />
        </button>

        <div
          aria-label="Progreso del carrusel"
          className={styles.progressList}
          role="group"
        >
          {slides.map((slide, index) => (
            <button
              aria-label={`Ir a ${slide.title}`}
              aria-pressed={index === activeIndex}
              className={styles.progressTrack}
              key={slide.id}
              onClick={() => onSelect(index)}
              type="button"
            >
              {index === activeIndex ? (
                <span
                  className={styles.progressFill}
                  key={`${slide.id}-${cycleKey}`}
                />
              ) : null}
            </button>
          ))}
        </div>

        <button
          aria-label="Mostrar siguiente destacado"
          className={styles.arrowButton}
          onClick={onNext}
          type="button"
        >
          <ChevronRight aria-hidden="true" size={18} />
        </button>
      </div>
    </div>
  );
}
