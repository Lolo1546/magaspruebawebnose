"use client";

import type { KeyboardEvent } from "react";
import { useId, useRef, useState } from "react";
import Link from "next/link";

import type { CalendarDayGroup, CalendarRelease } from "@/types/home";

import { SidebarWidget } from "./SidebarWidget";
import styles from "./ReleaseCalendar.module.css";

const dayLabels: Record<CalendarDayGroup, string> = {
  today: "Hoy",
  tomorrow: "Mañana",
  week: "Semana",
};

const dayGroups = Object.keys(dayLabels) as CalendarDayGroup[];

type ReleaseCalendarProps = {
  releases: readonly CalendarRelease[];
};

export function ReleaseCalendar({ releases }: ReleaseCalendarProps) {
  const [activeDay, setActiveDay] = useState<CalendarDayGroup>("today");
  const tabListId = useId();
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const visibleReleases = releases.filter(
    (release) => release.dayGroup === activeDay,
  );

  function handleTabKeyDown(
    event: KeyboardEvent<HTMLButtonElement>,
    currentIndex: number,
  ) {
    let nextIndex = currentIndex;

    if (event.key === "ArrowRight") nextIndex = (currentIndex + 1) % dayGroups.length;
    else if (event.key === "ArrowLeft") nextIndex = (currentIndex - 1 + dayGroups.length) % dayGroups.length;
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = dayGroups.length - 1;
    else return;

    event.preventDefault();
    const nextDay = dayGroups[nextIndex];
    setActiveDay(nextDay);
    tabRefs.current[nextIndex]?.focus();
  }

  return (
    <SidebarWidget title="Calendario">
      <div aria-label="Período del calendario" className={styles.tabs} role="tablist">
        {dayGroups.map((day, index) => (
          <button
            aria-controls={`${tabListId}-panel`}
            aria-selected={activeDay === day}
            className={styles.tab}
            id={`${tabListId}-${day}`}
            key={day}
            onClick={() => setActiveDay(day)}
            onKeyDown={(event) => handleTabKeyDown(event, index)}
            ref={(element) => {
              tabRefs.current[index] = element;
            }}
            role="tab"
            tabIndex={activeDay === day ? 0 : -1}
            type="button"
          >
            {dayLabels[day]}
          </button>
        ))}
      </div>

      <div
        aria-labelledby={`${tabListId}-${activeDay}`}
        className={styles.panel}
        id={`${tabListId}-panel`}
        role="tabpanel"
      >
        {visibleReleases.length === 0 ? (
          <p className={styles.empty}>No hay publicaciones demo para este período.</p>
        ) : (
          <ul className={styles.list}>
            {visibleReleases.map((release) => (
              <li key={release.id}>
                <Link className={styles.release} href={`/manga/${release.slug}`}>
                  <span className={styles.releaseInfo}>
                    <span className={styles.releaseTitle}>{release.title}</span>
                    <span className={styles.releaseMeta}>
                      {release.type} · Cap. {release.chapter}
                    </span>
                  </span>
                  <span className={styles.time}>{release.timeLabel}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </SidebarWidget>
  );
}
