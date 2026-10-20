"use client";

import { ArrowDown, ArrowUp, Eye, Minus, Star } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { KeyboardEvent } from "react";
import { useId, useRef, useState } from "react";

import { HomeEmptyState } from "@/components/home/HomeEmptyState";
import { SectionHeader } from "@/components/ui/SectionHeader";
import type { RankingItem, RankingPeriod } from "@/types/home";

import styles from "./WeeklyRanking.module.css";

const periods: readonly RankingPeriod[] = ["week", "month", "all"];

type WeeklyRankingProps = {
  labels: Record<RankingPeriod, string>;
  rankings: Record<RankingPeriod, readonly RankingItem[]>;
};

function TrendIndicator({ change }: { change: number }) {
  if (change > 0) {
    return (
      <span aria-label={`Sube ${change} posiciones`} className={`${styles.trend} ${styles.trendUp}`}>
        <ArrowUp aria-hidden="true" size={12} />{change}
      </span>
    );
  }

  if (change < 0) {
    return (
      <span aria-label={`Baja ${Math.abs(change)} posiciones`} className={`${styles.trend} ${styles.trendDown}`}>
        <ArrowDown aria-hidden="true" size={12} />{Math.abs(change)}
      </span>
    );
  }

  return (
    <span aria-label="Sin cambios" className={`${styles.trend} ${styles.trendSame}`}>
      <Minus aria-hidden="true" size={12} />
    </span>
  );
}

export function WeeklyRanking({ labels, rankings }: WeeklyRankingProps) {
  const [activePeriod, setActivePeriod] = useState<RankingPeriod>("week");
  const tabListId = useId();
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const items = rankings[activePeriod];

  function handleTabKeyDown(
    event: KeyboardEvent<HTMLButtonElement>,
    currentIndex: number,
  ) {
    let nextIndex = currentIndex;

    if (event.key === "ArrowRight") nextIndex = (currentIndex + 1) % periods.length;
    else if (event.key === "ArrowLeft") nextIndex = (currentIndex - 1 + periods.length) % periods.length;
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = periods.length - 1;
    else return;

    event.preventDefault();
    const nextPeriod = periods[nextIndex];
    setActivePeriod(nextPeriod);
    tabRefs.current[nextIndex]?.focus();
  }

  return (
    <section aria-label="Top semanal" className={styles.section} id="top-semanal">
      <SectionHeader
        action={<Link href="/ranking">Ver ranking →</Link>}
        subtitle="Datos demo deterministas"
        title="Top semanal"
      />

      <div aria-label="Período del ranking" className={styles.tabs} role="tablist">
        {periods.map((period, index) => (
          <button
            aria-controls={`${tabListId}-panel`}
            aria-selected={activePeriod === period}
            className={styles.tab}
            id={`${tabListId}-${period}`}
            key={period}
            onClick={() => setActivePeriod(period)}
            onKeyDown={(event) => handleTabKeyDown(event, index)}
            ref={(element) => {
              tabRefs.current[index] = element;
            }}
            role="tab"
            tabIndex={activePeriod === period ? 0 : -1}
            type="button"
          >
            {labels[period]}
          </button>
        ))}
      </div>

      <div
        aria-labelledby={`${tabListId}-${activePeriod}`}
        id={`${tabListId}-panel`}
        role="tabpanel"
      >
        {items.length === 0 ? (
          <HomeEmptyState message="No hay datos de ranking disponibles." />
        ) : (
          <ol className={styles.list}>
            {items.map((item, index) => {
              const rank = index + 1;

              return (
                <li className={styles.row} key={item.id}>
                  <Link className={styles.link} href={`/manga/${item.slug}`}>
                    <span className={`${styles.rank} ${styles[`rank${rank}`] ?? ""}`}>
                      {rank}
                    </span>
                    <span className={styles.cover}>
                      <Image
                        alt={`Portada demo de ${item.title}`}
                        height={60}
                        loading="lazy"
                        src={item.cover}
                        width={42}
                      />
                      <span
                        aria-hidden="true"
                        className={`${styles.coverTone} ${styles[item.coverTone]}`}
                      />
                    </span>
                    <span className={styles.info}>
                      <span className={styles.title}>{item.title}</span>
                      <span className={styles.meta}>
                        <span>{item.type}</span>
                        <span>Cap. {item.chapter}</span>
                        <span className={styles.readers}>
                          <Eye aria-hidden="true" size={11} />
                          {item.readersLabel}
                        </span>
                      </span>
                    </span>
                    <span className={styles.metrics}>
                      <span className={styles.score}>
                        <Star aria-hidden="true" fill="currentColor" size={12} />
                        {item.score.toFixed(1)}
                      </span>
                      <TrendIndicator change={item.trendChange} />
                    </span>
                  </Link>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </section>
  );
}
