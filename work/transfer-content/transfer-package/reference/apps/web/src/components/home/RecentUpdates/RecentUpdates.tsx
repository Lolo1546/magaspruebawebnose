"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { SectionHeader } from "@/components/ui/SectionHeader";
import type { RecentUpdate, WorkType } from "@/types/home";
import { mangaTypeLabels } from "@/types/manga-metadata";

import styles from "./RecentUpdates.module.css";
import { UpdateCard } from "./UpdateCard";

type UpdateFilter = "Todos" | WorkType;

const filters: readonly UpdateFilter[] = ["Todos", ...Object.values(mangaTypeLabels)];

type RecentUpdatesProps = {
  updates: readonly RecentUpdate[];
};

export function RecentUpdates({ updates }: RecentUpdatesProps) {
  const [activeFilter, setActiveFilter] = useState<UpdateFilter>("Todos");

  const visibleUpdates = useMemo(
    () =>
      activeFilter === "Todos"
        ? updates
        : updates.filter((update) => update.type === activeFilter),
    [activeFilter, updates],
  );

  return (
    <section aria-label="Actualizaciones recientes" className={styles.section}>
      <SectionHeader
        action={<Link href="/explorar">Ver todo →</Link>}
        subtitle="Últimos capítulos publicados · datos demo"
        title="Actualizaciones recientes"
      />

      <div
        aria-label="Filtrar actualizaciones por tipo"
        className={styles.filters}
        role="group"
      >
        {filters.map((filter) => (
          <button
            aria-controls="recent-updates-grid"
            aria-pressed={activeFilter === filter}
            className={styles.filterButton}
            key={filter}
            onClick={() => setActiveFilter(filter)}
            type="button"
          >
            {filter}
          </button>
        ))}
      </div>

      <div
        aria-live="polite"
        className={styles.grid}
        id="recent-updates-grid"
      >
        {visibleUpdates.map((update) => (
          <UpdateCard key={update.id} update={update} />
        ))}
      </div>
    </section>
  );
}
