import Link from "next/link";

import {
  rankingCategories,
  rankingCategoryLabels,
  rankingPeriods,
  rankingPeriodLabels,
} from "@/data/ranking";

import { getRankingHref, type RankingFilters } from "./ranking-catalog";
import styles from "./RankingControls.module.css";

export function RankingControls({ filters }: { filters: RankingFilters }) {
  return (
    <div className={styles.controls}>
      <nav aria-label="Categoría del ranking" className={styles.categories}>
        <ul>
          {rankingCategories.map((category) => (
            <li key={category}>
              <Link
                aria-current={filters.category === category ? "page" : undefined}
                href={getRankingHref(filters, { category })}
              >
                {rankingCategoryLabels[category]}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <nav aria-label="Periodo del ranking" className={styles.periods}>
        <ul>
          {rankingPeriods.map((period) => (
            <li key={period}>
              <Link
                aria-current={filters.period === period ? "page" : undefined}
                href={getRankingHref(filters, { period })}
              >
                {rankingPeriodLabels[period]}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
