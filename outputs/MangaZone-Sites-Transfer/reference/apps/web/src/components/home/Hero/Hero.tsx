"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";

import type { HeroSlide } from "@/types/home";

import { HeroControls } from "./HeroControls";
import { HeroSlideContent } from "./HeroSlideContent";
import styles from "./Hero.module.css";

const AUTOPLAY_DELAY_MS = 6000;

type HeroProps = {
  slides: readonly HeroSlide[];
};

export function Hero({ slides }: HeroProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [cycleKey, setCycleKey] = useState(0);
  const slideCount = slides.length;
  const activeSlide = slides[activeIndex];

  const selectSlide = useCallback(
    (index: number) => {
      if (slideCount === 0) return;

      setActiveIndex((index + slideCount) % slideCount);
      setCycleKey((key) => key + 1);
    },
    [slideCount],
  );

  const showPrevious = useCallback(() => {
    selectSlide(activeIndex - 1);
  }, [activeIndex, selectSlide]);

  const showNext = useCallback(() => {
    selectSlide(activeIndex + 1);
  }, [activeIndex, selectSlide]);

  useEffect(() => {
    if (slideCount <= 1) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const scheduleNextSlide = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      if (!document.hidden && !reducedMotion.matches) {
        timeoutId = setTimeout(() => {
          setActiveIndex((current) => (current + 1) % slideCount);
        }, AUTOPLAY_DELAY_MS);
      }
    };

    scheduleNextSlide();
    document.addEventListener("visibilitychange", scheduleNextSlide);
    reducedMotion.addEventListener("change", scheduleNextSlide);

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      document.removeEventListener("visibilitychange", scheduleNextSlide);
      reducedMotion.removeEventListener("change", scheduleNextSlide);
    };
  }, [activeIndex, cycleKey, slideCount]);

  if (!activeSlide) {
    return null;
  }

  return (
    <section
      aria-label="Contenido destacado de MangaZone"
      className={`${styles.hero} ${styles[activeSlide.visualTone]}`}
    >
      <div className={styles.background} key={activeSlide.id}>
        <Image
          alt=""
          className={styles.backgroundImage}
          fill
          fetchPriority={activeIndex === 0 ? "high" : "auto"}
          loading="eager"
          sizes="(max-width: 979px) 100vw, calc(100vw - 68px)"
          src={activeSlide.image}
        />
      </div>
      <div className={styles.overlay} aria-hidden="true" />

      <HeroSlideContent slide={activeSlide} />
      <HeroControls
        activeIndex={activeIndex}
        cycleKey={cycleKey}
        onNext={showNext}
        onPrevious={showPrevious}
        onSelect={selectSlide}
        slides={slides}
      />
    </section>
  );
}
